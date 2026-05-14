// Fixed set of creator roles for the Nordic catalog. Multi-select.
// Order is the recommended display order.
export const CREATOR_ROLES: Array<{ key: string; emoji: string; labelKey: string }> = [
  { key: 'artist',         emoji: '🎤', labelKey: 'roleArtist' },
  { key: 'vocalist',       emoji: '🎙️', labelKey: 'roleVocalist' },
  { key: 'songwriter',     emoji: '✍️', labelKey: 'roleSongwriter' },
  { key: 'producer',       emoji: '🎛️', labelKey: 'roleProducer' },
  { key: 'beatmaker',      emoji: '🥁', labelKey: 'roleBeatmaker' },
  { key: 'instrumentalist',emoji: '🎸', labelKey: 'roleInstrumentalist' },
  { key: 'mixer',          emoji: '🎚️', labelKey: 'roleMixer' },
  { key: 'mastering',      emoji: '🎧', labelKey: 'roleMastering' },
  { key: 'manager',        emoji: '📋', labelKey: 'roleManager' },
  { key: 'booking',        emoji: '📅', labelKey: 'roleBooking' },
  { key: 'label',          emoji: '🏷️', labelKey: 'roleLabel' },
  { key: 'an_r',           emoji: '👀', labelKey: 'roleAnR' },
]

export const CREATOR_LANGUAGES: Array<{ key: string; flag: string; labelKey: string }> = [
  { key: 'no', flag: '🇳🇴', labelKey: 'creationLangNo' },
  { key: 'en', flag: '🇬🇧', labelKey: 'creationLangEn' },
  { key: 'sv', flag: '🇸🇪', labelKey: 'creationLangSv' },
  { key: 'da', flag: '🇩🇰', labelKey: 'creationLangDa' },
  { key: 'fi', flag: '🇫🇮', labelKey: 'creationLangFi' },
  { key: 'is', flag: '🇮🇸', labelKey: 'creationLangIs' },
]

// Suggested Nordic locations for autocomplete. Free-text still allowed.
export const NORDIC_LOCATIONS = [
  'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand', 'Tromsø', 'Drammen',
  'Stockholm', 'Göteborg', 'Malmö', 'Uppsala',
  'København', 'Aarhus', 'Odense', 'Aalborg',
  'Helsinki', 'Tampere', 'Turku',
  'Reykjavík',
]
