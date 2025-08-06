import { type DirPath, type DirPathLikeTypes, type FilePath, isFile, pathLikeToDirPath, pathLikeToFilePath } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryDirectory, temporaryFile } from 'tempy'
import { MOGGFile, PythonAPI, STFSFile, TextureFile, type TextureFormatTypes, type TextureSizeTypes } from '../../core.exports'
import { sortDTA, type RB3CompatibleDTAFile, type RB3PackageFilesTypes } from '../../lib.exports'

// #region Types

export interface MappedPackageFilesObject {
  /**
   * The folder where the CON files were extracted temporarially.
   */
  extractionFolder: DirPath
  /**
   * An array with all parsed songs data extracted from the CON files.
   */
  songs: RB3CompatibleDTAFile[]
}

export interface ExtractedPackageProcessorOptions {
  /**
   * Tells if the MOGG files must be encrypted or decrypted. If `true`, the MOGG files will be encrypted using the 0B encryption. Other encrypted MOGGs that encrypted using other encryption version will be decrypted and reencrypted using 0B. Default is `false` (no encryption).
   */
  moggEncrypted?: boolean
  /**
   * Tells which console version of the texture files will be processed into. Default is `xbox`.
   */
  textureFormat?: 'xbox' | 'ps3' | 'wii'
  /**
   * Tells which console version of the MILO files will be processed into. Default is `xbox`.
   */
  miloFormat?: 'xbox' | 'ps3' | 'wii'
}

export interface SongContentsStatsObject {
  /**
   * The path to the song's MOGG file.
   */
  moggPath: FilePath
  /**
   * The length to the song's MOGG file.
   */
  moggSize: number
  /**
   * The path to the song's MIDI file.
   */
  midiPath: FilePath
  /**
   * The length to the song's MIDI file.
   */
  midiSize: number
  /**
   * The path to the song's texture file.
   */
  pngPath: FilePath
  /**
   * The length to the song's texture file.
   */
  pngSize: number
  /**
   * The path to the song's MILO file.
   */
  miloPath: FilePath
  /**
   * The length to the song's MILO file.
   */
  miloSize: number
}

// #region Functions

export const extractedPackageProcessor = async (extractedPackageFolderPath: DirPathLikeTypes, options?: ExtractedPackageProcessorOptions) => {
  const folder = pathLikeToDirPath(extractedPackageFolderPath)
  if (!folder.exists) throw new Error(`Provided extract package folder "${folder.path}" does not exists.`)
  const { moggEncrypted, textureFormat, miloFormat } = setDefaultOptions(
    {
      moggEncrypted: false,
      textureFormat: 'xbox',
      miloFormat: 'xbox',
    },
    options
  )

  const filteredFolderContents = (await folder.readDir(true, true))
    .filter((val) => isFile(val))
    .map((val) => pathLikeToFilePath(val))
    .filter((val) => val.ext !== '.dta')

  const newFiles: FilePath[] = []
  for (const file of filteredFolderContents) {
    const ext = file.ext.slice(1)
    switch (ext) {
      case 'milo_xbox':
      case 'milo_ps3':
      case 'milo_wii': {
        if (ext !== `milo_${miloFormat}`) newFiles.push(await file.rename(file.changeFileExt(`.milo_${miloFormat}`)))
        else newFiles.push(file)
        break
      }
      case 'png_xbox':
      case 'png_ps3':
      case 'png_wii': {
        if (ext !== `.png_${textureFormat}`) {
          const tempPng = pathLikeToFilePath(temporaryFile({ extension: '.png' }))
          const tex = new TextureFile(file)
          const img = await tex.convertToImage(tempPng, 'png')
          const { width } = await img.stat()
          await img.convertToTexture(file.changeFileExt(`.png_${textureFormat}`), `.png_${textureFormat}` as TextureFormatTypes, width as TextureSizeTypes)
          await file.delete()
          await tempPng.delete()
        }
        newFiles.push(file.changeFileExt(`.png_${textureFormat}`))
        break
      }
      case 'mogg': {
        const desiredMOGGEnc = moggEncrypted ? 11 : 10
        const mogg = new MOGGFile(file)
        const srcEnc = await mogg.checkFileIntegrity()
        if (moggEncrypted && srcEnc === 10) {
          // Encrypt decrypted MOGGs
          const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
          await PythonAPI.encryptMOGG(file, tempMogg, desiredMOGGEnc)
          await tempMogg.rename(file, true)
        } else if (moggEncrypted && srcEnc !== desiredMOGGEnc) {
          // Decrypt then reencrypt and pray for the better
          const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
          await PythonAPI.decryptMOGG(file, tempMogg)
          await PythonAPI.encryptMOGG(tempMogg, file, desiredMOGGEnc)
          await tempMogg.delete()
        } else if (!moggEncrypted && srcEnc > 10) {
          // Decrypt MOGGs
          const tempMogg = pathLikeToFilePath(temporaryFile({ extension: '.mogg' }))
          await PythonAPI.decryptMOGG(file, tempMogg)
          await tempMogg.rename(file, true)
        }
        newFiles.push(file)
        break
      }
      case 'mid':
      case 'edat': {
        // Still need implementation...
        newFiles.push(file)
        break
      }
      default:
        break
    }
  }
}

