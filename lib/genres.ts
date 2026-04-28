// Standardized music genres based on Spotify/MusicBrainz/AllMusic taxonomy
export const MUSIC_GENRES: { category: string; genres: string[] }[] = [
  {
    category: 'Rock',
    genres: [
      'Rock', 'Classic Rock', 'Hard Rock', 'Soft Rock', 'Indie Rock',
      'Alternative Rock', 'Progressive Rock', 'Psychedelic Rock', 'Punk Rock',
      'Post-Punk', 'Garage Rock', 'Glam Rock', 'Grunge', 'Math Rock',
      'Shoegaze', 'Noise Rock', 'Stoner Rock', 'Desert Rock',
    ],
  },
  {
    category: 'Metal',
    genres: [
      'Metal', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash Metal',
      'Power Metal', 'Doom Metal', 'Gothic Metal', 'Folk Metal', 'Viking Metal',
      'Symphonic Metal', 'Nu-Metal', 'Metalcore', 'Deathcore', 'Sludge Metal',
    ],
  },
  {
    category: 'Country',
    genres: [
      'Country', 'Classic Country', 'Country Pop', 'Country Rock',
      'Alt-Country', 'Americana', 'Bluegrass', 'Outlaw Country',
      'Dark Country', 'Swamp Country', 'Country Blues', 'Folk Country',
      'Texas Country', 'New Country', 'Country Soul',
    ],
  },
  {
    category: 'Blues',
    genres: [
      'Blues', 'Delta Blues', 'Chicago Blues', 'Electric Blues',
      'Swamp Blues', 'Blues Rock', 'Soul Blues', 'Rhythm and Blues',
      'Jump Blues', 'Texas Blues', 'Acoustic Blues',
    ],
  },
  {
    category: 'Pop',
    genres: [
      'Pop', 'Indie Pop', 'Dream Pop', 'Synth-Pop', 'Art Pop',
      'Chamber Pop', 'Electropop', 'Teen Pop', 'K-Pop', 'J-Pop',
      'Dance Pop', 'Folk Pop', 'Baroque Pop', 'Power Pop',
    ],
  },
  {
    category: 'Electronic',
    genres: [
      'Electronic', 'EDM', 'House', 'Deep House', 'Tech House',
      'Techno', 'Trance', 'Drum and Bass', 'Dubstep', 'Ambient',
      'IDM', 'Downtempo', 'Trip-Hop', 'Synthwave', 'Retrowave',
      'Vaporwave', 'Lo-Fi', 'Chillwave', 'Future Bass', 'Electronica',
    ],
  },
  {
    category: 'Hip-Hop / R&B',
    genres: [
      'Hip-Hop', 'Rap', 'Trap', 'Drill', 'Boom Bap', 'Conscious Hip-Hop',
      'Cloud Rap', 'Lo-Fi Hip-Hop', 'R&B', 'Contemporary R&B', 'Neo Soul',
      'Soul', 'Funk', 'Gospel', 'Afrobeats', 'Afro-Pop',
    ],
  },
  {
    category: 'Jazz',
    genres: [
      'Jazz', 'Bebop', 'Smooth Jazz', 'Jazz Fusion', 'Free Jazz',
      'Cool Jazz', 'Latin Jazz', 'Acid Jazz', 'Nu Jazz', 'Swing',
      'Big Band', 'Vocal Jazz', 'Contemporary Jazz',
    ],
  },
  {
    category: 'Folk / Singer-Songwriter',
    genres: [
      'Folk', 'Contemporary Folk', 'Acoustic', 'Singer-Songwriter',
      'Indie Folk', 'Folk Rock', 'Celtic Folk', 'Nordic Folk',
      'Traditional Folk', 'Protest Folk', 'Chamber Folk',
    ],
  },
  {
    category: 'Classical',
    genres: [
      'Classical', 'Orchestral', 'Opera', 'Chamber Music', 'Baroque',
      'Romantic', 'Contemporary Classical', 'Neoclassical', 'Minimalist',
      'Film Score', 'Choral',
    ],
  },
  {
    category: 'World',
    genres: [
      'World Music', 'Reggae', 'Ska', 'Dancehall', 'Latin', 'Salsa',
      'Bossa Nova', 'Samba', 'Flamenco', 'Celtic', 'Nordic',
      'African', 'Middle Eastern', 'Indian Classical', 'Bollywood',
    ],
  },
  {
    category: 'Other',
    genres: [
      'Experimental', 'Avant-Garde', 'New Age', 'Meditation',
      'Soundtrack', 'Instrumental', 'Acoustic', 'A Cappella',
      'Christian', 'Gospel', 'Worship', 'Comedy', 'Spoken Word',
    ],
  },
]

export const ALL_GENRES = MUSIC_GENRES.flatMap(g => g.genres).sort()

export function searchGenres(query: string): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return ALL_GENRES.filter(g => g.toLowerCase().includes(q)).slice(0, 10)
}
