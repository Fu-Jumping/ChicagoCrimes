import React from 'react'
import { Button, Collapse, Empty, Space, Table, Tag, Typography } from 'antd'
import { useRequestHistory } from '../hooks/useRequestHistory'
import type { RequestHistoryEntry } from '../api'
import { t } from '../i18n'

const { Text } = Typography

interface RequestDebugPanelProps {
  title: string
  pathPrefixes: string[]
}

const renderCacheTag = (value: RequestHistoryEntry['cacheStatus']): React.ReactNode => {
  if (value === 'HIT') {
    return <Tag color="green">服务端缓存</Tag>
  }
  if (value === 'MEMORY_HIT') {
    return <Tag color="cyan">本地缓存</Tag>
  }
  if (value === 'MISS') {
    return <Tag color="orange">未命中</Tag>
  }
  return <Tag>无</Tag>
}

const RequestDebugPanel: React.FC<RequestDebugPanelProps> = ({ title, pathPrefixes }) => {
  const { entries, summary, clear } = useRequestHistory(pathPrefixes)

  const dataSource = entries.slice(0, 15).map((entry) => ({
    key: entry.id,
    ...entry
  }))

  return (
    <Collapse
      style={{ marginTop: 16 }}
      items={[
        {
          key: 'request-debug',
          label: title || t('debug.title'),
          children: (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space size={12} wrap>
                <Text>
                  {t('debug.total')}：{summary.total}
                </Text>
                <Text>
                  {t('debug.failed')}：{summary.failed}
                </Text>
                <Text>
                  {t('debug.cacheHit')}：{summary.cacheHit}
                </Text>
                <Text>
                  {t('debug.avgDuration')}：{summary.avgDurationMs.toFixed(1)}ms
                </Text>
                <Button size="small" onClick={clear}>
                  {t('debug.clear')}
                </Button>
              </Space>
              {dataSource.length === 0 ? (
                <Empty description={t('debug.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ x: 980 }}
                  dataSource={dataSource}
                  columns={[
                    {
                      title: t('debug.time'),
                      dataIndex: 'endedAt',
                      key: 'endedAt',
                      width: 140,
                      render: (value: number) => new Date(value).toLocaleTimeString()
                    },
                    {
                      title: t('debug.request'),
                      key: 'request',
                      width: 280,
                      render: (_, row: RequestHistoryEntry) =>
                        `${row.method} ${row.url}${row.retryAttempt > 0 ? ` (${t('debug.retry', { count: row.retryAttempt })})` : ''}`
                    },
                    {
                      title: t('debug.status'),
                      dataIndex: 'status',
                      key: 'status',
                      width: 80
                    },
                    {
                      title: t('debug.cache'),
                      dataIndex: 'cacheStatus',
                      key: 'cacheStatus',
                      width: 100,
                      render: renderCacheTag
                    },
                    {
                      title: t('debug.duration'),
                      dataIndex: 'durationMs',
                      key: 'durationMs',
                      width: 100,
                      render: (value: number) => value.toFixed(1)
                    },
                    {
                      title: t('debug.requestId'),
                      dataIndex: 'requestId',
                      key: 'requestId',
                      width: 210,
                      render: (value?: string) => value ?? '-'
                    },
                    {
                      title: t('debug.errorSummary'),
                      dataIndex: 'errorSummary',
                      key: 'errorSummary',
                      ellipsis: true,
                      render: (value?: string) => value ?? '-'
                    }
                  ]}
                />
              )}
            </Space>
          )
        }
      ]}
    />
  )
}

export default RequestDebugPanel
