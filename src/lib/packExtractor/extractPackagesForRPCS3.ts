import { type DirPathLikeTypes, type DirPath, FilePath, pathLikeToDirPath, pathLikeToFilePath, randomByteFromRanges } from 'node-lib'
import { type PKGFile, type STFSFileJSONRepresentation, type PKGFileJSONRepresentation, DTAParser, STFSFile, MOGGFile, PythonAPI, TextureFile, EDATFile, BinaryAPI, MAGMAProject } from '../../core.exports'
import { temporaryDirectory, temporaryFile } from 'tempy'
import { useDefaultOptions } from 'use-default-options'
import { isDevhdd0PathValid } from '../rpcs3/isDevhdd0PathValid'

// #region Types
export type SupportedRB3PackageFileType = STFSFile | PKGFile
export type SupportedRB3PackageFileNames = 'stfs' | 'pkg'
export type RB3PackageLikeType = SupportedRB3PackageFileType | string

export interface RPCS3ExtractionOptions {
  /**
   * The `dev_hdd0` folder path you want to install the package.
   */
  devhdd0Path: DirPathLikeTypes
  /**
   * The name of the new package folder
   */
  packageFolderName: string
  /**
   * Whether you want to overwrite the package found with the same folder name. Default is `true`.
   */
  overwritePackFolder?: boolean
  /**
   * Force encryption/decryption of all possible encrypted files. Default is `"disabled"`.
   */
  forceEncryption?: 'enabled' | 'disabled'
  songs: (string | { type: 'id' | 'songname' | 'songID'; value: string | number })[]
}

export interface UnpackedFilesFromSongObject {
  /**
   * The path to the song's extrated MOGG file.
   */
  mogg: FilePath
  /**
   * The path to the song's extrated MIDI file.
   */
  mid: FilePath
  /**
   * The path to the song's extrated texture file.
   */
  png: FilePath
  /**
   * The path to the song's extrated MILO file.
   */
  milo: FilePath
}

export interface PackageExtractionSongsObject {
  /**
   * The internal songname used by the song and all its files.
   */
  songname: string
  /**
   * An object with the path of all files from the extracted song.
   */
  files: UnpackedFilesFromSongObject
}

export interface STFSExtractionTempFolderObject {
  /**
   * The path where the STFS package were extracted.
   */
  path: DirPath
  /**
   * The type of the package extracted.
   */
  type: 'stfs'
  /**
   * An array with objects representing extracted songs from the package and its files.
   */
  songs: PackageExtractionSongsObject[]
  /**
   * An object with stats of the extracted STFS file.
   */
  stat: STFSFileJSONRepresentation
}

export interface PKGExtractionTempFolderObject {
  /**
   * The path where the PKG package were extracted.
   */
  path: DirPath
  /**
   * The type of the package extracted.
   */
  type: 'pkg'
  /**
   * An array with objects representing extracted songs from the package and its files.
   */
  songs: PackageExtractionSongsObject[]
  /**
   * An object with stats of the extracted PKG file.
   */
  stat: PKGFileJSONRepresentation
}

export interface RPCS3PackageExtractionObject {
  /**
   * The path to temporary folder created to ultimately gather all package files to move to the actual package folder inside the `dev_hdd0` folder.
   */
  mainTempFolder: DirPath
  /**
   * An array with all temporary folder created when each package were extracted.
   */
  tempFolders: (STFSExtractionTempFolderObject | PKGExtractionTempFolderObject)[]
  /**
   * The size of the created package.
   */
  packSize: number
  /**
   * The amount of songs installed.
   */
  songsInstalled: number
  /**
   * An array with all song entry ID installed.
   */
  installedSongIDs: string[]
  /**
   * An array with all internal songnames installed.
   */
  installedSongSongnames: string[]
}

