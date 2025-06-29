import { BinaryReader, type DirPath, type FilePath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes } from 'node-lib'
import { temporaryDirectory } from 'tempy'
import { STFSFile } from '../../core.exports'
import { extractedPackageProcessor, sortDTA, type RB3CompatibleDTAFile, type RB3PackageFilesTypes } from '../../lib.exports'

export interface MappedPackageFilesObject {
  extractionFolder: DirPath
  songs: RB3CompatibleDTAFile[]
}
/**
 *
 * @param {RB3PackageFilesTypes[]} files An array with package files to be parsed and mapped.
 * @returns {Promise<MappedPackageFilesObject>}
 */
export const mapPackageFiles = async (files: RB3PackageFilesTypes[]): Promise<MappedPackageFilesObject> => {
  const extractionFolder = pathLikeToDirPath(temporaryDirectory())
  if (!extractionFolder.exists) await extractionFolder.mkDir()
  try {
    let songs: RB3CompatibleDTAFile[] = []
    const songnames: string[] = []

    const packages = await Promise.all(
      files.map(async (file) => {
        if (file instanceof STFSFile) return file
        else {
          const path = pathLikeToFilePath(file)
          const magic = await BinaryReader.fromBuffer(await path.readOffset(0, 4)).readUInt32BE()
          // XBox 360 CON File
          if (magic === 0x434f4e20 || magic === 0x50495253 || magic === 0x4c495645) return new STFSFile(path)
          else throw new Error(`Unknown package format for RB3 Package file input: "${path.path}"`)
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

    await extractedPackageProcessor(extractionFolder)

    songs = sortDTA(songs, 'Shortname')

    return {
      extractionFolder,
      songs,
    }
  } catch (err) {
    if (extractionFolder.exists) await extractionFolder.deleteDir(true)
    throw err
  }
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
