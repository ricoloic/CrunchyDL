export interface CrunchySeason {
  identifier: string
  description: string
  is_simulcast: boolean
  subtitle_locales: Array<string>
  series_id: string
  id: string
  audio_locales: Array<string>
  title: string
  versions: Array<{
    audio_locale: string
    guid: string
    original: boolean
    variant: string
  }>
  season_sequence_number: number
  season_number: number
  maturity_ratings: Array<string>
  mature_blocked: boolean
  channel_id: string
  is_subbed: boolean
  audio_locale: string
  season_display_number: string
  is_complete: boolean
  season_tags: Array<string>
  is_mature: boolean
  is_dubbed: boolean
  slug_title: string
  availability_notes: string
  number_of_episodes: boolean
}

export interface CrunchySeasons extends Array<CrunchySeason> {}
