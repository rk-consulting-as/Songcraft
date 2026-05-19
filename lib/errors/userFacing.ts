export type UserFacingErrorCode =
  | 'not_authenticated'
  | 'forbidden'
  | 'not_found'
  | 'permission_denied'
  | 'migration_missing'
  | 'upload_failed'
  | 'stripe_not_configured'
  | 'resend_not_configured'
  | 'ai_not_configured'
  | 'api_failed'
  | 'private_content'
  | 'plan_limit'
  | 'unknown'

const ERROR_PATTERNS: Array<{ pattern: RegExp; code: UserFacingErrorCode }> = [
  { pattern: /not_authenticated|unauthorized|login/i, code: 'not_authenticated' },
  { pattern: /forbidden|permission|not_approved_member/i, code: 'permission_denied' },
  { pattern: /not_found|404/i, code: 'not_found' },
  { pattern: /does not exist|schema cache|PGRST205|42P01|migration/i, code: 'migration_missing' },
  { pattern: /upload_failed|storage/i, code: 'upload_failed' },
  { pattern: /stripe/i, code: 'stripe_not_configured' },
  { pattern: /resend/i, code: 'resend_not_configured' },
  { pattern: /ai_not_configured|anthropic|openai/i, code: 'ai_not_configured' },
  { pattern: /public_hidden|admin_hidden|private/i, code: 'private_content' },
  { pattern: /limit_reached|plan|pro/i, code: 'plan_limit' },
]

export function classifyError(raw: string | undefined | null): UserFacingErrorCode {
  const s = String(raw || '').toLowerCase()
  if (!s) return 'unknown'
  for (const { pattern, code } of ERROR_PATTERNS) {
    if (pattern.test(s)) return code
  }
  return 'api_failed'
}

export function getUserFacingMessage(
  code: UserFacingErrorCode,
  tx: Record<string, string>
): string {
  const key = `error_${code}` as keyof typeof tx
  return tx[key] || tx.error_unknown || 'Something went wrong. Please try again.'
}

export function mapApiErrorToUserMessage(
  error: unknown,
  tx: Record<string, string>
): { code: UserFacingErrorCode; message: string } {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'error' in error
        ? String((error as { error: string }).error)
        : String(error)
  const code = classifyError(raw)
  return { code, message: getUserFacingMessage(code, tx) }
}
