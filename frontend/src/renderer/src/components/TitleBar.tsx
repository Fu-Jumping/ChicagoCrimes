import React from 'react'
import { CloseOutlined, MinusOutlined, BorderOutlined } from '@ant-design/icons'
import { t } from '../i18n'

const TitleBar: React.FC = () => {
  const handleMinimize = (): void => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('window-minimize')
    }
  }

  const handleMaximize = (): void => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('window-maximize')
    }
  }

  const handleClose = (): void => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('window-close')
    }
  }

  return (
    <div className="custom-titlebar">
      <div className="titlebar-drag-area">
        <span className="titlebar-logo">{t('app.windowTitle')}</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="control-btn minimize"
          onClick={handleMinimize}
          aria-label={t('app.windowMinimize')}
        >
          <MinusOutlined />
        </button>
        <button
          className="control-btn maximize"
          onClick={handleMaximize}
          aria-label={t('app.windowMaximize')}
        >
          <BorderOutlined style={{ fontSize: '10px' }} />
        </button>
        <button
          className="control-btn close"
          onClick={handleClose}
          aria-label={t('app.windowClose')}
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
