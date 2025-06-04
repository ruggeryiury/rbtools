import { BinaryWriter, FilePath, isAbsolute, resolve } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { DTAIO, formatStringFromDTA, genAudioFileStructure, rankCalculator, type RB3CompatibleDTAFile } from '../lib.exports'

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

export type MAGMAPathMapperReturnObject = Record<'magmaPath' | 'songsProjectRootFolderPath' | 'songFolderPath' | 'monoBlank' | 'stereoBlank' | 'dryVoxBlank' | 'midiFilePath' | 'albumArtPathPNG' | 'rbaFilePath' | 'backingWavPath' | 'defaultMAGMAArt' | 'rbprojFilePath' | 'c3FilePath', FilePath> & Record<'dryVox1Path' | 'dryVox2Path' | 'dryVox3Path' | 'albumArtPath' | 'kickWavPath' | 'snareWavPath' | 'drumKitWavPath' | 'bassWavPath' | 'guitarWavPath' | 'vocalsWavPath' | 'keysWavPath', FilePath | undefined>

/**
 * A class to create MAGMA files based on a parsed song object.
 * - - - -
 */
export class MAGMAProject {
  song: RB3CompatibleDTAFile
  options: Required<MAGMAProjectSongData>

  static readonly defaultMAGMAProjectOptions: Required<MAGMAProjectSongData> = {
    autogenTheme: 'ArenaRock',
    releaseVer: 1,
    releasedDate: new Date().toDateString(),
    updateDate: new Date().toDateString(),
    hasLipsyncFiles: null,
    hasSeparated2xWavFiles: true,
    magmaPath: '',
    songsProjectRootFolderPath: '',
    destPath: process.env.USERPROFILE ? resolve(process.env.USERPROFILE, 'Desktop/{{songname}}.rba') : resolve('{{songname}}.rba'),
    songFolderName: '{{songname}}',
    albumArtName: 'gen/{{songname}}_keep_x256.bmp',
    albumArtNamePNG: 'gen/{{songname}}_keep.png',
    midiFileName: '{{songname}}.mid',
    dryVox1Name: 'gen/HARM1.wav',
    dryVox2Name: 'gen/HARM2.wav',
    dryVox3Name: 'gen/HARM3.wav',
    kickWavName: 'kick.wav',
    kick2xWavName: 'kick2x.wav',
    snareWavName: 'snare.wav',
    drumKitWavName: 'kit.wav',
    drumKit2xWavName: 'kit2x.wav',
    drumsWavName: 'drums.wav',
    drums2xWavName: 'drums2x.wav',
    bassWavName: 'bass.wav',
    guitarWavName: 'guitar.wav',
    vocalsWavName: 'vocals.wav',
    keysWavName: 'keys.wav',
    backingWavName: 'backing.wav',
    crowdWavName: 'crowd.wav',
    conFilePackageName: '{{artist}} - {{title}}',
    conFilePackageDesc: 'Created with Magma: C3 Roks Edition. For more great customs authoring tools, visit forums.customscreators.com',
  }

  /**
   * @param {RB3CompatibleDTAFile} song A parsed song object.
   */
  constructor(song: RB3CompatibleDTAFile) {
    const { magma, ...songValues } = song
    this.song = songValues
    this.options = setDefaultOptions<Required<MAGMAProjectSongData>>(MAGMAProject.defaultMAGMAProjectOptions, magma)
  }

