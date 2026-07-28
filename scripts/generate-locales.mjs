import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { compileLocales } from './locales/compiler.mjs'

const runtimeDir = new URL('../public/locales/', import.meta.url)
const manifestDir = new URL('../public/_locales/', import.meta.url)
const generatedDir = new URL('../shared/i18n/generated/', import.meta.url)
const checkOnly = process.argv.includes('--check')

const readTree = async (directory, prefix = '') => {
  const files = new Map()
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      for (const [childPath, content] of await readTree(new URL(`${entry.name}/`, directory), path)) {
        files.set(childPath, content)
      }
    } else if (entry.isFile()) {
      files.set(path, await readFile(new URL(entry.name, directory), 'utf8'))
    } else {
      files.set(path, null)
    }
  }
  return files
}

const verifyFiles = async (directory, expectedFiles, label) => {
  const actualFiles = await readTree(directory)
  const paths = new Set([...actualFiles.keys(), ...expectedFiles.keys()])
  for (const path of paths) {
    if (actualFiles.get(path) !== expectedFiles.get(path)) throw new Error(`${label} is stale: ${path}`)
  }
}

const writeFiles = async (directory, files) => {
  await rm(directory, { recursive: true, force: true })
  for (const [path, content] of files) {
    const target = new URL(path, directory)
    await mkdir(new URL('./', target), { recursive: true })
    await writeFile(target, content)
  }
}

const compiled = await compileLocales()
if (checkOnly) {
  await verifyFiles(runtimeDir, compiled.runtimeFiles, 'Runtime locale output')
  await verifyFiles(manifestDir, compiled.manifestFiles, 'Manifest locale output')
  await verifyFiles(generatedDir, compiled.generatedFiles, 'Generated locale metadata')
} else {
  await writeFiles(runtimeDir, compiled.runtimeFiles)
  await writeFiles(manifestDir, compiled.manifestFiles)
  await writeFiles(generatedDir, compiled.generatedFiles)
}

console.log(`${checkOnly ? 'Checked' : 'Generated'} ${compiled.localeCodes.length} locale assets`)