/**
 * Generates `FilePath` instances for all files from a song extracted from a package file. The contents of the package must be extracted on root.
 * - - - -
 * @param {SupportedRB3PackageFileNames} type The type of the package extracted. PS3 PKG files have different extensions for MIDI and Texture files.
 * @param {DirPathLikeTypes} rootFolderPath The path to the folder where the package file where extracted.
 * @param {string} songname The internal songname of the song you want to generates path from.
 * @returns {UnpackedFilesFromSongObject}
 */
const getUnpackedFilesFromExtraction = (type: SupportedRB3PackageFileNames, rootFolderPath: DirPathLikeTypes, songname: string): UnpackedFilesFromSongObject => {
  const root = pathLikeToDirPath(rootFolderPath)
  const isSTFS = type === 'stfs'

  return {
    mid: isSTFS ? root.gotoFile(`${songname}.mid`) : root.gotoFile(`${songname}.mid.edat`),
    mogg: root.gotoFile(`${songname}.mogg`),
    png: root.gotoFile(`${songname}_keep.png_${isSTFS ? 'xbox' : 'ps3'}`),
    milo: root.gotoFile(`${songname}.milo_${isSTFS ? 'xbox' : 'ps3'}`),
  }
}

/**
 * Extracts and installs the provided STFS/PKG song package files as a song package on the RPCS3's Rock Band 3 USRDIR folder .
 *
 * The `options` parameter is an object where you can tweak the extraction and package creation process, placing the `dev_hdd0` folder path, selecting the package folder name, and forcing encryption/decryption of all files for vanilla Rock Band 3 support.
 * - - - -
 * @param {SupportedRB3PackageFileType[]} packages An array with paths to STFS or PKG files to be installed. You can select individual song or multiple songs package.
 * @param {RPCS3ExtractionOptions} options An object that settles and tweaks the extraction and package creation process.
 * @returns {Promise<RPCS3PackageExtractionObject>}
 */
