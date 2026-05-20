'use client'

import { useEffect, useId, useRef } from 'react'
import Script from 'next/script'
import type { AdPlacement } from '@/lib/ads/config'
import { getAdSlotId, getAdsenseClientId, isAdsGloballyEnabled } from '@/lib/ads/config'
import { t, useLang } from '@/lib/i18n'

type Props = {
  placement: AdPlacement
  /** Parent resolves plan + path policy; when false, nothing renders. */
  show?: boolean
  className?: string
}

let adsScriptLoaded = false

export default function AdSlot({ placement, show = false, className = '' }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const uid = useId().replace(/:/g, '')

  const enabled = isAdsGloballyEnabled()
  const clientId = getAdsenseClientId()
  const slotId = getAdSlotId(placement)
  const canRender = show && enabled && !!clientId

  useEffect(() => {
    if (!canRender || !slotId || !insRef.current || pushedRef.current) return
    try {
      const w = window as Window & { adsbygoogle?: unknown[] }
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
      pushedRef.current = true
    } catch {
      /* ignore */
    }
  }, [canRender, slotId])

  if (!canRender) return null

  const rootClass = ['ad-slot', `ad-slot--${placement.replace(/_/g, '-')}`, className].filter(Boolean).join(' ')

  return (
    <aside className={rootClass} role="complementary" aria-label={tx.adSponsored || 'Sponsored'}>
      <p className="ad-slot__label">{tx.adSponsored || 'Sponsored'}</p>
      {slotId ? (
        <>
          {!adsScriptLoaded && (
            <Script
              id="viatone-adsense"
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
              onLoad={() => { adsScriptLoaded = true }}
            />
          )}
          <ins
            ref={insRef}
            className="adsbygoogle ad-slot__unit"
            style={{ display: 'block' }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
            id={`ad-${placement}-${uid}`}
          />
        </>
      ) : (
        <div className="ad-slot__placeholder" aria-hidden="true" />
      )}
    </aside>
  )
}
