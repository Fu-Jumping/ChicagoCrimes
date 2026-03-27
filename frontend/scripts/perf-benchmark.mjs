import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import * as d3 from 'd3'

const SAMPLE_SIZE = Number(process.env.PERF_SAMPLE_SIZE ?? 5000)
const RUNS = Number(process.env.PERF_RUNS ?? 8)
const THRESHOLDS_MS = {
  normalizeP95: Number(process.env.PERF_THRESHOLD_NORMALIZE_P95 ?? 30),
  lineP95: Number(process.env.PERF_THRESHOLD_LINE_P95 ?? 100),
  barP95: Number(process.env.PERF_THRESHOLD_BAR_P95 ?? 90),
  pieP95: Number(process.env.PERF_THRESHOLD_PIE_P95 ?? 170),
  totalP95: Number(process.env.PERF_THRESHOLD_TOTAL_P95 ?? 320)
}

const round = (value) => Number(value.toFixed(2))

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)
  return sorted[index]
}

const createDataset = (size) =>
  Array.from({ length: size }, (_, index) => ({
    key: String(index + 1),
    month: `${(index % 12) + 1}`,
    district: `D-${String((index % 220) + 1).padStart(3, '0')}`,
    primary_type: `TYPE_${(index % 80) + 1}`,
    count: ((index * 37) % 500) + 1
  }))

const normalizeDataset = (rows) =>
  rows.map((row, index) => {
    const category = row.district?.trim() || `district-${index + 1}`
    const metric = Number.isFinite(row.count) ? row.count : 0
    return {
      ...row,
      district: category,
      count: metric,
      key: row.key?.trim() || category
    }
  })

const buildLineLayout = (rows) => {
  const x = d3
    .scalePoint()
    .domain(rows.map((item) => item.month))
    .range([0, 960])
    .padding(0.5)
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (item) => item.count) ?? 0])
    .nice()
    .range([540, 0])
  const line = d3
    .line()
    .x((item) => x(item.month) ?? 0)
    .y((item) => y(item.count))
  return line(rows)
}

const buildBarLayout = (rows) => {
  const x = d3
    .scaleBand()
    .domain(rows.map((item) => item.district))
    .range([0, 960])
    .padding(0.1)
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(rows, (item) => item.count) ?? 0])
    .nice()
    .range([540, 0])
  return rows.map((item) => ({
    x: x(item.district) ?? 0,
    width: x.bandwidth(),
    y: y(item.count),
    height: 540 - y(item.count)
  }))
}

const buildPieLayout = (rows) => {
  const pie = d3
    .pie()
    .value((item) => item.count)
    .sort(null)
  const arc = d3.arc().innerRadius(0).outerRadius(180)
  return pie(rows).map((datum) => arc(datum))
}

const benchmark = (sourceRows) => {
  const metrics = {
    normalize: [],
    line: [],
    bar: [],
    pie: [],
    total: []
  }

  for (let runIndex = 0; runIndex < RUNS; runIndex += 1) {
    const totalStarted = performance.now()

    const normalizeStarted = performance.now()
    const normalizedRows = normalizeDataset(sourceRows)
    metrics.normalize.push(performance.now() - normalizeStarted)

    const lineStarted = performance.now()
    buildLineLayout(normalizedRows)
    metrics.line.push(performance.now() - lineStarted)

    const barStarted = performance.now()
    buildBarLayout(normalizedRows)
    metrics.bar.push(performance.now() - barStarted)

    const pieStarted = performance.now()
    buildPieLayout(normalizedRows)
    metrics.pie.push(performance.now() - pieStarted)

    metrics.total.push(performance.now() - totalStarted)
  }

  return metrics
}

const dataset = createDataset(SAMPLE_SIZE)
benchmark(dataset)
const measured = benchmark(dataset)

const summary = {
  sampleSize: SAMPLE_SIZE,
  runs: RUNS,
  normalizeP95: round(percentile(measured.normalize, 0.95)),
  lineP95: round(percentile(measured.line, 0.95)),
  barP95: round(percentile(measured.bar, 0.95)),
  pieP95: round(percentile(measured.pie, 0.95)),
  totalP95: round(percentile(measured.total, 0.95))
}

const output = {
  generatedAt: new Date().toISOString(),
  thresholdsMs: THRESHOLDS_MS,
  summary,
  rawRunsMs: measured
}

const outputDir = resolve(process.cwd(), 'perf-results')
mkdirSync(outputDir, { recursive: true })
writeFileSync(resolve(outputDir, 'latest.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')

console.log(`样本量: ${summary.sampleSize}, 轮次: ${summary.runs}`)
console.log(
  `P95(ms) => normalize:${summary.normalizeP95}, line:${summary.lineP95}, bar:${summary.barP95}, pie:${summary.pieP95}, total:${summary.totalP95}`
)
console.log(`明细结果: ${resolve(outputDir, 'latest.json')}`)

const failed = [
  ['normalizeP95', summary.normalizeP95, THRESHOLDS_MS.normalizeP95],
  ['lineP95', summary.lineP95, THRESHOLDS_MS.lineP95],
  ['barP95', summary.barP95, THRESHOLDS_MS.barP95],
  ['pieP95', summary.pieP95, THRESHOLDS_MS.pieP95],
  ['totalP95', summary.totalP95, THRESHOLDS_MS.totalP95]
].filter(([, value, threshold]) => value > threshold)

if (failed.length > 0) {
  console.error('性能门禁失败:')
  for (const [name, value, threshold] of failed) {
    console.error(`- ${name}=${value}ms, 阈值=${threshold}ms`)
  }
  process.exit(1)
}

console.log('性能门禁通过')