  mapAllOptionsPaths(): MAGMAPathMapperReturnObject {
    const song = this.song
    const options = this.options

    let magmaPath: FilePath
    if (!process.env.MAGMA_PATH && !options.magmaPath) throw new Error('Required MAGMA Path not provided. You can either declare it on an .env file (using key value "MAGMA_PATH") or passing as a property on this instantiated class options parameter.')
    if (process.env.MAGMA_PATH) magmaPath = FilePath.of(process.env.MAGMA_PATH)
    else magmaPath = FilePath.of(options.magmaPath)

    let songsProjectRootFolderPath: FilePath
    if (!process.env.SONGS_PROJECT_ROOT_PATH && !options.songsProjectRootFolderPath) throw new Error('Required Songs project folder not provided. You can either declare it on an .env file (using key value "SONGS_PROJECT_ROOT_PATH") or passing as a property on this instantiated class options parameter.')
    if (process.env.SONGS_PROJECT_ROOT_PATH) songsProjectRootFolderPath = FilePath.of(process.env.SONGS_PROJECT_ROOT_PATH)
    else songsProjectRootFolderPath = FilePath.of(options.songsProjectRootFolderPath)

    const rbprojFilePath = FilePath.of(formatStringFromDTA(song, options.destPath)).changeFileExt('.rbproj')
    const c3FilePath = FilePath.of(formatStringFromDTA(song, options.destPath)).changeFileExt('.c3')

    const monoBlank = FilePath.of(magmaPath.path, `audio/mono44.wav`)
    const stereoBlank = FilePath.of(magmaPath.path, `audio/stereo44.wav`)
    const dryVoxBlank = FilePath.of(magmaPath.path, `audio/blank_dryvox.wav`)
    const defaultMAGMAArt = FilePath.of(magmaPath.path, `default.bmp`)

    let rbaFilePath = FilePath.of(formatStringFromDTA(song, options.destPath))
    rbaFilePath = rbaFilePath.ext.endsWith('.rba') ? rbaFilePath : rbaFilePath.changeFileExt('.rba')

    const songFolderPath = FilePath.of(songsProjectRootFolderPath.path, formatStringFromDTA(song, options.songFolderName))

    const albumArtPath: FilePath | undefined = song.album_art ? (isAbsolute(options.albumArtName) ? FilePath.of(formatStringFromDTA(song, options.albumArtName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.albumArtName))) : undefined
    const albumArtPathPNG = isAbsolute(options.albumArtNamePNG) ? FilePath.of(formatStringFromDTA(song, options.albumArtNamePNG)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.albumArtNamePNG))

    const midiFilePath = isAbsolute(options.midiFileName) ? FilePath.of(formatStringFromDTA(song, options.midiFileName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.midiFileName))

