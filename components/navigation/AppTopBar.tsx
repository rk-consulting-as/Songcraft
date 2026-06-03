'use client'

import Link from 'next/link'
import { useNavigationContext } from '@/components/navigation/NavigationProvider'
import ProfileMenu from '@/components/ProfileMenu'
import { t, useLang } from '@/lib/i18n'

export default function AppTopBar() {
  const ctx = useNavigationContext()
  const tx = t[useLang()] as Record<string, string>

  const openChat = () => {
    try { window.dispatchEvent(new CustomEvent('songcraft:open-chat')) } catch { /* noop */ }
  }

  return (
    <header className="app-nav-topbar" data-header="app-nav">
      <div className="app-nav-topbar__brand">
        <span className="app-nav-topbar__logo" aria-hidden>🎼</span>
        <span className="app-nav-topbar__name">VIATONE</span>
      </div>
      <div className="app-nav-topbar__actions">
        <button
          type="button"
          className="app-nav-topbar__action app-nav-topbar__action--search"
          title={tx.sidebarNavSearchHint}
          aria-label={tx.sidebarNavSearch}
          disabled
        >
          <span aria-hidden>🔍</span>
          <span className="app-nav-topbar__action-label">{tx.sidebarNavSearch}</span>
        </button>
        <button
          type="button"
          className="app-nav-topbar__action"
          onClick={openChat}
          aria-label={tx.messagesNavLink}
        >
          <span aria-hidden>💬</span>
          <span className="app-nav-topbar__action-label">{tx.messagesNavLink}</span>
          {(ctx?.unreadCount ?? 0) > 0 && (
            <span className="app-nav-topbar__badge">
              {(ctx?.unreadCount ?? 0) > 99 ? '99+' : ctx?.unreadCount}
            </span>
          )}
        </button>
        <Link href="/profile#notifications" className="app-nav-topbar__action" aria-label={tx.sidebarNavNotifications}>
          <span aria-hidden>🔔</span>
          <span className="app-nav-topbar__action-label">{tx.sidebarNavNotifications}</span>
        </Link>
        {ctx?.userProfile && (
          <ProfileMenu
            profile={ctx.userProfile}
            role={ctx.userRole}
            studio={ctx.studioPage}
            unreadCount={ctx.unreadCount}
            texts={{
              viewProfile: tx.profileViewMine,
              studioView: tx.studioPageNavView,
              studioSetup: tx.studioPageNavSetup,
              feed: tx.feedNavLink,
              analytics: tx.analyticsNavLink,
              referrals: tx.referralsNavLink,
              settings: tx.settings,
              admin: tx.adminNavLink,
              logout: tx.logout,
              guest: tx.profileGuest,
            }}
          />
        )}
      </div>
    </header>
  )
}
