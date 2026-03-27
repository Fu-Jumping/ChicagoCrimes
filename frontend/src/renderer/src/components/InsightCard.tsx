import React from 'react'

export interface InsightCardProps {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  extra?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const InsightCard: React.FC<InsightCardProps> = ({
  eyebrow,
  title,
  description,
  extra,
  children,
  className
}) => {
  return (
    <section className={`analysis-module-card${className ? ` ${className}` : ''}`}>
      <header className="analysis-module-card__header">
        <div className="analysis-module-card__copy">
          {eyebrow ? <span className="analysis-module-card__eyebrow">{eyebrow}</span> : null}
          <h3 className="analysis-module-card__title">{title}</h3>
          {description ? <p className="analysis-module-card__description">{description}</p> : null}
        </div>
        {extra ? <div className="analysis-module-card__extra">{extra}</div> : null}
      </header>
      <div className="analysis-module-card__body">{children}</div>
    </section>
  )
}

export default InsightCard
