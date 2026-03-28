/**
 * First-run setup wizard — calls `/api/setup/*` on backend origin (not under /api/v1).
 */

export const SETUP_BACKEND_ORIGIN =
  (import.meta as ImportMeta & { env?: { VITE_BACKEND_ORIGIN?: string } }).env?.VITE_BACKEND_ORIGIN ??
  'http://127.0.0.1:8000'

export interface SetupStatusResponse {
  database_configured: boolean
  tables_ok: boolean
  crimes_populated: boolean
  crimes_row_count?: number
  summaries_ready: boolean
  percent: number
  error?: string
  mysql_cli_installed?: boolean
  mysql_cli_version?: string | null
}

export interface CheckMysqlResponse {
  mysql_cli_installed: boolean
  mysql_cli_version: string | null
  tcp_port_open: boolean
  host: string
  port: number
}

export interface DatabaseConfigPayload {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export async function fetchSetupStatus(): Promise<SetupStatusResponse> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/status`)
  if (!r.ok) {
    throw new Error(`setup/status HTTP ${r.status}`)
  }
  return r.json() as Promise<SetupStatusResponse>
}

export async function postCheckMysql(host: string, port: number): Promise<CheckMysqlResponse> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/check-mysql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port })
  })
  if (!r.ok) {
    throw new Error(`check-mysql HTTP ${r.status}`)
  }
  return r.json() as Promise<CheckMysqlResponse>
}

export async function postTestConnection(cfg: DatabaseConfigPayload): Promise<{
  ok: boolean
  error: string | null
  database_exists: boolean
}> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `test-connection HTTP ${r.status}`)
  }
  return r.json() as Promise<{ ok: boolean; error: string | null; database_exists: boolean }>
}

export async function postCreateDatabase(cfg: DatabaseConfigPayload): Promise<{ ok: boolean }> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/create-database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `create-database HTTP ${r.status}`)
  }
  return r.json() as Promise<{ ok: boolean }>
}

export async function postSaveConfig(cfg: DatabaseConfigPayload): Promise<{ ok: boolean }> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/save-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `save-config HTTP ${r.status}`)
  }
  return r.json() as Promise<{ ok: boolean }>
}

export async function postInitSchema(): Promise<{ ok: boolean }> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}/api/setup/init-schema`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `init-schema HTTP ${r.status}`)
  }
  return r.json() as Promise<{ ok: boolean }>
}

/**
 * POST + ``text/event-stream`` (SSE-style) body stream.
 */
export async function consumeSetupSse(
  path: string,
  body: Record<string, unknown> | null,
  onEvent: (data: Record<string, unknown>) => void
): Promise<void> {
  const r = await fetch(`${SETUP_BACKEND_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  })
  if (!r.ok || !r.body) {
    const text = await r.text().catch(() => '')
    throw new Error(text || `stream HTTP ${r.status}`)
  }
  const reader = r.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const json = line.replace(/^data:\s*/, '').trim()
          if (!json) continue
          try {
            onEvent(JSON.parse(json) as Record<string, unknown>)
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    }
  }
}

export async function streamImportCsv(
  csvPath: string,
  truncateFirst: boolean,
  onEvent: (data: Record<string, unknown>) => void
): Promise<void> {
  await consumeSetupSse(
    '/api/setup/import-csv/stream',
    { csv_path: csvPath, truncate_first: truncateFirst },
    onEvent
  )
}

export async function streamBuildSummaries(onEvent: (data: Record<string, unknown>) => void): Promise<void> {
  await consumeSetupSse('/api/setup/build-summaries/stream', {}, onEvent)
}

export function isSetupFullyReady(status: SetupStatusResponse): boolean {
  return Boolean(
    status.database_configured && status.crimes_populated && status.summaries_ready && !status.error
  )
}
