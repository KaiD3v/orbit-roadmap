import type { ReactNode } from 'react'

export function SectionHeading({ id, title, children }: {
  id: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="section-heading">
      <h2 id={id}>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}
