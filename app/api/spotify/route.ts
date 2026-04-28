import { NextRequest, NextResponse } from 'next/server'

let cachedToken: { token: string; expires: number } | null = null

async function getSpotifyToken() {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.token
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ artists: [] })

  try {
    const token = await getSpotifyToken()
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    const artists = (data.artists?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      followers: a.followers?.total || 0,
      genres: a.genres || [],
      popularity: a.popularity || 0,
      image: a.images?.[0]?.url || null,
      smallImage: a.images?.[2]?.url || a.images?.[1]?.url || null,
      spotifyUrl: a.external_urls?.spotify || null,
      monthlyListeners: null,
    }))
    return NextResponse.json({ artists })
  } catch (e) {
    return NextResponse.json({ artists: [], error: 'Spotify search failed' })
  }
}