export const extractPackagesForRPCS3 = async (packages: SupportedRB3PackageFileType[], options: RPCS3ExtractionOptions): Promise<RPCS3PackageExtractionObject> => {
  const { devhdd0Path, forceEncryption, overwritePackFolder, packageFolderName } = useDefaultOptions(
    {
      devhdd0Path: '',
      packageFolderName: '',
      forceEncryption: 'disabled',
      overwritePackFolder: true,
      songs: [],
    },
    options
  )

  const devhdd0 = pathLikeToDirPath(devhdd0Path)
  if (!isDevhdd0PathValid(devhdd0)) throw new Error(`Provided dev_hdd0 path "${devhdd0.path}" is not a valid RPCS3 dev_hdd0 folder.`)

  if (packageFolderName.length === 0) throw new Error('Provided package folder name is blank.')

  if (packageFolderName.length > 42) throw new Error(`Provided package folder name "${packageFolderName}" is too big for RPCS3 file system.`)

  const usrdir = devhdd0.gotoDir('game/BLUS30463/USRDIR')
  const newFolder = usrdir.gotoDir(packageFolderName)

  if (newFolder.exists && !overwritePackFolder) throw new Error(`Provided package folder name "${packageFolderName}" already exists.`)

  const parser = new DTAParser()

  const tempFolders: (STFSExtractionTempFolderObject | PKGExtractionTempFolderObject)[] = []
  for (const pack of packages) {
    const tempFolderPath = pathLikeToDirPath(temporaryDirectory())
    const type = pack instanceof STFSFile ? 'stfs' : 'pkg'
    const stat = await pack.toJSON()

    await pack.extract(tempFolderPath, true)

    const packDTA = await DTAParser.fromFile(tempFolderPath.gotoFile('songs.dta'))
    parser.addSongs(packDTA.songs)

    if (type === 'stfs')
      tempFolders.push({
        path: tempFolderPath,
        type: 'stfs',
        songs: packDTA.songs.map((song) => ({ songname: song.songname, files: getUnpackedFilesFromExtraction('stfs', tempFolderPath, song.songname) })),
        stat: stat as STFSFileJSONRepresentation,
      })
    else
      tempFolders.push({
        path: tempFolderPath,
        type: 'pkg',
        songs: packDTA.songs.map((song) => ({ songname: song.songname, files: getUnpackedFilesFromExtraction('pkg', tempFolderPath, song.songname) })),
        stat: stat as PKGFileJSONRepresentation,
      })
  }

  const mainTempFolder = pathLikeToDirPath(temporaryDirectory())

  try {
    // Move to a main temp will all files together and encrypt/decrypt all files
    for (const temp of tempFolders) {
      for (const song of temp.songs) {
        // MILO
        const oldMiloPath = song.files.milo
        const newMiloPath = mainTempFolder.gotoFile(`${song.files.milo.name}.milo_ps3`)
        await oldMiloPath.move(newMiloPath, true)

        // PNG
        const oldPNGPath = song.files.png
        const newPNGPath = mainTempFolder.gotoFile(`${song.files.png.name}.png_ps3`)
        if (temp.type === 'pkg') await oldPNGPath.move(newPNGPath, true)
        else {
          // XBOX PNGs must be converted to PS3
          const ps3PNG = pathLikeToFilePath(temporaryFile({ extension: 'png' }))
          const tex = new TextureFile(oldPNGPath)
          const newImg = await tex.convertToImage(ps3PNG, 'png')

          await newImg.convertToTexture(newPNGPath, 'png_ps3')
          await ps3PNG.delete()
        }

        // MOGG
        const oldMOGGPath = new MOGGFile(song.files.mogg)
        const moggEncVersion = await oldMOGGPath.checkFileIntegrity()
        if (forceEncryption === 'disabled' && moggEncVersion === 10) {
          // Do nothing, the MOGG file is decrypted
        } else if (forceEncryption === 'disabled' && moggEncVersion > 10) {
          // MOGG is encrypted, but it must not
          const decMOGGPath = pathLikeToFilePath(temporaryFile({ extension: 'mogg' }))

          await PythonAPI.decryptMOGG(oldMOGGPath.path, decMOGGPath)
          await decMOGGPath.move(oldMOGGPath.path, true)
        } else if (forceEncryption === 'enabled' && moggEncVersion === 11) {
          // Do nothing, the MOGG file is encrypted
        } else if (forceEncryption === 'enabled' && moggEncVersion === 10) {
          // MOGG is decypted, but it must not
          const encMOGGPath = pathLikeToFilePath(temporaryFile({ extension: 'mogg' }))

          await BinaryAPI.makeMoggEncrypt(oldMOGGPath.path, encMOGGPath)
          await encMOGGPath.move(oldMOGGPath.path, true)
        } else if (forceEncryption === 'enabled' && moggEncVersion > 11) {
          // MOGG is encrypted, but not for PS3 use
          const decMOGGPath = pathLikeToFilePath(temporaryFile({ extension: 'mogg' }))

          await PythonAPI.decryptMOGG(oldMOGGPath.path, decMOGGPath)
          await BinaryAPI.makeMoggEncrypt(decMOGGPath, oldMOGGPath.path)

          await decMOGGPath.delete()
        }
        const newMOGGPath = mainTempFolder.gotoFile(song.files.mogg.fullname)
        await oldMOGGPath.path.move(newMOGGPath, true)

        // MIDI
        const oldMIDIPath = song.files.mid
        const newMIDIPath = mainTempFolder.gotoFile(`${song.songname}.mid.edat`)

        // MIDI is decrypted, just move changing the extension to EDAT
        if (temp.type === 'stfs' && forceEncryption === 'disabled') await oldMIDIPath.move(newMIDIPath, true)
        else if (temp.type === 'stfs' && forceEncryption === 'enabled') {
          const newDevkLic = EDATFile.genDevKLicHash(packageFolderName)
          const newContentID = EDATFile.genContentID(packageFolderName.toUpperCase())
          await BinaryAPI.edatToolEncrypt(oldMIDIPath, newContentID, newDevkLic, newMIDIPath)
        }
        // MIDI might be encrypted for PKG files
        else if (temp.type === 'pkg') {
          const oldEDAT = new EDATFile(oldMIDIPath)
          const isEDATEncrypted = await oldEDAT.isEncrypted()

          if (isEDATEncrypted) {
            // Original MIDI must be decrypted anyway
            const tempDecEDAT = pathLikeToFilePath(temporaryFile({ extension: 'mid' }))
            const oldDevklic = EDATFile.genDevKLicHash(temp.stat.folderName)
            await BinaryAPI.edatToolDecrypt(oldMIDIPath, oldDevklic, tempDecEDAT)
            await tempDecEDAT.move(oldMIDIPath, true)
          }

          const newDevkLic = EDATFile.genDevKLicHash(packageFolderName)
          const newContentID = EDATFile.genContentID(packageFolderName.toUpperCase())
          await BinaryAPI.edatToolEncrypt(oldMIDIPath, newContentID, newDevkLic, newMIDIPath)
        }
      }

      await temp.path.deleteDir()
    }
  } catch (err) {
    for (const temp of tempFolders) {
      await temp.path.deleteDir(true)
    }
    await mainTempFolder.deleteDir(true)
    throw err
  }

  if (newFolder.exists) await newFolder.deleteDir()

  const newDTAPath = newFolder.gotoFile('songs/songs.dta')

  await newFolder.gotoDir('songs').mkDir(true)

  parser.patchSongsEncodings()
  parser.patchCores()
  await parser.export(newDTAPath)

  const dtaStat = await newDTAPath.stat()

  let packSize: number = dtaStat.size

  try {
    for (const temp of tempFolders) {
      for (const { songname } of temp.songs) {
        const mainTempMOGG = mainTempFolder.gotoFile(`${songname}.mogg`)
        const mainTempMIDI = mainTempFolder.gotoFile(`${songname}.mid.edat`)
        const mainTempPNG = mainTempFolder.gotoFile(`${songname}_keep.png_ps3`)
        const mainTempMILO = mainTempFolder.gotoFile(`${songname}.milo_ps3`)

        if (!mainTempMOGG.exists) {
          await mainTempFolder.deleteDir()
          throw new Error(`Registered song on DTA with internal songname "${songname}" has no audio files linked to the song. `)
        }

        const songGenFolder = newFolder.gotoDir(`songs/${songname}/gen`)
        await songGenFolder.mkDir(true)
        const newMOGG = songGenFolder.gotoFile(`../${songname}.mogg`)
        const newMIDI = songGenFolder.gotoFile(`../${songname}.mid.edat`)
        const newPNG = songGenFolder.gotoFile(`${songname}_keep.png_ps3`)
        const newMILO = songGenFolder.gotoFile(`${songname}.milo_ps3`)

        await mainTempMOGG.move(newMOGG)
        await mainTempMIDI.move(newMIDI)
        await mainTempPNG.move(newPNG)
        await mainTempMILO.move(newMILO)

        const moggStat = await newMOGG.stat()
        packSize += moggStat.size
        const midiStat = await newMIDI.stat()
        packSize += midiStat.size
        const pngStat = await newPNG.stat()
        packSize += pngStat.size
        const miloStat = await newMILO.stat()
        packSize += miloStat.size
      }
    }
  } catch (err) {
    console.log('mainTempFolder', mainTempFolder.path)
    // await mainTempFolder.deleteDir(true)
    throw err
  }
  // Delete anything residual from temp folder
  await mainTempFolder.deleteDir()
  return {
    mainTempFolder,
    tempFolders,
    packSize,
    songsInstalled: parser.songs.length,
    installedSongIDs: parser.songs.map((song) => song.id),
    installedSongSongnames: parser.songs.map((song) => song.songname),
  }
}
