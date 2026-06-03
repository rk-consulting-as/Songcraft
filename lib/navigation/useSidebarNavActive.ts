'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isSidebarNavEnabled } from '@/lib/navigation/featureFlags'
import { isSidebarNavExcluded } from '@/lib/navigation/routes'

const DESKTOP_MQ = '(min-width: 761px)'

/** True when global desktop sidebar shell is active (body[data-sidebar-nav-v1="1"]). */
export function useSidebarNavActive(): boolean {
  const pathname = usePathname()
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => {
      const desktop = window.matchMedia(DESKTOP_MQ).matches
      const enabled = isSidebarNavEnabled()
      const excluded = isSidebarNavExcluded(pathname)
      setActive(desktop && enabled && !excluded && document.body.dataset.sidebarNavV1 === '1')
    }
    sync()
    const mq = window.matchMedia(DESKTOP_MQ)
    mq.addEventListener('change', sync)
    window.addEventListener('storage', sync)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-sidebar-nav-v1'] })
    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('storage', sync)
      observer.disconnect()
    }
  }, [pathname])

  return active
}
