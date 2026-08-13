import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTENT_SCRIPT_MATCHES } from '../../config/packagePolicy'
import wxtConfig from '../../wxt.config'

const root = resolve(import.meta.dirname, '../..')

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(root, path), 'utf8')) as T
const readText = (path: string) => readFile(resolve(root, path), 'utf8')

const localeNames = async (directory: string, layout: 'files' | 'directories') =>
  (await readdir(resolve(root, directory), { withFileTypes: true }))
    .filter(entry => (layout === 'directories' ? entry.isDirectory() : entry.isFile() && entry.name.endsWith('.json')))
    .filter(entry => entry.name !== '_keys.json')
    .map(entry => (layout === 'directories' ? entry.name : entry.name.slice(0, -'.json'.length)))
    .sort()

describe('production package source policy', () => {
  it('keeps the manifest permissions and localized identity minimal', () => {
    const manifest = wxtConfig.manifest
    expect(manifest).not.toBeTypeOf('function')
    expect(manifest).toMatchObject({
      name: '__MSG_extensionName__',
      description: '__MSG_extensionDescription__',
      default_locale: 'en',
      permissions: ['activeTab', 'storage'],
    })
    expect(manifest).not.toHaveProperty('host_permissions')
    expect(manifest).not.toHaveProperty('optional_permissions')
  })

  it('exposes runtime locale files and the settings page only to YouTube pages', () => {
    expect(wxtConfig.manifest).toMatchObject({
      web_accessible_resources: [
        {
          resources: ['locales/*.json', 'settings.html'],
          matches: ['https://www.youtube.com/*'],
        },
      ],
    })
  })

  it('injects the content script only into YouTube watch surfaces', () => {
    expect(CONTENT_SCRIPT_MATCHES).toEqual(['*://www.youtube.com/*'])
  })

  it('ships matching runtime and manifest locale inventories', async () => {
    const [runtimeLocales, publicRuntimeLocales, manifestLocales] = await Promise.all([
      localeNames('shared/i18n/assets', 'files'),
      localeNames('public/locales', 'files'),
      localeNames('public/_locales', 'directories'),
    ])

    expect(runtimeLocales).toHaveLength(55)
    expect(publicRuntimeLocales).toEqual(runtimeLocales)
    expect(manifestLocales).toEqual(runtimeLocales)
  })

  it('defines Chrome and Firefox size budgets for the current package version', async () => {
    const packageJson = await readJson<{ version: string; scripts: Record<string, string> }>('package.json')
    const budgets = await readJson<Record<string, { browser: string; budgets: Record<string, number> }>>('config/package-size-budget.json')

    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(packageJson.scripts.build).toBe('wxt build')
    expect(packageJson.scripts['build:firefox']).toBe('wxt build -b firefox')
    expect(packageJson.scripts['build:e2e']).toBe('wxt build --mode testing')
    expect(packageJson.scripts['test:package']).toBe(
      'yarn build && yarn build:firefox && yarn zip && yarn zip:firefox && yarn verify:package-contracts',
    )
    expect(Object.keys(budgets).sort()).toEqual(['chrome-mv3', 'firefox-mv2'])
    expect(budgets['chrome-mv3'].browser).toBe('chrome')
    expect(budgets['firefox-mv2'].browser).toBe('firefox')
    expect(budgets['chrome-mv3'].budgets.zipBytes).toBeGreaterThan(0)
    expect(budgets['firefox-mv2'].budgets.zipBytes).toBeGreaterThan(0)
  })

  it('uploads the verified production ZIP before building the testing extension', async () => {
    const workflow = await readText('.github/workflows/ci.yml')
    const packageJob = workflow.slice(workflow.indexOf('  package:'), workflow.indexOf('  browser-contracts:'))
    const verifyIndex = packageJob.indexOf('yarn verify:package-contracts')
    const uploadIndex = packageJob.indexOf('- name: Upload production Chrome ZIP for startup smoke')
    const testingBuildIndex = packageJob.indexOf('- name: Build testing extension')

    expect(verifyIndex).toBeGreaterThan(-1)
    expect(uploadIndex).toBeGreaterThan(verifyIndex)
    expect(testingBuildIndex).toBeGreaterThan(uploadIndex)
    expect(packageJob).toContain('path: .output/youtube-live-chat-fullscreen-*-chrome.zip')
    expect(packageJob).toContain('if-no-files-found: error')
  })
})
