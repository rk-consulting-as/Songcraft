import Link from 'next/link'
import { redirect } from 'next/navigation'
import V2ParticipationHistory from '@/components/v2/V2ParticipationHistory'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SupporterBadges, { V2SupporterScoreGrid } from '@/components/v2/V2SupporterBadges'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import { fetchUserCommunityProfile, fetchUserParticipationHistory } from '@/lib/v2/data/supporters'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ParticipationPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, history] = await Promise.all([
    fetchUserCommunityProfile(user.id),
    fetchUserParticipationHistory(user.id, 40),
  ])

  const sessionHistory = history.filter(h => h.type === 'session_joined' || h.type === 'session_listened')
  const feedbackHistory = history.filter(h => h.type === 'feedback')

  return (
    <>
      <V2SectionHeader
        title="My participation"
        lead="Sessions, listening confirmations, feedback and support — community activity, not verified streams."
        action={<Link href={V2_ROUTES.home} className="v2-btn secondary sm">Community home</Link>}
      />

      <div className="v2-grid cols-2" style={{ gap: 24, alignItems: 'start' }}>
        <V2SupporterProfileCard profile={profile} />
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Supporter score" lead="Weighted from participation signals across ViaTone community." />
          <V2SupporterScoreGrid summary={profile.scoreSummary} />
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>Active badges</h4>
            <V2SupporterBadges badges={profile.badges} />
          </div>
        </section>
      </div>

      <V2ParticipationHistory
        items={sessionHistory}
        title="My sessions"
        lead="Sessions you joined and listening confirmations."
      />

      <V2ParticipationHistory
        items={feedbackHistory}
        title="Feedback history"
        lead="Ratings and reactions you shared with creators."
      />

      <V2ParticipationHistory
        items={history}
        title="All activity"
        lead="Full participation timeline."
      />
    </>
  )
}
