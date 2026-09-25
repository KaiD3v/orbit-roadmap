import type { ReactNode } from 'react'

export function SectionHeading({ id, label, title, children }: {
  id: string
  label: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="small-label">{label}</span>
        <h2 id={id}>{title}</h2>
        {children && <p>{children}</p>}
      </div>
    </div>
  )
}