/**
 * Extracts all input files and returns an object with the path to the extraction folder and the songs that was extracted from them.
 * - - - -
 * @param {RB3PackageFilesTypes[]} files An array with CON files to be added to the package.
 * @returns {Promise<MappedPackageFilesObject>}
 */
export const extractPackagesForRB3Package = async (files: RB3PackageFilesTypes[]): Promise<MappedPackageFilesObject> => {
  const extractionFolder = pathLikeToDirPath(temporaryDirectory())
  if (!extractionFolder.exists) await extractionFolder.mkDir()
  try {
    const songs: RB3CompatibleDTAFile[] = []
    const songnames: string[] = []

    const packages = await Promise.all(
      files.map(async (file) => {
        if (file instanceof STFSFile) return file
        else {
          const stfs = new STFSFile(file)
          await stfs.checkFileIntegrity()
          return stfs
        }
      })
    )

    for (const pack of packages) {
      const stat = await pack.toJSON()
      if (!stat.dta || stat.dta.length === 0) throw new Error(`Provided STFS Package "${stat.path}" has no songs to be added to the RB3 Package file.`)
      for (const song of stat.dta) {
        const songname = song.songname
        if (songnames.includes(songname)) throw new Error(`Found duplicate song with shortname "${songname}".`)
        songnames.push(songname)
        songs.push(song)
      }
      await pack.extract(extractionFolder)
    }

    return {
      extractionFolder,
      songs: sortDTA(songs, 'Shortname'),
    }
  } catch (err) {
    if (extractionFolder.exists) await extractionFolder.deleteDir(true)
    throw err
  }
}

/**
 * Gets the song's files path and size.
 * - - - -
 * @param {DirPathLikeTypes} songFolder The folder to the song's files.
 * @param {string} songname The songname (shortname) of the song.
 * @returns {Promise<SongContentsStatsObject>}
 */
export const getSongContentsStatsByShortname = async (songFolder: DirPathLikeTypes, songname: string): Promise<SongContentsStatsObject> => {
  const extFolder = pathLikeToDirPath(songFolder)
  const moggPath = extFolder.gotoFile(`songs/${songname}/${songname}.mogg`)
  const midiPath = extFolder.gotoFile(`songs/${songname}/${songname}.mid`)
  const pngPath = extFolder.gotoFile(`songs/${songname}/gen/${songname}_keep.png_xbox`)
  const miloPath = extFolder.gotoFile(`songs/${songname}/gen/${songname}.milo_xbox`)
  let moggSize = 0,
    midiSize = 0,
    pngSize = 0,
    miloSize = 0

  if (moggPath.exists) moggSize = (await moggPath.stat()).size
  if (midiPath.exists) midiSize = (await midiPath.stat()).size
  if (pngPath.exists) pngSize = (await pngPath.stat()).size
  if (miloPath.exists) miloSize = (await miloPath.stat()).size

  return {
    moggPath,
    moggSize,
    midiPath,
    midiSize,
    pngPath,
    pngSize,
    miloPath,
    miloSize,
  }
}
