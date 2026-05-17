import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    enabled: !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL,
  })
}