    const dryVox1Path: FilePath | undefined = options.hasLipsyncFiles !== null && song.vocal_parts > 0 ? (isAbsolute(options.dryVox1Name) ? FilePath.of(formatStringFromDTA(song, options.dryVox1Name)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.dryVox1Name))) : song.vocal_parts > 0 ? dryVoxBlank : undefined
    const dryVox2Path: FilePath | undefined = options.hasLipsyncFiles === 2 || options.hasLipsyncFiles === 3 ? (isAbsolute(options.dryVox2Name) ? FilePath.of(formatStringFromDTA(song, options.dryVox2Name)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.dryVox2Name))) : options.hasLipsyncFiles !== null && song.vocal_parts > 1 ? (isAbsolute(options.dryVox2Name) ? FilePath.of(formatStringFromDTA(song, options.dryVox2Name)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.dryVox2Name))) : song.vocal_parts > 1 ? dryVoxBlank : undefined
    const dryVox3Path: FilePath | undefined = options.hasLipsyncFiles === 3 ? (isAbsolute(options.dryVox3Name) ? FilePath.of(formatStringFromDTA(song, options.dryVox3Name)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.dryVox3Name))) : options.hasLipsyncFiles !== null && song.vocal_parts > 2 ? (isAbsolute(options.dryVox3Name) ? FilePath.of(formatStringFromDTA(song, options.dryVox3Name)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.dryVox3Name))) : song.vocal_parts > 2 ? dryVoxBlank : undefined

    let kickWavPath: FilePath | undefined
    let snareWavPath: FilePath | undefined
    let drumKitWavPath: FilePath | undefined
    let bassWavPath: FilePath | undefined
    let guitarWavPath: FilePath | undefined
    let vocalsWavPath: FilePath | undefined
    let keysWavPath: FilePath | undefined
    if (song.multitrack) {
      // TODO Path absolute check: kick and drum kit
      kickWavPath = song.tracks_count[0] > 2 ? (song.doubleKick && options.hasSeparated2xWavFiles ? (isAbsolute(options.kick2xWavName) ? FilePath.of(formatStringFromDTA(song, options.kick2xWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.kick2xWavName))) : isAbsolute(options.kickWavName) ? FilePath.of(formatStringFromDTA(song, options.kickWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.kickWavName))) : undefined

      snareWavPath = song.tracks_count[0] > 3 ? (isAbsolute(options.snareWavName) ? FilePath.of(formatStringFromDTA(song, options.snareWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.snareWavName))) : undefined

      drumKitWavPath = song.tracks_count[0] === 2 ? (options.hasSeparated2xWavFiles && song.doubleKick ? (isAbsolute(options.drums2xWavName) ? FilePath.of(formatStringFromDTA(song, options.drums2xWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.drums2xWavName))) : isAbsolute(options.drumsWavName) ? FilePath.of(formatStringFromDTA(song, options.drumsWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.drumsWavName))) : song.tracks_count[0] > 2 ? (options.hasSeparated2xWavFiles && song.doubleKick ? (isAbsolute(options.drumKit2xWavName) ? FilePath.of(formatStringFromDTA(song, options.drumKit2xWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.drumKit2xWavName))) : isAbsolute(options.drumKitWavName) ? FilePath.of(formatStringFromDTA(song, options.drumKitWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.drumKitWavName))) : undefined

      bassWavPath = song.tracks_count[1] !== 0 ? (isAbsolute(options.bassWavName) ? FilePath.of(formatStringFromDTA(song, options.bassWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.bassWavName))) : undefined

      guitarWavPath = song.tracks_count[2] !== 0 ? (isAbsolute(options.guitarWavName) ? FilePath.of(formatStringFromDTA(song, options.guitarWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.guitarWavName))) : undefined

      vocalsWavPath = song.tracks_count[3] !== 0 ? (isAbsolute(options.vocalsWavName) ? FilePath.of(formatStringFromDTA(song, options.vocalsWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.vocalsWavName))) : undefined

      keysWavPath = song.tracks_count[4] !== 0 ? (isAbsolute(options.keysWavName) ? FilePath.of(formatStringFromDTA(song, options.keysWavName)) : FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.keysWavName))) : undefined
    } else {
      kickWavPath = song.tracks_count[0] > 5 ? stereoBlank : song.tracks_count[0] > 2 ? monoBlank : undefined

      snareWavPath = song.tracks_count[0] > 4 ? stereoBlank : song.tracks_count[0] > 3 ? monoBlank : undefined

      drumKitWavPath = song.tracks_count[0] > 0 ? stereoBlank : undefined

      bassWavPath = song.tracks_count[1] === 1 ? monoBlank : song.tracks_count[1] === 2 ? stereoBlank : undefined

      guitarWavPath = song.tracks_count[2] === 1 ? monoBlank : song.tracks_count[2] === 2 ? stereoBlank : undefined

      vocalsWavPath = song.tracks_count[3] === 1 ? monoBlank : song.tracks_count[3] === 2 ? stereoBlank : undefined

      keysWavPath = song.tracks_count[4] === 1 ? monoBlank : song.tracks_count[4] === 2 ? stereoBlank : undefined
    }

    const backingWavPath = FilePath.of(songFolderPath.path, formatStringFromDTA(song, options.backingWavName))

    return { magmaPath, songsProjectRootFolderPath, songFolderPath, monoBlank, stereoBlank, dryVoxBlank, midiFilePath, albumArtPath, albumArtPathPNG, rbaFilePath, dryVox1Path, dryVox2Path, dryVox3Path, backingWavPath, defaultMAGMAArt, rbprojFilePath, c3FilePath, kickWavPath, snareWavPath, drumKitWavPath, bassWavPath, guitarWavPath, vocalsWavPath, keysWavPath }
  }

  getMAGMAC3FileContents(): [string, string] {
    const song = this.song
    const options = this.options
    const { backing, bass, crowd, drum, guitar, keys, vocals } = genAudioFileStructure(song)
    const paths = this.mapAllOptionsPaths()

    const hasEnglish = song.languages ? (song.languages.findIndex((value) => value === 'English') > -1 ? true : false) : true
    const hasFrench = song.languages ? (song.languages.findIndex((value) => value === 'French') > -1 ? true : false) : true
    const hasItalian = song.languages ? (song.languages.findIndex((value) => value === 'Italian') > -1 ? true : false) : true
    const hasSpanish = song.languages ? (song.languages.findIndex((value) => value === 'Spanish') > -1 ? true : false) : true
    const hasGerman = song.languages ? (song.languages.findIndex((value) => value === 'German') > -1 ? true : false) : true
    const hasJapanese = song.languages ? (song.languages.findIndex((value) => value === 'Japanese') > -1 ? true : false) : true

    const drumSolo = song.solo?.find((flags) => flags === 'drum') ? 'True' : 'False'
    const guitarSolo = song.solo?.find((flags) => flags === 'guitar') ? 'True' : 'False'
    const bassSolo = song.solo?.find((flags) => flags === 'bass') ? 'True' : 'False'
    const keysSolo = song.solo?.find((flags) => flags === 'keys') ? 'True' : 'False'
    const vocalsSolo = song.solo?.find((flags) => flags === 'vocal_percussion') ? 'True' : 'False'

    const rbprojFile = new DTAIO(DTAIO.formatOptions.defaultRB3)
    const c3File = new BinaryWriter()

    rbprojFile.addValue('project', {
      tool_version: '110411_A',
      project_version: 24,
      metadata: {
        song_name: DTAIO.useString(song.name, rbprojFile.options.string),
        artist_name: DTAIO.useString(song.artist, rbprojFile.options.string),
        genre: song.genre,
        sub_genre: song.sub_genre ?? 'subgenre_other',
        year_released: song.year_released,
        album_name: song.album_name ? DTAIO.useString(song.album_name, rbprojFile.options.string) : undefined,
        author: song.author ?? '',
        release_label: '',
        country: 'ugc_country_us',
        price: 80,
        track_number: song.album_track_number ?? 1,
        has_album: song.album_art,
      },
      gamedata: {
        preview_start_ms: song.preview[0],
        rank_guitar: song.rank_guitar ? rankCalculator('guitar', song.rank_guitar) + 1 : 1,
        rank_bass: song.rank_bass ? rankCalculator('bass', song.rank_bass) + 1 : 1,
        rank_drum: song.rank_drum ? rankCalculator('drum', song.rank_drum) + 1 : 1,
        rank_vocals: song.rank_vocals ? rankCalculator('vocals', song.rank_vocals) + 1 : 1,
        rank_keys: song.rank_keys ? rankCalculator('keys', song.rank_keys) + 1 : 1,
        rank_pro_keys: song.rank_real_keys ? rankCalculator('real_keys', song.rank_real_keys) + 1 : 1,
        rank_band: rankCalculator('band', song.rank_band) + 1,
        vocal_scroll_speed: song.song_scroll_speed ?? 2300,
        anim_tempo: song.anim_tempo,
        vocal_gender: song.vocal_gender,
        vocal_percussion: song.bank.slice(4, -10),
        vocal_parts: song.vocal_parts,
        guide_pitch_volume: song.guide_pitch_volume ? DTAIO.useFloat(song.guide_pitch_volume, rbprojFile.options.number) : DTAIO.useFloat(-3, rbprojFile.options.number),
      },
      languages: {
        english: hasEnglish,
        french: hasFrench,
        italian: hasItalian,
        spanish: hasSpanish,
        german: hasGerman,
        japanese: hasJapanese,
      },
      destination_file: paths.rbaFilePath.path,
      midi: {
        file: paths.midiFilePath.path,
        autogen_theme: `${options.autogenTheme}.rbtheme`,
      },
      dry_vox: {
        part0: {
          file: paths.dryVox1Path?.path ?? '',
          enabled: song.vocal_parts > 0 ? true : false,
        },
        part1: {
          file: paths.dryVox2Path?.path ?? '',
          enabled: options.hasLipsyncFiles === 2 || options.hasLipsyncFiles === 3 ? true : song.vocal_parts > 1 ? true : false,
        },
        part2: {
          file: paths.dryVox3Path?.path ?? '',
          enabled: options.hasLipsyncFiles === 3 ? true : song.vocal_parts > 2 ? true : false,
        },
        tuning_offset_cents: song.tuning_offset_cents ? DTAIO.useFloat(song.tuning_offset_cents, rbprojFile.options.number) : DTAIO.useFloat(0, rbprojFile.options.number),
      },
      album_art: {
        file: paths.albumArtPath?.path ?? '',
      },
      tracks: {
        drum_layout: drum.drum_layout,
        drum_kit: {
          enabled: drum.kitEnabled,
          channels: drum.kitChannels,
          pan: DTAIO.useArray(
            drum.kitPan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            drum.kitVol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.drumKitWavPath?.path ?? '',
        },
        drum_kick: {
          enabled: drum.kickEnabled,
          channels: drum.kickChannels,
          pan: DTAIO.useArray(
            drum.kickPan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            drum.kickVol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.kickWavPath?.path ?? '',
        },
        drum_snare: {
          enabled: drum.snareEnabled,
          channels: drum.snareChannels,
          pan: DTAIO.useArray(
            drum.snarePan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            drum.snareVol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.snareWavPath?.path ?? '',
        },
        bass: {
          enabled: bass.enabled,
          channels: bass.channels,
          pan: DTAIO.useArray(
            bass.pan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            bass.vol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.bassWavPath?.path ?? '',
        },
        guitar: {
          enabled: guitar.enabled,
          channels: guitar.channels,
          pan: DTAIO.useArray(
            guitar.pan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            guitar.vol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.guitarWavPath?.path ?? '',
        },
        vocals: {
          enabled: vocals.enabled,
          channels: vocals.channels,
          pan: DTAIO.useArray(
            vocals.pan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            vocals.vol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.vocalsWavPath?.path ?? '',
        },
        keys: {
          enabled: keys.enabled,
          channels: keys.channels,
          pan: DTAIO.useArray(
            keys.pan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            keys.vol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.keysWavPath?.path ?? '',
        },
        backing: {
          enabled: backing.enabled,
          channels: backing.channels,
          pan: DTAIO.useArray(
            backing.pan.map((pan) => DTAIO.useFloat(pan, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          vol: DTAIO.useArray(
            backing.vol.map((vol) => DTAIO.useFloat(vol, rbprojFile.options.number)),
            { array: { parenthesisForValues: false, keyAndValueInline: true } }
          ),
          file: paths.backingWavPath.path,
        },
      },
    })

    c3File.write(`//Created by Magma: Rok On Edition v4.0.2\n//DO NOT EDIT MANUALLY\nSong=${song.name}\nArtist=${song.artist}\nAlbum=${song.album_name ?? ''}\nCustomID=\nVersion=${options.releaseVer.toString()}\nIsMaster=${song.master ? 'True' : 'False'}\nEncodingQuality=3\n${song.tracks_count[6] !== undefined ? `CrowdAudio=${paths.stereoBlank.path}\nCrowdVol=${crowd.vol?.toString() ?? '-5'}\n` : ''}${song.year_recorded ? `ReRecordYear=${song.year_recorded.toString()}` : ''}2xBass=${song.doubleKick ? 'True' : 'False'}\nRhythmKeys=${song.rhythmOn === `keys` ? 'True' : 'False'}\nRhythmBass=${song.rhythmOn === 'bass' ? 'True' : 'False'}\nKaraoke=${song.multitrack === 'karaoke' ? 'True' : 'False'}\nMultitrack=${song.multitrack ? 'True' : 'False'}\nConvert=${song.convert ? 'True' : 'False'}\nExpertOnly=${song.emh === 'expert_only' ? 'True' : 'False'}\n`)

    if (song.rank_real_bass && song.real_bass_tuning) c3File.write(`ProBassDiff=${song.rank_real_bass.toString()}\nProBassTuning4=(real_bass_tuning (${song.real_bass_tuning.join(' ')}))\n`)

    if (song.rank_real_guitar && song.real_guitar_tuning) c3File.write(`ProGuitarDiff=${song.rank_real_guitar.toString()}\nProGuitarTuning=(real_guitar_tuning (${song.real_guitar_tuning.join(' ')}))\n`)

    c3File.write(`DisableProKeys=${keys.enabled ? 'True' : 'False'}\nTonicNote=${song.vocal_tonic_note?.toString() ?? '0'}\nTonality=${song.song_tonality?.toString() ?? '0'}\nTuningCents=${song.tuning_offset_cents?.toString() ?? '0'}\nSongRating=${song.rating.toString()}\nDrumKitSFX=${song.drum_bank === 'sfx/kit01_bank.milo' ? '0' : song.drum_bank === 'sfx/kit02_bank.milo' ? '1' : song.drum_bank === 'sfx/kit03_bank.milo' ? '2' : song.drum_bank === 'sfx/kit04_bank.milo' ? '3' : '4'}\nHopoTresholdIndex=${song.hopo_threshold === 90 ? '0' : song.hopo_threshold === 130 ? '1' : song.hopo_threshold === 170 ? '2' : song.hopo_threshold === 250 ? '3' : '2'}\n`)
    c3File.write(`MuteVol=${song.mute_volume?.toString() ?? '-96'}\nVocalMuteVol=${song.mute_volume_vocals?.toString() ?? '-12'}\nSoloDrums=${drumSolo}\nSoloGuitar=${guitarSolo}\nSoloBass=${bassSolo}\nSoloKeys=${keysSolo}\nSoloVocals=${vocalsSolo}\nSongPreview=${song.preview[0].toString()}\nSongPreviewEnd=${song.preview[1].toString()}\nCheckTempoMap=False\nWiiMode=False\nDoDrumMixEvents=False\nPackageDisplay=${formatStringFromDTA(song, this.options.conFilePackageName)}\nPackageDescription=${formatStringFromDTA(song, this.options.conFilePackageDesc)}\n`)
    c3File.write(`SongAlbumArt=${paths.albumArtPathPNG.path}\nPackageThumb=\n${song.encoding === 'utf8' ? 'EncodeANSI=False\nEncodeUTF8=True' : 'EncodeANSI=True\nEncodeUTF8=False'}\nUseNumericID=True\nUniqueNumericID=${song.song_id.toString()}\nUniqueNumericID2X=\n\nTO DO List Begin\nToDo1=Verify the accuracy of all metadata,False,False\nToDo2=Grab official *.png_xbox art file if applicable,False,False\nToDo3=Chart reductions in all instruments,False,False\nToDo4=Add drum fills,False,False\nToDo5=Add overdrive for all instruments,False,False\nToDo6=Add overdrive for vocals,False,False\nToDo7=Create practice sessions [EVENTS],False,False\nToDo8=Draw sing-along notes in VENUE,False,False\nToDo9=Record dry vocals for lipsync,False,False\nToDo10=Render audio with RB limiter and count-in,False,False\nToDo12=Click to add new item...,False,False\nToDo13=Click to add new item...,False,False\nToDo14=Click to add new item...,False,False\nToDo15=Click to add new item...,False,False\nTO DO List End\n`)

    return [rbprojFile.toString(), c3File.toBuffer().toString()]
  }

  saveMAGMAC3FileContentsSync(): [FilePath, FilePath] {
    const [rbprojFile, c3File] = this.getMAGMAC3FileContents()
    const rbprojFilePath = FilePath.of(formatStringFromDTA(this.song, this.options.destPath)).changeFileExt('.rbproj')
    const c3FilePath = FilePath.of(formatStringFromDTA(this.song, this.options.destPath)).changeFileExt('.rok')

    rbprojFilePath.writeSync(rbprojFile.replace(new RegExp('\\n', 'g'), '\r\n'), 'latin1')
    c3FilePath.writeWithBOMSync(c3File.replace(new RegExp('\\n', 'g'), '\r\n'))

    return [rbprojFilePath, c3FilePath]
  }
}
