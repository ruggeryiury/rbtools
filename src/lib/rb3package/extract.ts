import { BinaryReader, DirPath, pathLikeToDirPath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { DTAParser, RB3Package } from '../../core.exports'
import { DTAIO, formatStringFromDTA, mountRPCS3SongExtractionPaths, removePaddingToBuffer, swapTextureBytes, type RB3SongEntriesObject } from '../../lib.exports'

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
   * By placing your `dev_hdd0` folder path, the function will iterate through every package installed and checks the songnames to avoid duplicates.
   * All songs shortnames will be converted to the song's title, in lowercase, with an additional number if there's another song with the same
   * title which the shortname can conflict. Default is `null` (will use the song's original shortname).
   */
  applySongfileNamesPatch?: string | null
}

/**
 * Extracts songs from a RB3 Package file, formatted to RPCS3 use, and returns the new extracted package folder path.
 * - - - -
 * @param {RB3Package | FilePathLikeTypes} rb3PackageFilePath An instantiated `RB3Package` class pointing to a RB3 Package file, or a RB3 Package
 * file path.
 * @param {DirPathLikeTypes} extractionFolderPath The destination of the extracted package (in this case, must be the Rock Band 3's USRDIR folder).
 * @param {RB3PackageExtractionOptions} [options] `OPTIONAL` An object with values that changes the behavior of the extracting process.
 * @returns {Promise<DirPath>}
 */
export const extractRB3PackageRPCS3 = async (rb3PackageFilePath: RB3Package | FilePathLikeTypes, extractionFolderPath: DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> => {
  const packageFile = rb3PackageFilePath instanceof RB3Package ? rb3PackageFilePath : new RB3Package(rb3PackageFilePath)
  await packageFile.checkFileIntegrity()
  const extractionFolder = pathLikeToDirPath(extractionFolderPath)
  if (!extractionFolder.exists) await extractionFolder.mkDir()
  const reader = await BinaryReader.fromFile(packageFile.path)
  const opts = setDefaultOptions(
    {
      selectSongs: [],
      packageFolderName: null,
      applySongfileNamesPatch: null,
    },
    options
  )
  try {
    const { header, entries, dta } = await packageFile.stat()

    const packageFolder = extractionFolder.gotoDir(header.defaultFolderName)
    if (packageFolder.exists) await packageFolder.deleteDir(true)

    const songsFolder = packageFolder.gotoDir('songs')
    await songsFolder.mkDir(true)

    const songsDTAPath = songsFolder.gotoFile('songs.dta')
    const exportDTA = new DTAParser()

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
        exportDTA.addSongs(songDTAObject)

        for (let i = 0; i < exportDTA.songs.length; i++) {
          const val = formatStringFromDTA(exportDTA.songs[i], '{{idPatch}}', 'id')
          exportDTA.songs[i] = {
            ...exportDTA.songs[i],
            id: val,
            songname: val,
          }
        }

        const paths = await mountRPCS3SongExtractionPaths(songsFolder, formatStringFromDTA(songDTAObject, '{{idPatch}}', 'id'))
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
        exportDTA.addSongs(songDTAObject)

        const paths = await mountRPCS3SongExtractionPaths(songsFolder, op.songname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(removePaddingToBuffer(await reader.read(op.moggSize), op.moggPadding))
        await paths.midi.write(removePaddingToBuffer(await reader.read(op.midiSize), op.midiPadding))
        await paths.png.write(removePaddingToBuffer(await reader.read(op.pngSize), op.pngPadding))
        await paths.milo.write(removePaddingToBuffer(await reader.read(op.miloSize), op.miloPadding))
      }
    }

    await songsDTAPath.write(exportDTA.stringify({ addMAGMAValues: true, formatOptions: DTAIO.formatOptions.defaultRB3, omitUnusedValues: true }))
    await reader.close()

    return packageFolder
  } catch (err) {
    await reader.close()
    await extractionFolder.deleteDir(true)
    throw err
  }
}
