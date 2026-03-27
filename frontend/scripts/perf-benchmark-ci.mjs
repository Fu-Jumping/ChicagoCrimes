process.env.PERF_SAMPLE_SIZE = process.env.PERF_SAMPLE_SIZE ?? '10000'
process.env.PERF_RUNS = process.env.PERF_RUNS ?? '12'
process.env.PERF_THRESHOLD_NORMALIZE_P95 = process.env.PERF_THRESHOLD_NORMALIZE_P95 ?? '45'
process.env.PERF_THRESHOLD_LINE_P95 = process.env.PERF_THRESHOLD_LINE_P95 ?? '130'
process.env.PERF_THRESHOLD_BAR_P95 = process.env.PERF_THRESHOLD_BAR_P95 ?? '120'
process.env.PERF_THRESHOLD_PIE_P95 = process.env.PERF_THRESHOLD_PIE_P95 ?? '220'
process.env.PERF_THRESHOLD_TOTAL_P95 = process.env.PERF_THRESHOLD_TOTAL_P95 ?? '420'

await import('./perf-benchmark.mjs')
