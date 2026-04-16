import { Alert, Button, Form, Input, InputNumber, Progress, Space, Steps, Typography } from 'antd'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { saveAs } from 'file-saver'
import {
  fetchSetupStatus,
  isSetupFullyReady,
  postCheckMysql,
  postCreateDatabase,
  postInitSchema,
  postSaveConfig,
  postTestConnection,
  streamBuildSummaries,
  streamImportCsv,
  type DatabaseConfigPayload,
  type SetupStatusResponse
} from '../api/setupWizard'
import { t } from '../i18n'
import { ManualSetupGuide } from './ManualSetupGuide'

const { Paragraph, Text } = Typography

function translateNetworkError(e: unknown): string {
  const msg = String(e)
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return '无法连接到后端服务（http://127.0.0.1:8000）。请确认 Python 后端已启动，然后重新尝试。'
  }
  if (msg.includes('503') || msg.includes('Service Unavailable')) {
    return '后端服务暂不可用（503）。请稍候重试，或检查后端是否正常运行。'
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return '连接超时，后端响应过慢。请检查后端是否正在启动中。'
  }
  return msg
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i > 0 ? 1 : 0)} ${u[i]}`
}

export interface SetupWizardProps {
  onComplete: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps): JSX.Element {
  const [current, setCurrent] = useState(0)
  const [mysqlCheck, setMysqlCheck] = useState<{
    loading: boolean
    data?: Awaited<ReturnType<typeof postCheckMysql>>
  }>({ loading: false })
  const [form] = Form.useForm<DatabaseConfigPayload>()
  const [connOk, setConnOk] = useState<boolean | null>(null)
  const [dbExists, setDbExists] = useState<boolean | null>(null)
  const [connError, setConnError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [csvPath, setCsvPath] = useState('')
  const [csvSize, setCsvSize] = useState<number | null>(null)
  const [importPct, setImportPct] = useState<number | null>(null)
  const [importRows, setImportRows] = useState<number | null>(null)
  const [buildPct, setBuildPct] = useState<number | null>(null)
  const [buildLabel, setBuildLabel] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [buildStarted, setBuildStarted] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [configSaved, setConfigSaved] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)

  const appendLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-400), `[${new Date().toLocaleTimeString()}] ${line}`])
  }, [])

  const deskApi = typeof window !== 'undefined' ? window.api : undefined

  const runMysqlCheck = useCallback(async () => {
    setMysqlCheck({ loading: true })
    try {
      const host = form.getFieldValue('host') || '127.0.0.1'
      const port = form.getFieldValue('port') || 3306
      const data = await postCheckMysql(host, port)
      setMysqlCheck({ loading: false, data })
      appendLog(
        `MySQL 检测: cli=${data.mysql_cli_installed} port=${data.tcp_port_open ? 'open' : 'closed'}`
      )
    } catch (e) {
      setMysqlCheck({ loading: false })
      appendLog(`MySQL 检测失败: ${translateNetworkError(e)}`)
    }
  }, [appendLog, form])

  useEffect(() => {
    if (current === 1) {
      void runMysqlCheck()
    }
  }, [current, runMysqlCheck])

  const testConnection = async (): Promise<void> => {
    const v = await form.validateFields()
    setBusy(true)
    setConnOk(null)
    setConnError(null)
    try {
      const r = await postTestConnection(v)
      setConnOk(r.ok)
      setDbExists(r.database_exists)
      setConnError(r.error)
      appendLog(r.ok ? t('setup.connOk') : `${t('setup.connFail')}: ${r.error || ''}`)
    } catch (e) {
      const errMsg = translateNetworkError(e)
      setConnOk(false)
      setConnError(errMsg)
      appendLog(`测试连接异常: ${errMsg}`)
    } finally {
      setBusy(false)
    }
  }

  const createDb = async (): Promise<void> => {
    const v = await form.validateFields()
    setBusy(true)
    try {
      await postCreateDatabase(v)
      appendLog(`已创建数据库 ${v.database}`)
      setDbExists(true)
    } catch (e) {
      appendLog(`创建数据库失败: ${translateNetworkError(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const saveConfig = async (): Promise<void> => {
    const v = await form.validateFields()
    setBusy(true)
    try {
      await postSaveConfig(v)
      appendLog('已保存 .env 并重新连接数据库')
    } catch (e) {
      appendLog(`保存配置失败: ${translateNetworkError(e)}`)
      throw e
    } finally {
      setBusy(false)
    }
  }

  const initSchema = async (): Promise<void> => {
    setBusy(true)
    try {
      await postInitSchema()
      appendLog('数据表结构已创建/校验')
    } catch (e) {
      appendLog(`初始化表结构失败: ${translateNetworkError(e)}`)
      throw e
    } finally {
      setBusy(false)
    }
  }

  const pickCsv = async (): Promise<void> => {
    if (deskApi?.selectCsvFile) {
      const r = await deskApi.selectCsvFile()
      if (!r.canceled && r.path) {
        setCsvPath(r.path)
        setCsvSize(r.size ?? null)
        appendLog(`已选择文件: ${r.path}${r.size != null ? ` (${formatBytes(r.size)})` : ''}`)
      }
      return
    }
    const p = window.prompt(t('setup.csvPath'), csvPath)
    if (p) {
      setCsvPath(p.trim())
      appendLog(`手动输入路径: ${p}`)
    }
  }

  const runImport = async (): Promise<void> => {
    if (!csvPath.trim()) {
      appendLog('请先选择 CSV 文件')
      return
    }
    setBuildStarted(false)
    setBuildPct(null)
    setImportPct(0)
    setImportRows(null)
    setImportDone(false)
    setImportError(null)
    setBusy(true)
    try {
      await streamImportCsv(csvPath.trim(), true, (ev) => {
        const phase = String(ev.phase || '')
        if (phase === 'counting_lines' && typeof ev.lines_scanned === 'number') {
          appendLog(`统计行数… 已扫描换行 ${ev.lines_scanned}`)
        }
        if (phase === 'line_count_done') {
          appendLog(`估计数据行数（不含表头）: ${String(ev.estimated_rows ?? '')}`)
        }
        if (phase === 'info') appendLog(`ℹ ${String(ev.message || '')}`)
        if (phase === 'warning') appendLog(`⚠ ${String(ev.message || '')}`)
        if (phase === 'truncate') appendLog(String(ev.message || 'truncate'))
        if (phase === 'load_data') appendLog(String(ev.message || 'LOAD DATA'))
        if (phase === 'import_progress') {
          setImportRows(typeof ev.rows_imported === 'number' ? ev.rows_imported : null)
          if (typeof ev.percent === 'number') setImportPct(ev.percent)
        }
        if (phase === 'import_done') {
          setImportRows(typeof ev.rows_imported === 'number' ? ev.rows_imported : null)
          setImportPct(100)
          setImportDone(true)
          appendLog(`导入完成，行数: ${String(ev.rows_imported ?? '')}`)
        }
        if (phase === 'error') {
          const errMsg = String(ev.message || '未知错误')
          appendLog(`错误: ${errMsg}`)
          setImportError(errMsg)
          setImportDone(false)
        }
      })
    } catch (e) {
      appendLog(`导入流异常: ${translateNetworkError(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const runBuild = useCallback(async () => {
    setBuildPct(0)
    setBuildLabel('')
    setBuildError(null)
    setBusy(true)
    let total = 1
    let cur = 0
    try {
      await streamBuildSummaries((ev) => {
        const phase = ev.phase !== undefined ? String(ev.phase) : ''
        if (phase === 'error') {
          const errMsg = String(ev.message || '未知构建错误')
          appendLog(`构建错误: ${errMsg}`)
          setBuildError(errMsg)
        }
        if (phase === 'build_done') {
          setBuildPct(100)
          setBuildLabel(String(ev.message || ''))
          setCurrent(6)
          appendLog(String(ev.message || '构建完成'))
        }
        if ('step' in ev) {
          const step = String(ev.step || '')
          if (step === 'summaries_start' && typeof ev.total === 'number') {
            total = ev.total
            cur = 0
          }
          if (step === 'summary_sql' && typeof ev.current === 'number') {
            cur = ev.current
            total = typeof ev.total === 'number' ? ev.total : total
            setBuildPct(Math.round((cur / Math.max(total, 1)) * 100))
            setBuildLabel(String(ev.preview || `SQL ${cur}/${total}`))
          }
          if (step.startsWith('index_') || step.startsWith('heatmap_')) {
            setBuildLabel(String(ev.message || ev.index || step))
          }
          if (step === 'summaries_done') {
            setBuildPct(100)
            setBuildLabel(String(ev.message || 'done'))
          }
          appendLog(JSON.stringify(ev).slice(0, 200))
        }
      })
    } catch (e) {
      appendLog(`构建流异常: ${translateNetworkError(e)}`)
    } finally {
      setBusy(false)
    }
  }, [appendLog, setCurrent])

  useEffect(() => {
    if (current !== 5) return
    if (buildStarted) return
    if (!importDone) return
    setBuildStarted(true)
    void runBuild()
  }, [current, buildStarted, importDone, runBuild])

  const finish = async (): Promise<void> => {
    try {
      const st: SetupStatusResponse = await fetchSetupStatus()
      if (!isSetupFullyReady(st)) {
        appendLog('后端状态未完全就绪，仍可尝试进入应用（部分图表可能降级）')
      }
      await deskApi?.setSetupStore?.({
        setupCompleted: true,
        lastCsvPath: csvPath
      })
    } catch {
      /* ignore */
    }
    onComplete()
  }

  const exportLogs = (): void => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `setup-wizard-log-${Date.now()}.txt`)
  }

  const initialValues = useMemo(
    () => ({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'school_chicago_crime'
    }),
    []
  )

  const steps = [
    { title: t('setup.stepWelcome') },
    { title: t('setup.stepMysql') },
    { title: t('setup.stepDb') },
    { title: t('setup.stepCsv') },
    { title: t('setup.stepImport') },
    { title: t('setup.stepBuild') },
    { title: t('setup.stepDone') }
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'var(--cc-bg-deep, #0b1020)',
        color: 'var(--cc-text-primary, #e8f0ff)',
        overflow: 'auto',
        padding: 24
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Typography.Title level={3} style={{ color: 'inherit' }}>
          {t('setup.title')}
        </Typography.Title>
        <Steps current={current} items={steps} style={{ marginBottom: 24 }} />

        {current === 0 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Title level={4} style={{ color: 'inherit' }}>
              {t('setup.welcomeTitle')}
            </Typography.Title>
            <Paragraph style={{ color: 'inherit' }}>{t('setup.welcomeDesc')}</Paragraph>
            <Button type="primary" onClick={() => setCurrent(1)}>
              {t('setup.next')}
            </Button>
          </Space>
        )}

        {current === 1 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Button onClick={() => runMysqlCheck()} loading={mysqlCheck.loading}>
              {t('setup.checkMysql')}
            </Button>
            {mysqlCheck.data && (
              <>
                <Alert
                  type={mysqlCheck.data.mysql_cli_installed ? 'success' : 'warning'}
                  showIcon
                  message={
                    mysqlCheck.data.mysql_cli_installed
                      ? t('setup.mysqlCliOk')
                      : t('setup.mysqlCliMissing')
                  }
                  description={mysqlCheck.data.mysql_cli_version || undefined}
                />
                <Alert
                  type={mysqlCheck.data.tcp_port_open ? 'success' : 'error'}
                  showIcon
                  message={
                    mysqlCheck.data.tcp_port_open ? t('setup.portOpen') : t('setup.portClosed')
                  }
                  description={
                    mysqlCheck.data.tcp_port_open
                      ? undefined
                      : 'Windows: 打开"服务"(services.msc) → 找到 MySQL → 右键启动。或在命令提示符(管理员)执行: net start mysql'
                  }
                />
              </>
            )}
            <Space>
              <Button onClick={() => setCurrent(0)}>{t('setup.back')}</Button>
              <Button type="primary" onClick={() => setCurrent(2)}>
                {t('setup.next')}
              </Button>
            </Space>
          </Space>
        )}

        {current === 2 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Form form={form} layout="vertical" initialValues={initialValues}>
              <Form.Item name="host" label={t('setup.dbFormHost')} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="port" label={t('setup.dbFormPort')} rules={[{ required: true }]}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="user" label={t('setup.dbFormUser')} rules={[{ required: true }]}>
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item name="password" label={t('setup.dbFormPassword')}>
                <Input.Password autoComplete="current-password" placeholder="无密码可留空" />
              </Form.Item>
              <Form.Item
                name="database"
                label={t('setup.dbFormDatabase')}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Form>
            {connOk === true && <Alert type="success" message={t('setup.connOk')} />}
            {connOk === false && (
              <Alert
                type="error"
                message={t('setup.connFail')}
                description={connError || undefined}
              />
            )}
            {connOk === true && dbExists === false && (
              <Alert type="info" message={t('setup.dbMissingHint')} />
            )}
            <Space wrap>
              <Button onClick={testConnection} loading={busy}>
                {t('setup.testConn')}
              </Button>
              <Button onClick={createDb} disabled={!connOk || dbExists !== false} loading={busy}>
                {t('setup.createDb')}
              </Button>
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await saveConfig()
                    await initSchema()
                  } catch {
                    return
                  }
                  setConfigSaved(true)
                  setCurrent(3)
                }}
                disabled={!connOk}
                loading={busy}
              >
                {t('setup.saveConfig')} + {t('setup.initSchema')}
              </Button>
            </Space>
            <Space>
              <Button onClick={() => setCurrent(1)}>{t('setup.back')}</Button>
              <Button onClick={() => setCurrent(3)} disabled={!configSaved}>
                {t('setup.next')}
              </Button>
            </Space>
          </Space>
        )}

        {current === 3 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph type="secondary">{t('setup.estimateNote')}</Paragraph>
            <Space wrap>
              <Button onClick={pickCsv}>{t('setup.pickCsv')}</Button>
            </Space>
            <div>
              <Text strong>{t('setup.csvPath')}: </Text>
              <Text code>{csvPath || '—'}</Text>
            </div>
            {csvSize !== null && (
              <div>
                <Text strong>{t('setup.csvSize')}: </Text>
                <Text>{formatBytes(csvSize)}</Text>
              </div>
            )}
            <Space>
              <Button onClick={() => setCurrent(2)}>{t('setup.back')}</Button>
              <Button type="primary" onClick={() => setCurrent(4)} disabled={!csvPath.trim()}>
                {t('setup.next')}
              </Button>
            </Space>
          </Space>
        )}

        {current === 4 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="导入提示"
              description="LOAD DATA 阶段进度条可能长时间停在 0%，这是 MySQL 事务机制导致的正常现象。1.7GB 文件预计需 5–20 分钟，请耐心等待，不要关闭窗口。"
              style={{ marginBottom: 8 }}
            />
            <Progress
              percent={importPct ?? 0}
              status={busy ? 'active' : importDone ? 'success' : 'normal'}
            />
            {importRows !== null && <Text>已导入约 {importRows.toLocaleString()} 行</Text>}
            {importDone && (
              <Alert
                type="success"
                showIcon
                message={`导入成功！共 ${(importRows ?? 0).toLocaleString()} 行数据。`}
              />
            )}
            {importError && (
              <Alert
                type="error"
                showIcon
                message="导入失败"
                description={
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                    {importError}
                  </pre>
                }
              />
            )}
            <Button type="primary" onClick={runImport} loading={busy} disabled={!csvPath.trim()}>
              {t('setup.startImport')}
            </Button>
            <Space>
              <Button onClick={() => setCurrent(3)} disabled={busy}>
                {t('setup.back')}
              </Button>
              <Button type="primary" onClick={() => setCurrent(5)} disabled={!importDone}>
                {t('setup.next')}
              </Button>
            </Space>
          </Space>
        )}

        {current === 5 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Progress
              percent={buildPct ?? 0}
              status={busy ? 'active' : buildPct === 100 ? 'success' : 'normal'}
            />
            {buildLabel && <Text type="secondary">{buildLabel}</Text>}
            {busy && <Paragraph type="secondary">{t('setup.buildRunning')}</Paragraph>}
            {!busy && !buildError && buildPct !== 100 && (
              <Paragraph type="secondary">{'点击“重试此步”开始构建'}</Paragraph>
            )}
            {buildError && (
              <Alert
                type="error"
                showIcon
                message="构建失败"
                description={
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                    {buildError}
                  </pre>
                }
              />
            )}
            <Space>
              <Button onClick={() => setCurrent(4)} disabled={busy}>
                {t('setup.back')}
              </Button>
              <Button onClick={() => void runBuild()} disabled={busy}>
                {t('setup.retry')}
              </Button>
            </Space>
          </Space>
        )}

        {current === 6 && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert type="success" message={t('setup.stepDone')} />
            <Button type="primary" onClick={finish}>
              {t('setup.finish')}
            </Button>
          </Space>
        )}

        <div style={{ marginTop: 32 }}>
          <Space wrap style={{ marginBottom: 8 }}>
            <Text strong>{t('setup.logs')}</Text>
            <Button size="small" onClick={exportLogs}>
              {t('setup.exportLogs')}
            </Button>
            <Button size="small" onClick={() => setManualOpen(true)}>
              {t('setup.manualGuide')}
            </Button>
          </Space>
          <pre
            style={{
              maxHeight: 220,
              overflow: 'auto',
              fontSize: 11,
              padding: 12,
              background: 'rgba(0,0,0,0.35)',
              borderRadius: 8
            }}
          >
            {logs.join('\n') || '—'}
          </pre>
        </div>
      </div>

      <ManualSetupGuide open={manualOpen} onClose={() => setManualOpen(false)} csvPath={csvPath} />
    </div>
  )
}
