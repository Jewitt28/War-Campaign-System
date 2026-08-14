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

export const COLOUR_SWATCHES = [
  '#e63946', '#f4a261', '#e9c46a', '#2a9d8f',
  '#457b9d', '#6a4c93', '#a8dadc', '#8ecae6',
  '#52b788', '#c77dff', '#f77f00', '#b5838d',
]

type ColourSwatchPickerProps = {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function ColourSwatchPicker({ value, onChange, label }: ColourSwatchPickerProps) {
  return (
    <div>
      {label ? <p className="field-label" style={{ marginBottom: 8 }}>{label}</p> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {COLOUR_SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(value === hex ? '' : hex)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: hex,
              border: value === hex ? '3px solid white' : '2px solid transparent',
              outline: value === hex ? '2px solid ' + hex : 'none',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
            aria-label={hex}
          />
        ))}
        {value ? (
          <button
            type="button"
            className="button-secondary"
            style={{ fontSize: '0.75rem', padding: '2px 10px' }}
            onClick={() => onChange('')}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}
