import { BinaryReader, type DirPath, type FilePath, pathLikeToDirPath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { useDefaultOptions } from 'use-default-options'
import { DTAParser, RB3Package, RPCS3 } from '../../core.exports'
import { DTAIO, formatStringFromDTA, removePaddingToBuffer, swapTextureBytes, type RB3SongEntriesObject } from '../../lib.exports'

// #region Types
export interface RB3PackageExtractionOptions {
  /**
   * An array with shortnames of songs that must be extracted from the RB3 Package file. All other songs won't be extracted.
   */
  selectSongs?: string[]
  /**
   * A custom package folder name to be used for this song package. If provided, it will ignore the default package folder name.
   * Default is `null` (will use the folder name from the RB3 Package file itself).
   */
  packageFolderName?: string | null
  /**
   * A patch that will normalize all songs shortnames to Rock Band standards.
   *
   * The method will iterate through every package installed and checks the songnames to avoid duplicates.
   * All songs shortnames will be converted to the song's title, in lowercase, with an additional number if there's another song with the same
   * title which the shortname can conflict. Default is `false` (will use the song's original shortname, if available to use).
   */
  applySongfileNamesPatch?: boolean
}

export interface SongExtractionPathObject {
  /**
   * The path to the song's MOGG file.
   */
  mogg: FilePath
  /**
   * The path to the song's MIDI file.
   */
  midi: FilePath
  /**
   * The path to the song's texture file.
   */
  png: FilePath
  /**
   * The path to the song's MILO file.
   */
  milo: FilePath
}

// #region Utilities

/**
 * Checks if the provided package folder name exists on the Rock Band 3's USRDIR. This function will loops the naming iteration until the package
 * folder name is available by placing a number if the package folder name already exists and returning a valid package folder name.
 * - - - -
 * @param {string} packageFolderName The folder name that you want to be checked.
 * @param {RPCS3} rpcs3 An instantiated `RPCS3` class pointing to the user's `dev_hdd0` folder.
 * @returns {Promise<string>}
 */
export const checkForExistingPackageFolderName = async (packageFolderName: string, rpcs3: RPCS3): Promise<string> => {
  let result = packageFolderName
  let i = 2
  let proof = false
  do {
    const isAvailable = await rpcs3.isPackFolderNameAvailable(result)
    if (!isAvailable) {
      result = `${packageFolderName}${i.toString()}`
      i++
      continue
    }
    proof = true
  } while (!proof)

  return result
}

/**
 * Checks if the provided shortname (songname) exists on the Rock Band 1 and Rock Band 3's USRDIRs. This function will iterates thought official
 * songnames and custom songnames already installed by the user, returning a valid songname.
 * - - - -
 * @param {string} songname The shortname (songname) that you want to be checked.
 * @param {RPCS3} rpcs3 An instantiated `RPCS3` class pointing to the user's `dev_hdd0` folder.
 * @returns {Promise<string>}
 */
export const checkForExistingSongname = async (songname: string, rpcs3: RPCS3): Promise<string> => {
  let result = songname
  let i = 2
  let proof = false
  do {
    const isAvailable = await rpcs3.isSongnameAvailable(result)
    if (!isAvailable) {
      result = `${songname}${i.toString()}`
      i++
      continue
    }
    proof = true
  } while (!proof)

  return result
}

// #region RPCS3

/**
 * Mounts the paths to a song's files for RPCS3 environment.
 * - - - -
 * @param {DirPathLikeTypes} songFolder The folder to the song's files.
 * @param {string} songname The songname (shortname) of the song.
 * @returns {Promise<SongExtractionPathObject>}
 */
export const mountRPCS3SongExtractionPaths = async (songFolder: DirPathLikeTypes, songname: string): Promise<SongExtractionPathObject> => {
  const song = pathLikeToDirPath(songFolder).gotoDir(songname)
  if (!song.exists) await song.mkDir()
  const gen = song.gotoDir('gen')
  if (!gen.exists) await gen.mkDir()
  const mogg = song.gotoFile(`${songname}.mogg`)
  const midi = song.gotoFile(`${songname}.mid.edat`)
  const png = gen.gotoFile(`${songname}_keep.png_ps3`)
  const milo = gen.gotoFile(`${songname}.milo_ps3`)

  return { mogg, midi, png, milo }
}

/**
 * Extracts songs from a RB3 Package file, formatted to RPCS3 use, and returns the new extracted package folder path.
 * - - - -
 * @param {RB3Package | FilePathLikeTypes} rb3PackageFilePath An instantiated `RB3Package` class pointing to a RB3 Package file, or a RB3 Package
 * file path.
 * @param {RPCS3 | DirPathLikeTypes} rpcs3DevHDD0Folder A valid `dev_hdd0` folder destination to the package extraction.
 * @param {RB3PackageExtractionOptions} [options] `OPTIONAL` An object with values that changes the behavior of the extracting process.
 * @returns {Promise<DirPath>}
 */
export const extractRB3PackageRPCS3 = async (rb3PackageFilePath: RB3Package | FilePathLikeTypes, rpcs3DevHDD0Folder: RPCS3 | DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> => {
  const packageFile = rb3PackageFilePath instanceof RB3Package ? rb3PackageFilePath : new RB3Package(rb3PackageFilePath)
  await packageFile.checkFileIntegrity()
  const rpcs3 = rpcs3DevHDD0Folder instanceof RPCS3 ? rpcs3DevHDD0Folder : new RPCS3(rpcs3DevHDD0Folder)

  const reader = await BinaryReader.fromFile(packageFile.path)
  const opts = useDefaultOptions(
    {
      selectSongs: [],
      packageFolderName: null,
      applySongfileNamesPatch: false,
    },
    options
  )
  const { header, entries, dta } = await packageFile.stat()

  const packageFolderName = await checkForExistingPackageFolderName(opts.packageFolderName ?? header.defaultFolderName, rpcs3)
  const packageFolderDir = rpcs3.devhdd0Path.gotoDir(`game/BLUS30463/USRDIR/${packageFolderName}`)
  try {
    const innerSongsDir = packageFolderDir.gotoDir(`songs`)
    const songsDTAPath = innerSongsDir.gotoFile('songs.dta')
    await innerSongsDir.mkDir(true)
    const dtaIO = new DTAParser()

    const operators: RB3SongEntriesObject[] = entries.filter((val) => {
      if (opts.selectSongs.length > 0) {
        if (opts.selectSongs.includes(val.songname)) return true
        return false
      }
      return true
    })

    const { binaryBlockOffset } = header

    for (const op of operators) {
      if (opts.applySongfileNamesPatch) {
        // Songfile Names Patch
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`Internal error: Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)

        const newSongname = await checkForExistingSongname(formatStringFromDTA(songDTAObject, '{{idPatch1}}', 'id'), rpcs3)
        dtaIO.addSongs({
          ...songDTAObject,
          id: newSongname,
          songname: newSongname,
        })

        const paths = await mountRPCS3SongExtractionPaths(innerSongsDir, newSongname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(removePaddingToBuffer(await reader.read(op.moggSize), op.moggPadding))
        await paths.midi.write(removePaddingToBuffer(await reader.read(op.midiSize), op.midiPadding))
        await paths.png.write(removePaddingToBuffer(await swapTextureBytes(await reader.read(op.pngSize)), op.pngPadding))
        await paths.milo.write(removePaddingToBuffer(await reader.read(op.miloSize), op.miloPadding))
      } else {
        // Without any patches
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`Internal error: Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        dtaIO.addSongs(songDTAObject)

        const paths = await mountRPCS3SongExtractionPaths(innerSongsDir, op.songname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(removePaddingToBuffer(await reader.read(op.moggSize), op.moggPadding))
        await paths.midi.write(removePaddingToBuffer(await reader.read(op.midiSize), op.midiPadding))
        await paths.png.write(removePaddingToBuffer(await reader.read(op.pngSize), op.pngPadding))
        await paths.milo.write(removePaddingToBuffer(await reader.read(op.miloSize), op.miloPadding))
      }
    }

    await songsDTAPath.write(dtaIO.stringify({ addMAGMAValues: true, formatOptions: DTAIO.formatOptions.defaultRB3, omitUnusedValues: true }))
    await reader.close()

    return packageFolderDir
  } catch (err) {
    await reader.close()
    await packageFolderDir.deleteDir(true)
    throw err
  }
}

// #region YARG

/**
 * Mounts the paths to a song's files for YARG environment. Also works with extracted CON file structure.
 * - - - -
 * @param {DirPathLikeTypes} songFolder The folder to the song's files.
 * @param {string} songname The songname (shortname) of the song.
 * @returns {Promise<SongExtractionPathObject>}
 */
export const mountYARGSongExtractionPaths = async (songFolder: DirPathLikeTypes, songname: string): Promise<SongExtractionPathObject> => {
  const song = pathLikeToDirPath(songFolder).gotoDir(songname)
  if (!song.exists) await song.mkDir()
  const gen = song.gotoDir('gen')
  if (!gen.exists) await gen.mkDir()
  const mogg = song.gotoFile(`${songname}.mogg`)
  const midi = song.gotoFile(`${songname}.mid`)
  const png = gen.gotoFile(`${songname}_keep.png_xbox`)
  const milo = gen.gotoFile(`${songname}.milo_xbox`)

  return { mogg, midi, png, milo }
}
