-- Phase 51: Song Creation Studio — Song DNA + detailed Suno prompts
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS song_dna jsonb,
  ADD COLUMN IF NOT EXISTS suno_prompt_detailed text,
  ADD COLUMN IF NOT EXISTS proposal_meta jsonb;

COMMENT ON COLUMN songs.song_dna IS '0-10 DNA dimensions: energy, darkness, emotion, storytelling, singalong, radioAppeal, cinematicFeel';
COMMENT ON COLUMN songs.proposal_meta IS 'Generator metadata: genre, mood from creation studio';
