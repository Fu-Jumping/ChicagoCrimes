import { Modal, Typography } from 'antd'
import type { JSX } from 'react'
import { t } from '../i18n'

const { Paragraph, Title } = Typography

export interface ManualSetupGuideProps {
  open: boolean
  onClose: () => void
  csvPath?: string
}

/**
 * Fallback instructions when automated import / build fails (MySQL CLI, paths, privileges).
 */
export function ManualSetupGuide({ open, onClose, csvPath }: ManualSetupGuideProps): JSX.Element {
  const pathHint = csvPath || t('setup.manual.placeholderCsvPath')
  return (
    <Modal
      title={t('setup.manual.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Title level={5}>{t('setup.manual.sectionPrereq')}</Title>
      <Paragraph>
        <ol>
          <li>{t('setup.manual.stepInstallMysql')}</li>
          <li>{t('setup.manual.stepLocalInfile')}</li>
          <li>{t('setup.manual.stepServerInfile')}</li>
        </ol>
      </Paragraph>
      <Title level={5}>{t('setup.manual.sectionEnv')}</Title>
      <Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {t('setup.manual.envExample')}
        </pre>
      </Paragraph>
      <Title level={5}>{t('setup.manual.sectionSchema')}</Title>
      <Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {`cd <项目根目录>
.venv\\Scripts\\activate   # 或你的 Python 环境
python backend/scripts/init_db.py`}
        </pre>
      </Paragraph>
      <Title level={5}>{t('setup.manual.sectionImport')}</Title>
      <Paragraph>{t('setup.manual.importIntro', { path: pathHint })}</Paragraph>
      <Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {`mysql --local-infile=1 -h 127.0.0.1 -P 3306 -u <用户> -p <数据库名>
mysql> SOURCE backend/sql/import_kaggle_crimes.sql;`}
        </pre>
      </Paragraph>
      <Paragraph type="secondary">{t('setup.manual.importNote')}</Paragraph>
      <Title level={5}>{t('setup.manual.sectionSummaries')}</Title>
      <Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {`python backend/scripts/rebuild_layered_summaries.py`}
        </pre>
      </Paragraph>
      <Paragraph type="secondary">{t('setup.manual.logHint')}</Paragraph>
    </Modal>
  )
}
