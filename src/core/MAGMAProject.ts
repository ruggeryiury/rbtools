export type MAGMAAutogenOptions = 'Default' | 'AgressiveMetal' | 'ArenaRock' | 'DarkHeavyRock' | 'DustyVintage' | 'EdgyProgRock' | 'FeelGoodPopRock' | 'GaragePunkRock' | 'PsychJamRock' | 'SlowJam' | 'SynthPop'

export interface MAGMAProjectSongData {
  /**
   * The autogen theme you want to use in your project, it will be used
   * when there's no `VENUE` authored. Default is `ArenoRock`.
   */
  autogenTheme?: MAGMAAutogenOptions
  /**
   * The version of the song project, default is `1`.
   */
  releaseVer?: number
  /**
   * The date where you released the song. Default is the current time.
   */
  releasedDate?: string
  /**
   * The date where you last updated the song. Default is the current time.
   */
  updateDate?: string
  /**
   * Default is `null`.
   */
  hasLipsyncFiles?: true | 2 | 3 | null
  /**
   * Default is `true`.
   */
  hasSeparated2xWavFiles?: boolean
  magmaPath?: string
  songsProjectRootFolderPath?: string
  destPath?: string
  songFolderName?: string
  dryVox1Name?: string
  dryVox2Name?: string
  dryVox3Name?: string
  albumArtName?: string
  albumArtNamePNG?: string
  kickWavName?: string
  kick2xWavName?: string
  snareWavName?: string
  drumKitWavName?: string
  drumKit2xWavName?: string
  drumsWavName?: string
  drums2xWavName?: string
  bassWavName?: string
  guitarWavName?: string
  vocalsWavName?: string
  keysWavName?: string
  backingWavName?: string
  crowdWavName?: string
  midiFileName?: string
  conFilePackageName?: string
  conFilePackageDesc?: string
}
