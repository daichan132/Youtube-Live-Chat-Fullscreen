export type ExtensionLaunchMode = {
  headless: boolean
  channel?: 'chromium'
  userAgent?: string
}

type ExtensionLaunchRuntime = {
  browserVersion: string
  platform?: NodeJS.Platform
}

const platformToken = (platform: NodeJS.Platform) => {
  if (platform === 'darwin') return 'Macintosh; Intel Mac OS X 10_15_7'
  if (platform === 'win32') return 'Windows NT 10.0; Win64; x64'
  return 'X11; Linux x86_64'
}

export const buildChromeUserAgent = (browserVersion: string, platform: NodeJS.Platform = process.platform) =>
  `Mozilla/5.0 (${platformToken(platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`

/**
 * Keep E2E browser launches non-disruptive by default.
 *
 * Chrome extensions require Chromium's new headless mode, selected with the
 * `chromium` channel. YouTube rejects the default `HeadlessChrome` user agent
 * in live chat as an outdated browser, so headless contexts advertise the
 * actual bundled Chromium version using the standard Chrome product token.
 * A visible browser is reserved for explicit local debugging via
 * YLC_E2E_HEADED=1.
 */
export const resolveExtensionLaunchMode = (
  env: Readonly<Record<string, string | undefined>>,
  runtime: ExtensionLaunchRuntime,
): ExtensionLaunchMode => {
  if (env.YLC_E2E_HEADED === '1') {
    return { headless: false }
  }

  return {
    headless: true,
    channel: 'chromium',
    userAgent: buildChromeUserAgent(runtime.browserVersion, runtime.platform),
  }
}
