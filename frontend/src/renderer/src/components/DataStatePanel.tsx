import React from 'react'
import { Button, Result, Skeleton, Tooltip } from 'antd'
import type { NormalizedApiError } from '../api'
import { t } from '../i18n'

interface DataStatePanelProps {
  loading: boolean
  error: NormalizedApiError | Error | null
  isEmpty: boolean
  onRetry?: () => void
  children: React.ReactNode
  minHeight?: number | string
  downgradedCount?: number
}

const DataStatePanel: React.FC<DataStatePanelProps> = ({
  loading,
  error,
  isEmpty,
  onRetry,
  children,
  minHeight = 220,
  downgradedCount = 0
}) => {
  if (loading) {
    return (
      <div
        className="data-state-panel__loading"
        style={{
          minHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <div style={{ width: '100%', maxWidth: 520 }} aria-label={t('states.loading')}>
          <Skeleton.Input active size="small" style={{ width: 160, marginBottom: 12 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="data-state-panel__error" style={{ minHeight }}>
        <Result
          status="error"
          title={t('states.errorTitle')}
          subTitle={error.message || t('states.errorDesc')}
          extra={
            onRetry && (
              <Button type="primary" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            )
          }
        />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="data-state-panel__empty" style={{ minHeight }}>
        <Result
          status="warning"
          title={t('states.emptyTitle')}
          subTitle={t('states.emptyDesc')}
          extra={onRetry && <Button onClick={onRetry}>{t('common.retry')}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="data-state-panel__content" style={{ position: 'relative', height: '100%' }}>
      {downgradedCount > 0 && (
        <Tooltip title={t('states.degraded', { count: downgradedCount })}>
          <div
            className="data-state-panel__downgrade-warning"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 10,
              fontSize: '12px',
              color: '#ff4d4f',
              background: 'rgba(255, 77, 79, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 77, 79, 0.2)'
            }}
          >
            {t('states.degraded', { count: downgradedCount })}
          </div>
        </Tooltip>
      )}
      {children}
    </div>
  )
}

export default DataStatePanel
