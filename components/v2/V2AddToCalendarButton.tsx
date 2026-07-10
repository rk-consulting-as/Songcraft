'use client'

import { downloadSessionIcs } from '@/lib/v2/format'

type Props = {
  title: string
  startsAt: string
  endsAt?: string
  description?: string
  url?: string
  uid?: string
}

export default function V2AddToCalendarButton({ title, startsAt, endsAt, description, url, uid }: Props) {
  return (
    <button
      type="button"
      className="v2-btn secondary sm"
      onClick={() => downloadSessionIcs({ title, startsAt, endsAt, description, url, uid })}
    >
      Add to calendar
    </button>
  )
}
