export type Lang = 'no' | 'en'

export const t = {
  no: {
    // General
    save: 'Lagre',
    cancel: 'Avbryt',
    delete: 'Slett',
    edit: 'Rediger',
    close: 'Lukk',
    loading: 'Laster...',
    saving: 'Lagrer...',
    generating: 'Genererer...',
    generate: 'Generer',
    regenerate: 'Regenerer',
    copy: 'Kopier',
    copied: 'Kopiert!',
    yes: 'Ja',
    no: 'Nei',
    optional: 'valgfritt',
    back: 'Tilbake',
    logout: 'Logg ut',
    login: 'Logg inn',
    signup: 'Opprett konto',
    settings: 'Innstillinger',
    language: 'Språk',

    // Auth
    email: 'E-post',
    password: 'Passord',
    emailPlaceholder: 'din@epost.no',
    passwordPlaceholder: '••••••••',
    newUser: 'Ny bruker?',
    hasAccount: 'Har du allerede konto?',
    confirmEmail: 'Sjekk e-posten din for å bekrefte kontoen!',
    loginSubtitle: 'AI MUSIC STUDIO',

    // Dashboard
    dashboard: 'Dashboard',
    artists: 'Artister',
    totalSongs: 'Låter totalt',
    activeProjects: 'Aktive prosjekter',
    yourArtists: 'Dine artister',
    newArtist: '+ Ny artist',
    noArtists: 'Ingen artister enda. Opprett din første!',
    openArtist: 'Åpne →',
    songs: 'låter',
    song: 'låt',

    // Artist form
    artistName: 'Artistnavn',
    artistNamePlaceholder: 'Eks: Artist navn',
    genre: 'Sjanger',
    genrePlaceholder: 'Eks: Pop, Country, Hip-hop',
    description: 'Beskrivelse',
    descriptionPlaceholder: 'Litt om artisten, stil, målgruppe...',
    songStructure: 'Låtstruktur / produksjonsprofil',
    songStructurePlaceholder: 'Beskriv hvordan låter typisk bygges opp for denne artisten.\nEks: Intro (8 takter) → Vers → Pre-chorus → Refreng → Vers 2 → Refreng → Bro → Outro\nTempo: 120-140 BPM, mørk og drømmende stemning, gjerne med hav-metaforer...',
    songStructureHint: 'AI bruker dette som standard underlag for å generere titler, tekster og Suno-prompts.',
    editArtist: 'Rediger artist',
    createArtist: 'Opprett artist',
    deleteArtist: 'Slett artist',
    confirmDeleteArtist: 'Slette denne artisten og alle tilhørende låter?',

    // Artist page
    generateWithAI: '+ Generer låter med AI',
    aiGenerator: 'AI Låt-generator',
    describeTheme: 'BESKRIV TEMA / KONSEPT',
    themePlaceholder: 'Eks: 3 låter i swamp rock country-tema som handler om tøffe tider, at en ikke må gi opp. Mørk stemning men med håp i refrenget.',
    numberOfSongs: 'ANTALL LÅTER',
    generateProposals: 'Generer {n} låtforslag',
    planningText: 'Planlegger {n} låter...',
    proposalsLabel: 'FORSLAG — REDIGER FØR DU LAGRER',
    saveAll: 'Lagre alle {n} låter',
    noSongs: 'Ingen låter enda. La AI planlegge dem for deg!',
    createFirstSong: '+ Opprett første låt',
    useArtistProfile: 'Bruk artistprofil som underlag',
    useArtistProfileHint: 'AI tar hensyn til sjanger, beskrivelse og låtstruktur',
    ignoreProfile: 'Ignorer profil for denne genereringen',
    songsCount: 'Låter',

    // Status
    draft: 'Utkast',
    inProgress: 'Pågår',
    complete: 'Ferdig',
    released: 'Utgitt',

    // Spotify import
    importFromSpotify: '🎵 Importer fra Spotify',
    importTitle: 'Importer låter fra Spotify',
    importSubtitle: 'Top 10 mest populære for denne artisten',
    importSelectAll: 'Velg alle',
    importDeselectAll: 'Fjern alle',
    importSelected: 'Importer {n} valgte',
    importNoTracks: 'Fant ingen tracks på Spotify for denne artisten.',
    importLoading: 'Henter låter fra Spotify...',
    importing: 'Importerer...',
    importAlreadyImported: 'Allerede importert',
    importPopularityHint: 'Popularity er Spotifys relative score 0-100, ikke ekte stream-tall',
    importByUrlLabel: 'IMPORTER VIA URL',
    importByUrlPlaceholder: 'Lim inn Spotify-link til en sang',
    importByUrlFetch: 'Hent',
    importByUrlImport: 'Importer',
    importByUrlArtistMismatch: 'Denne sangens artist matcher ikke den linkede Spotify-profilen — sjekk at det er riktig sang.',
    importNoSpotifyArtist: 'Koble denne artisten til en Spotify-profil først for å importere låter.',
    spotifyPopularity: 'Popularity',

    // AI provider
    aiProviderLabel: 'AI:',

    // Cover image generation
    coverImageGenerate: '🎨 Generer cover-bilde',
    coverImageRegenerate: 'Generer nytt cover-bilde',
    coverImageGenerating: 'Genererer bilde...',
    coverImageHint: 'Bruker OpenAI gpt-image-1 fra prompten over',

    // Albums
    albums: 'Album',
    newAlbum: '+ Nytt album',
    editAlbum: 'Rediger album',
    deleteAlbum: 'Slett album',
    noAlbums: 'Ingen album enda. Opprett et album og legg sangene inn der.',
    albumTitle: 'Albumtittel',
    albumTitlePlaceholder: 'Eks: Greatest hits',
    albumDescription: 'Beskrivelse',
    albumDescriptionPlaceholder: 'Konsept, liner notes...',
    albumReleaseDate: 'Utgivelsesdato',
    albumCoverUrl: 'Cover-bilde URL',
    assignToAlbum: 'Tilordne album',
    singleNoAlbum: 'Single (ingen)',
    albumCoverAi: 'Generer cover med AI',
    albumCoverPromptGenerate: '✨ Lag prompt med AI',
    albumCoverPromptPlaceholder: 'Beskriv hvordan album-coveret skal se ut, eller la AI lage en prompt fra album-tittel og artistinfo over.',

    // Filter / search on artist page
    filterAll: 'Alle',
    filterAllAlbums: 'Alle album',
    filterSinglesOnly: 'Kun singles',
    filterSearchPlaceholder: 'Søk i sanger…',
    filterClear: 'Nullstill',
    filterNoMatch: 'Ingen sanger matcher filtrene.',
    dragToReorder: 'Dra for å endre rekkefølge',
    moveUp: 'Flytt opp',
    moveDown: 'Flytt ned',

    // Lyrics extras
    copyClean: 'Kopier ren tekst',
    copyCleanHint: 'Kopierer kun sangteksten — uten [Vers], (Refreng), markdown osv.',
    historyButton: 'Versjoner',
    historyTitle: 'Tidligere versjoner av sangteksten',
    historyHint: 'Se og gjenopprett tidligere AI-genererte versjoner',
    historyVersion: 'Versjon',
    historyCurrent: 'gjeldende',
    historyEmpty: 'Ingen lagrede versjoner.',
    historyRestore: 'Gjenopprett',
    historyRestoreConfirm: 'Erstatt nåværende sangtekst med denne versjonen?',

    // Global search
    searchPlaceholder: 'Søk på artister og sanger…',
    searchClear: 'Tøm søk',
    searching: 'Søker…',
    searchNoResults: 'Ingen treff.',
    searchArtistsLabel: 'ARTISTER',
    searchSongsLabel: 'SANGER',

    // Song tabs
    lyrics: 'Sangtekst',
    suno: 'Suno',
    captions: 'Captions',
    cover: 'Cover',
    media: 'Media',
    publish: 'Publiser',

    // Lyrics tab
    instructions: 'INSTRUKSER',
    instructionsPlaceholder: 'Beskriv sangen: tema, stemning, sjanger, historien...',
    readyToGenerate: 'Klar til å generere!',
    readyHint: 'AI-instrukser er lagt inn. Trykk for å lage sangteksten.',
    generateNow: '✍️ Generer nå',
    generateLyrics: '✍️ Generer sangtekst',
    regenerateLyrics: '↻ Generer ny',
    lyricsLabel: 'SANGTEKST',
    refineHint: 'Juster: Eks: Gjør refrenget mer fengende...',
    refine: 'Juster',
    useProfileForLyrics: 'Bruk artistprofil',
    useProfileHint: 'Sjanger, beskrivelse og låtstruktur brukes som kontekst',

    // Suno tab
    sunoTitle: 'Suno AI Prompt',
    sunoNoLyrics: '⚠️ Generer sangteksten først.',
    sunoGenerate: '🤖 Generer Suno prompt',
    sunoRegenerate: '↻ Generer ny',
    sunoLabel: 'SUNO PROMPT (ENGELSK)',
    sunoCopy: '📋 Kopier til Suno',
    sunoHint: 'Gå til suno.ai → Create → Custom → lim inn sangteksten under "Lyrics" og prompten under "Style of Music".',

    // Captions tab
    captionsTitle: 'Social Media Captions',
    toneLabel: 'TONE/STIL',
    tonePlaceholder: 'Eks: humoristisk, sentimental, hype...',

    // Cover tab
    coverTitle: 'Cover',
    uploadCover: 'LAST OPP COVERBILDE',
    coverStyleLabel: 'ØNSKET STIL',
    coverStylePlaceholder: 'Eks: fotorealistisk, anime, minimalistisk...',
    generateCoverPrompt: '🖼️ Generer AI image prompt',
    coverPromptLabel: 'IMAGE PROMPT (ENGELSK)',
    coverHint: 'Anbefalt: 1:1 for album cover.',

    // Media tab
    mediaTitle: 'Media & lenker',
    addLink: 'LEGG TIL LENKE',
    labelPlaceholder: 'Etikett (valgfritt)',
    noLinks: 'Ingen lenker enda.',

    // Publish tab
    publishTitle: 'Publiser innhold',
    wordpress: 'WordPress blogginnlegg',
    facebook: 'Facebook-innlegg',
    instagram: 'Instagram-innlegg',
    press: 'Pressemelding',
  },

  en: {
    // General
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    saving: 'Saving...',
    generating: 'Generating...',
    generate: 'Generate',
    regenerate: 'Regenerate',
    copy: 'Copy',
    copied: 'Copied!',
    yes: 'Yes',
    no: 'No',
    optional: 'optional',
    back: 'Back',
    logout: 'Log out',
    login: 'Log in',
    signup: 'Create account',
    settings: 'Settings',
    language: 'Language',

    // Auth
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '••••••••',
    newUser: 'New user?',
    hasAccount: 'Already have an account?',
    confirmEmail: 'Check your email to confirm your account!',
    loginSubtitle: 'AI MUSIC STUDIO',

    // Dashboard
    dashboard: 'Dashboard',
    artists: 'Artists',
    totalSongs: 'Total songs',
    activeProjects: 'Active projects',
    yourArtists: 'Your artists',
    newArtist: '+ New artist',
    noArtists: 'No artists yet. Create your first!',
    openArtist: 'Open →',
    songs: 'songs',
    song: 'song',

    // Artist form
    artistName: 'Artist name',
    artistNamePlaceholder: 'E.g. Artist name',
    genre: 'Genre',
    genrePlaceholder: 'E.g. Pop, Country, Hip-hop',
    description: 'Description',
    descriptionPlaceholder: 'About the artist, style, audience...',
    songStructure: 'Song structure / production profile',
    songStructurePlaceholder: 'Describe how songs are typically structured for this artist.\nE.g. Intro (8 bars) → Verse → Pre-chorus → Chorus → Verse 2 → Chorus → Bridge → Outro\nTempo: 120-140 BPM, dark and dreamy mood, ocean metaphors...',
    songStructureHint: 'AI uses this as a default context for generating titles, lyrics and Suno prompts.',
    editArtist: 'Edit artist',
    createArtist: 'Create artist',
    deleteArtist: 'Delete artist',
    confirmDeleteArtist: 'Delete this artist and all their songs?',

    // Artist page
    generateWithAI: '+ Generate songs with AI',
    aiGenerator: 'AI Song Generator',
    describeTheme: 'DESCRIBE THEME / CONCEPT',
    themePlaceholder: 'E.g. 3 songs in a swamp rock country theme about tough times and not giving up. Dark mood but hopeful in the chorus.',
    numberOfSongs: 'NUMBER OF SONGS',
    generateProposals: 'Generate {n} song proposals',
    planningText: 'Planning {n} songs...',
    proposalsLabel: 'PROPOSALS — EDIT BEFORE SAVING',
    saveAll: 'Save all {n} songs',
    noSongs: 'No songs yet. Let AI plan them for you!',
    createFirstSong: '+ Create first song',
    useArtistProfile: 'Use artist profile as context',
    useArtistProfileHint: 'AI considers genre, description and song structure',
    ignoreProfile: 'Ignore profile for this generation',
    songsCount: 'Songs',

    // Status
    draft: 'Draft',
    inProgress: 'In progress',
    complete: 'Complete',
    released: 'Released',

    // Spotify import
    importFromSpotify: '🎵 Import from Spotify',
    importTitle: 'Import songs from Spotify',
    importSubtitle: 'Top 10 most popular tracks for this artist',
    importSelectAll: 'Select all',
    importDeselectAll: 'Deselect all',
    importSelected: 'Import {n} selected',
    importNoTracks: 'No tracks found on Spotify for this artist.',
    importLoading: 'Fetching songs from Spotify...',
    importing: 'Importing...',
    importAlreadyImported: 'Already imported',
    importPopularityHint: 'Popularity is Spotify\'s relative 0-100 score, not real stream counts',
    importByUrlLabel: 'IMPORT VIA URL',
    importByUrlPlaceholder: 'Paste a Spotify track link',
    importByUrlFetch: 'Fetch',
    importByUrlImport: 'Import',
    importByUrlArtistMismatch: 'This track\'s artist does not match the linked Spotify profile — make sure it\'s the right song.',
    importNoSpotifyArtist: 'Link this artist to a Spotify profile first to import songs.',
    spotifyPopularity: 'Popularity',

    // AI provider
    aiProviderLabel: 'AI:',

    // Cover image generation
    coverImageGenerate: '🎨 Generate cover image',
    coverImageRegenerate: 'Regenerate cover image',
    coverImageGenerating: 'Generating image...',
    coverImageHint: 'Uses OpenAI gpt-image-1 from the prompt above',

    // Albums
    albums: 'Albums',
    newAlbum: '+ New album',
    editAlbum: 'Edit album',
    deleteAlbum: 'Delete album',
    noAlbums: 'No albums yet. Create an album and assign songs to it.',
    albumTitle: 'Album title',
    albumTitlePlaceholder: 'E.g. Greatest hits',
    albumDescription: 'Description',
    albumDescriptionPlaceholder: 'Concept, liner notes...',
    albumReleaseDate: 'Release date',
    albumCoverUrl: 'Cover image URL',
    assignToAlbum: 'Assign to album',
    singleNoAlbum: 'Single (none)',
    albumCoverAi: 'Generate cover with AI',
    albumCoverPromptGenerate: '✨ Generate prompt with AI',
    albumCoverPromptPlaceholder: 'Describe how the album cover should look, or let AI create a prompt from the album title and artist info above.',

    // Filter / search on artist page
    filterAll: 'All',
    filterAllAlbums: 'All albums',
    filterSinglesOnly: 'Singles only',
    filterSearchPlaceholder: 'Search songs…',
    filterClear: 'Clear',
    filterNoMatch: 'No songs match the filters.',
    dragToReorder: 'Drag to reorder',
    moveUp: 'Move up',
    moveDown: 'Move down',

    // Lyrics extras
    copyClean: 'Copy clean text',
    copyCleanHint: 'Copies just the lyrics — no [Verse], (Chorus), markdown etc.',
    historyButton: 'Versions',
    historyTitle: 'Previous lyric versions',
    historyHint: 'View and restore previous AI-generated versions',
    historyVersion: 'Version',
    historyCurrent: 'current',
    historyEmpty: 'No saved versions.',
    historyRestore: 'Restore',
    historyRestoreConfirm: 'Replace current lyrics with this version?',

    // Global search
    searchPlaceholder: 'Search artists and songs…',
    searchClear: 'Clear search',
    searching: 'Searching…',
    searchNoResults: 'No matches.',
    searchArtistsLabel: 'ARTISTS',
    searchSongsLabel: 'SONGS',

    // Song tabs
    lyrics: 'Lyrics',
    suno: 'Suno',
    captions: 'Captions',
    cover: 'Cover',
    media: 'Media',
    publish: 'Publish',

    // Lyrics tab
    instructions: 'INSTRUCTIONS',
    instructionsPlaceholder: 'Describe the song: theme, mood, genre, story...',
    readyToGenerate: 'Ready to generate!',
    readyHint: 'AI instructions are set. Click to generate lyrics.',
    generateNow: '✍️ Generate now',
    generateLyrics: '✍️ Generate lyrics',
    regenerateLyrics: '↻ Regenerate',
    lyricsLabel: 'LYRICS',
    refineHint: 'Adjust: E.g. Make the chorus more catchy...',
    refine: 'Refine',
    useProfileForLyrics: 'Use artist profile',
    useProfileHint: 'Genre, description and song structure used as context',

    // Suno tab
    sunoTitle: 'Suno AI Prompt',
    sunoNoLyrics: '⚠️ Generate lyrics first.',
    sunoGenerate: '🤖 Generate Suno prompt',
    sunoRegenerate: '↻ Regenerate',
    sunoLabel: 'SUNO PROMPT (ENGLISH)',
    sunoCopy: '📋 Copy to Suno',
    sunoHint: 'Go to suno.ai → Create → Custom → paste lyrics under "Lyrics" and the prompt under "Style of Music".',

    // Captions tab
    captionsTitle: 'Social Media Captions',
    toneLabel: 'TONE/STYLE',
    tonePlaceholder: 'E.g. humorous, sentimental, hype...',

    // Cover tab
    coverTitle: 'Cover',
    uploadCover: 'UPLOAD COVER IMAGE',
    coverStyleLabel: 'DESIRED STYLE',
    coverStylePlaceholder: 'E.g. photorealistic, anime, minimalist...',
    generateCoverPrompt: '🖼️ Generate AI image prompt',
    coverPromptLabel: 'IMAGE PROMPT (ENGLISH)',
    coverHint: 'Recommended: 1:1 for album cover.',

    // Media tab
    mediaTitle: 'Media & links',
    addLink: 'ADD LINK',
    labelPlaceholder: 'Label (optional)',
    noLinks: 'No links yet.',

    // Publish tab
    publishTitle: 'Publish content',
    wordpress: 'WordPress blog post',
    facebook: 'Facebook post',
    instagram: 'Instagram post',
    press: 'Press release',
  },
}

export function useLang(): Lang {
  if (typeof window === 'undefined') return 'no'
  return (localStorage.getItem('songcraft_lang') as Lang) || 'no'
}

export function setLang(lang: Lang) {
  localStorage.setItem('songcraft_lang', lang)
  window.location.reload()
}
