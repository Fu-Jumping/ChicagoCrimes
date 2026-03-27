import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('../src/renderer/src/', import.meta.url))
const allowList = ['i18n/index.ts', 'i18n/zh-CN.json']
const targetDirs = ['components', 'views']
const targetExtensions = new Set(['.ts', '.tsx'])
const hardcodedPattern = /(['"`])(?:[^\\]|\\.)*[\u4e00-\u9fa5]+(?:[^\\]|\\.)*\1/g
const failures = []

const walk = (dir) => {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath)
      continue
    }
    const ext = extname(fullPath)
    if (!targetExtensions.has(ext)) {
      continue
    }
    if (fullPath.includes('.test.') || fullPath.includes('\\tests\\')) {
      continue
    }
    const relative = fullPath.replace(rootDir + '\\', '').replaceAll('\\', '/')
    const isTarget = targetDirs.some((dirName) => relative.startsWith(`${dirName}/`))
    if (!isTarget) {
      continue
    }
    if (relative.startsWith('components/charts/')) {
      continue
    }
    if (allowList.includes(relative)) {
      continue
    }
    const content = readFileSync(fullPath, 'utf-8')
    const matches = content.match(hardcodedPattern)
    if (matches && matches.length > 0) {
      failures.push({ file: relative, sample: matches[0] })
    }
  }
}

walk(rootDir)

if (failures.length > 0) {
  console.error('i18n 扫描失败，发现硬编码中文文案：')
  failures.forEach((item) => {
    console.error(`- ${item.file} -> ${item.sample}`)
  })
  process.exit(1)
}

console.log('i18n 扫描通过：未发现硬编码中文文案。')
