type Props = {
  icon?: string
  title: string
  description?: string
  accent?: string
}

export default function PublicEmptyState({ icon = '♪', title, description, accent }: Props) {
  return (
    <div
      className="public-empty"
      style={accent ? ({ ['--pub-accent' as string]: accent } as React.CSSProperties) : undefined}
    >
      <span className="public-empty__icon" aria-hidden>{icon}</span>
      <p className="public-empty__title">{title}</p>
      {description && <p className="public-empty__desc">{description}</p>}
    </div>
  )
}
