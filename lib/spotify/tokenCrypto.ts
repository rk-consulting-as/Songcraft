import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function encryptionKey(): Buffer {
  const raw = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!raw) throw new Error('spotify_token_encryption_not_configured')
  const buf = Buffer.from(raw.trim(), raw.trim().length === 64 && /^[0-9a-f]+$/i.test(raw.trim()) ? 'hex' : 'utf8')
  if (buf.length < 32) {
    return Buffer.concat([buf, Buffer.alloc(32)]).subarray(0, 32)
  }
  return buf.subarray(0, 32)
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid_encrypted_token')
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}

export function signOAuthState(payload: string): string {
  const secret = process.env.SPOTIFY_CLIENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-state-secret'
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyOAuthState(state: string): { valid: boolean; payload?: string } {
  const idx = state.lastIndexOf('.')
  if (idx < 0) return { valid: false }
  const payload = state.slice(0, idx)
  const sig = state.slice(idx + 1)
  const secret = process.env.SPOTIFY_CLIENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-state-secret'
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  try {
    const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    return ok ? { valid: true, payload } : { valid: false }
  } catch {
    return { valid: false }
  }
}
