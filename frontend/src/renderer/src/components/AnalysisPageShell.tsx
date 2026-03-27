import React from 'react'
import { Alert, Space } from 'antd'
import RequestDebugPanel from './RequestDebugPanel'

interface AnalysisPageShellProps {
  title: React.ReactNode
  titleAccent?: string
  systemTag?: string
  subtitle?: string
  variant: 'dashboard' | 'trend' | 'district' | 'type'
  filter?: React.ReactNode
  /** 用户友好的联动事件描述文本 */
  eventStatus?: string
  /** 联动事件标题 */
  eventStatusTitle?: string
  children: React.ReactNode
  debugTitle?: string
  debugPathPrefixes?: string[]
  showDebug?: boolean
}

const AnalysisPageShell: React.FC<AnalysisPageShellProps> = ({
  title,
  titleAccent,
  systemTag,
  subtitle,
  variant,
  filter,
  eventStatus,
  eventStatusTitle,
  children,
  debugTitle,
  debugPathPrefixes,
  showDebug = true
}) => {
  return (
    <div className={`analysis-shell analysis-shell--${variant}`}>
      <Space className="analysis-shell__stack" orientation="vertical" size="large">
        <div className="analysis-shell__header">
          <div className="analysis-shell__title-block">
            {systemTag && (
              <div className="analysis-shell__eyebrow">
                <div className="analysis-shell__system-dot" />
                <span>{systemTag}</span>
              </div>
            )}
            <h2 className="analysis-shell__title">
              {title}
              {titleAccent && <span className="analysis-shell__title-accent"> {titleAccent}</span>}
            </h2>
            {subtitle && <p className="analysis-shell__subtitle">{subtitle}</p>}
          </div>
          {filter && <div className="analysis-shell__filter">{filter}</div>}
        </div>

        {eventStatus && (
          <div className="analysis-shell__status">
            <Alert type="info" showIcon message={eventStatusTitle} description={eventStatus} />
          </div>
        )}

        <div className="analysis-shell__content">{children}</div>

        {showDebug && debugTitle && debugPathPrefixes ? (
          <div className="analysis-shell__debug">
            <RequestDebugPanel title={debugTitle} pathPrefixes={debugPathPrefixes} />
          </div>
        ) : null}
      </Space>
    </div>
  )
}

export default AnalysisPageShell
