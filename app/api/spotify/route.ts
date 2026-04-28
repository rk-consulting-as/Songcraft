import { NextRequest, NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ artists: [] })

  try {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`
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
