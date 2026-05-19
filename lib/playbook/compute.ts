import { t, type Lang } from '@/lib/i18n'
import { getPrimaryArtist, isEssentialSetupComplete, runPlaybookCheck } from './checks'
import { PLAYBOOK_CATEGORY_ORDER, PLAYBOOK_MILESTONES, PLAYBOOK_TASKS } from './registry'
import type {
  PlaybookCategoryId,
  PlaybookCategoryResult,
  PlaybookContext,
  PlaybookProgress,
  PlaybookTaskResult,
} from './types'

const CATEGORY_LABEL_KEYS: Record<PlaybookCategoryId, string> = {
  profile: 'playbookCategoryProfile',
  public: 'playbookCategoryPublic',
  music: 'playbookCategoryMusic',
  promotion: 'playbookCategoryPromotion',
  growth: 'playbookCategoryGrowth',
}

function categoryPercent(tasks: PlaybookTaskResult[]) {
  const total = tasks.reduce((s, t) => s + t.weight, 0)
  const done = tasks.filter(t => t.done).reduce((s, t) => s + t.weight, 0)
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function computePlaybookProgress(ctx: PlaybookContext, lang: Lang): PlaybookProgress {
  const tx = t[lang] as Record<string, string>

  const tasks: PlaybookTaskResult[] = PLAYBOOK_TASKS.map(def => ({
    ...def,
    done: runPlaybookCheck(def.checkId, ctx),
    href: def.href?.(ctx) ?? null,
    label: tx[def.labelKey] || def.labelKey,
    description: def.descKey ? tx[def.descKey] : undefined,
  }))

  const categories: PlaybookCategoryResult[] = PLAYBOOK_CATEGORY_ORDER.map(id => {
    const catTasks = tasks.filter(t => t.category === id)
    const doneCount = catTasks.filter(t => t.done).length
    return {
      id,
      label: tx[CATEGORY_LABEL_KEYS[id]] || id,
      percent: categoryPercent(catTasks),
      doneCount,
      totalCount: catTasks.length,
      tasks: catTasks,
    }
  })

  const totalWeight = tasks.reduce((s, t) => s + t.weight, 0)
  const doneWeight = tasks.filter(t => t.done).reduce((s, t) => s + t.weight, 0)
  const overallPercent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0

  const incomplete = tasks.filter(t => !t.done).sort((a, b) => a.priority - b.priority)
  const nextTask = incomplete[0] ?? null
  const growthTask = incomplete.find(t => t.tags?.includes('growth')) ?? null
  const releaseTask = incomplete.find(t => t.tags?.includes('release')) ?? null

  const milestones = PLAYBOOK_MILESTONES.map(def => ({
    ...def,
    done: runPlaybookCheck(def.checkId, ctx),
    label: tx[def.labelKey] || def.labelKey,
  }))

  const profilePercent = categories.find(c => c.id === 'profile')?.percent ?? 0
  const primaryArtist = getPrimaryArtist(ctx)

  let contextualPrompt: string | null = null
  if (!isEssentialSetupComplete(ctx)) {
    contextualPrompt = tx.playbookPromptEssential
  } else if (profilePercent < 100 && !runPlaybookCheck('has_social_links', ctx)) {
    contextualPrompt = tx.playbookPromptSocial.replace('{percent}', String(profilePercent))
  } else if (!runPlaybookCheck('has_newsletter_draft', ctx) && !runPlaybookCheck('has_subscriber', ctx)) {
    contextualPrompt = tx.playbookPromptNewsletter
  } else if (profilePercent < 100) {
    contextualPrompt = tx.playbookPromptProfile.replace('{percent}', String(profilePercent))
  }

  return {
    overallPercent,
    categories,
    milestones,
    nextTask,
    growthTask,
    releaseTask,
    contextualPrompt,
    primaryArtist,
    essentialSetupComplete: isEssentialSetupComplete(ctx),
  }
}
