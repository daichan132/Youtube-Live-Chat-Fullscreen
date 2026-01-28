#!/usr/bin/env node
import { readFile } from 'node:fs/promises'

const args = process.argv.slice(2)

const getArgValue = (flag) => {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) return undefined
  return args[index + 1]
}

const hasFlag = (flag) => args.includes(flag)

const mustEnv = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

const zipPath = getArgValue('--zip') ?? process.env.CWS_ZIP
if (!zipPath) {
  console.error('Missing required --zip argument or CWS_ZIP env var')
  process.exit(1)
}

const expectedVersion = getArgValue('--expected-version') ?? process.env.CWS_EXPECTED_VERSION
const cancelPending = hasFlag('--cancel-pending') || process.env.CWS_CANCEL_PENDING === 'true'
const skipReview = hasFlag('--skip-review') || process.env.CWS_SKIP_REVIEW === 'true'
const publishType = process.env.CWS_PUBLISH_TYPE
const deployPercentageRaw = process.env.CWS_DEPLOY_PERCENTAGE

const publisherId = mustEnv('CHROME_PUBLISHER_ID')
const extensionId = mustEnv('CHROME_EXTENSION_ID')
const clientId = mustEnv('CHROME_CLIENT_ID')
const clientSecret = mustEnv('CHROME_CLIENT_SECRET')
const refreshToken = mustEnv('CHROME_REFRESH_TOKEN')

const baseUrl = 'https://chromewebstore.googleapis.com'
const itemName = `publishers/${publisherId}/items/${extensionId}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || text || response.statusText
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${message}`)
  }

  return data
}

const getAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const data = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!data.access_token) {
    throw new Error('No access_token in OAuth response')
  }

  return data.access_token
}

const fetchStatus = async (token) =>
  requestJson(`${baseUrl}/v2/${itemName}:fetchStatus`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

const extractVersions = (revision) =>
  (revision?.distributionChannels ?? [])
    .map((channel) => channel?.crxVersion)
    .filter(Boolean)

const normalizeUploadState = (state) => {
  if (state === 'UPLOAD_IN_PROGRESS') return 'IN_PROGRESS'
  return state
}

const formatRevision = (revision) => {
  if (!revision) return 'none'
  const versions = extractVersions(revision)
  const state = revision.state ?? 'UNKNOWN'
  if (!versions.length) return `${state} (no version)`
  return `${state} [${versions.join(', ')}]`
}

const pollUpload = async (token) => {
  const attempts = Number(process.env.CWS_POLL_ATTEMPTS ?? 12)
  const intervalMs = Number(process.env.CWS_POLL_INTERVAL_MS ?? 5000)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await sleep(intervalMs)
    const status = await fetchStatus(token)
    const uploadState = normalizeUploadState(status.lastAsyncUploadState)
    console.log(`Upload status check ${attempt}/${attempts}: ${uploadState ?? 'UNKNOWN'}`)

    if (uploadState === 'SUCCEEDED') return status
    if (uploadState === 'FAILED') {
      throw new Error('Upload failed (lastAsyncUploadState=FAILED)')
    }
  }

  throw new Error('Upload still in progress after max attempts')
}

const main = async () => {
  const token = await getAccessToken()

  const statusBefore = await fetchStatus(token)
  const submittedState = statusBefore?.submittedItemRevisionStatus?.state
  const submittedVersions = extractVersions(statusBefore?.submittedItemRevisionStatus)
  const publishedVersions = extractVersions(statusBefore?.publishedItemRevisionStatus)

  console.log(`Published revision (before): ${formatRevision(statusBefore?.publishedItemRevisionStatus)}`)
  console.log(`Submitted revision (before): ${formatRevision(statusBefore?.submittedItemRevisionStatus)}`)

  const hasActiveSubmission = submittedState === 'PENDING_REVIEW' || submittedState === 'STAGED'
  const submittedMismatch =
    expectedVersion && submittedVersions.length > 0 && !submittedVersions.includes(expectedVersion)

  if (hasActiveSubmission && (cancelPending || submittedMismatch)) {
    const reason = cancelPending
      ? 'CWS_CANCEL_PENDING/--cancel-pending'
      : `submitted version mismatch (${submittedVersions.join(', ')})`
    console.log(`Cancelling existing submission: ${reason}`)
    await requestJson(`${baseUrl}/v2/${itemName}:cancelSubmission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } else if (hasActiveSubmission) {
    console.log('Active submission exists; continuing without cancel')
  }

  console.log(`Uploading package: ${zipPath}`)
  const zipData = await readFile(zipPath)
  const uploadData = await requestJson(`${baseUrl}/upload/v2/${itemName}:upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: zipData,
  })

  const uploadState = normalizeUploadState(uploadData.uploadState)
  console.log(
    `Upload response: ${uploadState ?? 'UNKNOWN'}${uploadData.crxVersion ? ` (version ${uploadData.crxVersion})` : ''}`,
  )

  if (expectedVersion && uploadData.crxVersion && uploadData.crxVersion !== expectedVersion) {
    throw new Error(`Uploaded version ${uploadData.crxVersion} does not match expected ${expectedVersion}`)
  }

  if (uploadState === 'IN_PROGRESS') {
    await pollUpload(token)
  } else if (uploadState && uploadState !== 'SUCCEEDED') {
    throw new Error(`Upload failed with state: ${uploadState}`)
  }

  const publishBody = {}
  if (skipReview) publishBody.skipReview = true
  if (publishType) publishBody.publishType = publishType
  if (deployPercentageRaw) {
    const deployPercentage = Number(deployPercentageRaw)
    if (Number.isNaN(deployPercentage)) {
      throw new Error(`Invalid CWS_DEPLOY_PERCENTAGE: ${deployPercentageRaw}`)
    }
    publishBody.deployInfos = [{ deployPercentage }]
  }

  console.log('Publishing submission')
  await requestJson(`${baseUrl}/v2/${itemName}:publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(Object.keys(publishBody).length ? { 'Content-Type': 'application/json' } : {}),
    },
    body: Object.keys(publishBody).length ? JSON.stringify(publishBody) : undefined,
  })

  const statusAfter = await fetchStatus(token)
  const submittedAfterVersions = extractVersions(statusAfter?.submittedItemRevisionStatus)
  const submittedAfterState = statusAfter?.submittedItemRevisionStatus?.state

  console.log(`Submitted revision (after): ${formatRevision(statusAfter?.submittedItemRevisionStatus)}`)

  if (
    expectedVersion &&
    submittedAfterState &&
    submittedAfterVersions.length > 0 &&
    !submittedAfterVersions.includes(expectedVersion)
  ) {
    throw new Error(
      `Submitted version ${submittedAfterVersions.join(', ')} does not match expected ${expectedVersion}`,
    )
  }

  if (publishedVersions.length) {
    console.log(`Published revision (before): ${publishedVersions.join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
