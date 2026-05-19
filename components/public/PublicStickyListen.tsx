'use client'

type Props = {
  label: string
  targetId?: string
}

/** Mobile sticky CTA — scrolls to the listen/player section. */
export default function PublicStickyListen({ label, targetId = 'listen' }: Props) {
  return (
    <div className="public-sticky-listen">
      <a href={`#${targetId}`} className="public-sticky-listen__btn btn-gold">
        {label}
      </a>
    </div>
  )
}
