import { NavLink } from 'react-router-dom'

type NoticeProps = {
  children: React.ReactNode
  tone?: 'default' | 'error' | 'success'
}

export function Notice({ children, tone = 'default' }: NoticeProps) {
  const className =
    tone === 'error'
      ? 'notice notice-error'
      : tone === 'success'
        ? 'notice notice-success'
        : 'notice'

  return <div className={className}>{children}</div>
}

type StateCardProps = {
  title: string
  description: string
  actions?: React.ReactNode
}

export function StateCard({ title, description, actions }: StateCardProps) {
  return (
    <section className="surface-card state-card state-stack">
      <p className="eyebrow">WAR Online Campaign</p>
      <h2 className="state-title">{title}</h2>
      <p className="muted">{description}</p>
      {actions ? <div className="state-actions">{actions}</div> : null}
    </section>
  )
}

type SkeletonCardProps = {
  lines?: number
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <section className="surface-card state-card state-stack">
      <div className="skeleton" style={{ height: 12, width: 110, borderRadius: 999 }} />
      <div className="skeleton" style={{ height: 28, width: '45%', borderRadius: 12 }} />
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton"
          style={{ height: 14, width: `${100 - index * 12}%`, borderRadius: 999 }}
        />
      ))}
    </section>
  )
}

type DetailItem = {
  label: string
  value: React.ReactNode
}

type DetailListProps = {
  items: DetailItem[]
}

export function DetailList({ items }: DetailListProps) {
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label} className="detail-row">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

type NavActionProps = {
  to: string
  children: React.ReactNode
}

export function NavAction({ to, children }: NavActionProps) {
  return (
    <NavLink className="button-link" to={to}>
      {children}
    </NavLink>
  )
}
