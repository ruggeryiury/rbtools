import { DirPath, isDir, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes } from 'node-lib'
import { BinaryAPI, DTAParser, EDATFile, MOGGFile, PythonAPI, STFSFile, TextureFile, type PKGExtractionTempFolderObject, type PKGFileJSONRepresentation, type SelectedSongForExtractionObject, type STFSExtractionTempFolderObject, type STFSFileJSONRepresentation, type SupportedRB3PackageFileType } from '../../core.exports'
import { useDefaultOptions } from 'use-default-options'
import { temporaryDirectory, temporaryFile } from 'tempy'
import { getUnpackedFilesPathFromRootExtraction, type RB3CompatibleDTAFile } from '../../lib.exports'

export interface ExCONExtractionOptions {
  /**
   * The folder where the created package will be saved.
   */
  destFolderPath: DirPathLikeTypes
  /**
   * Whether you want to overwrite the package found with the same folder name. Default is `true`.
   */
  overwritePackFolder?: boolean
  /**
   * Force encryption/decryption of the MOGG files. Default is `"disabled"`.
   */
  forceEncryption?: 'enabled' | 'disabled'
  /**
   * An array with the internal songnames of the songs you want to extract from the packages. If left empty, all songs from the packages will be extracted and installed.
   *
   * If the value is a string, it will be considered as the internal songname of the song. If the value is an object, you can select the song by its internal songname, its entry ID, or its song ID. Example: `{ type: 'id', value: 'songentryid' }` or `{ type: 'songID', value: 5678 }`
   */
  songs: (string | SelectedSongForExtractionObject)[]
}

export interface ExCONPackageExtractionObject {
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
   * The installed song parsed objects that was installed.
   */
  songs: RB3CompatibleDTAFile[]
  /**
   * An array with all song entry ID installed.
   */
  installedSongIDs: string[]
  /**
   * An array with all internal songnames installed.
   */
  installedSongSongnames: string[]
}

export const extractPackagesForExCON = async (packages: SupportedRB3PackageFileType[], options: ExCONExtractionOptions): Promise<ExCONPackageExtractionObject> => {
  const { forceEncryption, overwritePackFolder, songs } = useDefaultOptions<ExCONExtractionOptions>(
    {
      destFolderPath: '',
      forceEncryption: 'disabled',
      overwritePackFolder: true,
      songs: [],
    },
    options
  )

  const hasSongSelection = songs.length > 0
  let allSelectedSongs: SelectedSongForExtractionObject[] = []

  if (hasSongSelection) allSelectedSongs = songs.map((song) => (typeof song === 'string' ? { type: 'songname', value: song } : song)) as SelectedSongForExtractionObject[]

  const dest = pathLikeToDirPath(options.destFolderPath)

  if (dest.exists && !overwritePackFolder) throw new Error(`Provided destination folder "${dest.path}" already exists.`)

  const parser = new DTAParser()

  const tempFolders: (STFSExtractionTempFolderObject | PKGExtractionTempFolderObject)[] = []
  for (const pack of packages) {
    const tempFolderPath = pathLikeToDirPath(temporaryDirectory())
    const type = pack instanceof STFSFile ? 'stfs' : 'pkg'
    const stat = await pack.toJSON()

    if (!hasSongSelection) {
      await pack.extract(tempFolderPath, true)
      parser.addSongs(stat.dta)

      if (type === 'stfs') {
        tempFolders.push({
          path: tempFolderPath,
          type: 'stfs',
          songs: stat.dta.map((song) => ({ songname: song.songname, files: getUnpackedFilesPathFromRootExtraction('stfs', tempFolderPath, song.songname) })),
          stat: stat as STFSFileJSONRepresentation,
        })
      } else {
        tempFolders.push({
          path: tempFolderPath,
          type: 'pkg',
          songs: stat.dta.map((song) => ({ songname: song.songname, files: getUnpackedFilesPathFromRootExtraction('pkg', tempFolderPath, song.songname) })),
          stat: stat as PKGFileJSONRepresentation,
        })
      }
    } else {
      const allSelectedSongnames: string[] = []

      for (const song of stat.dta) {
        for (const selSongOption of allSelectedSongs) {
          if ((selSongOption.type === 'songname' && selSongOption.value.toString() === song.songname.toString()) || (selSongOption.type === 'id' && selSongOption.value.toString() === song.id.toString()) || (selSongOption.type === 'songID' && selSongOption.value.toString() === song.song_id.toString())) allSelectedSongnames.push(song.songname)
        }
      }

      const filterdSelectedSongnames = stat.dta.filter((song) => allSelectedSongnames.includes(song.songname))

      if (filterdSelectedSongnames.length === 0) {
        await tempFolderPath.deleteDir(true)
        continue
      }

      await pack.extract(tempFolderPath, true, allSelectedSongnames)
      parser.addSongs(filterdSelectedSongnames)

      if (type === 'stfs') {
        tempFolders.push({
          path: tempFolderPath,
          type: 'stfs',
          songs: filterdSelectedSongnames.map((song) => ({ songname: song.songname, files: getUnpackedFilesPathFromRootExtraction('stfs', tempFolderPath, song.songname) })),
          stat: stat as STFSFileJSONRepresentation,
        })
      } else {
        tempFolders.push({
          path: tempFolderPath,
          type: 'pkg',
          songs: stat.dta.filter((song) => allSelectedSongnames.includes(song.songname)).map((song) => ({ songname: song.songname, files: getUnpackedFilesPathFromRootExtraction('pkg', tempFolderPath, song.songname) })),
          stat: stat as PKGFileJSONRepresentation,
        })
      }
    }
  }

  const mainTempFolder = pathLikeToDirPath(temporaryDirectory())

  try {
    // Move to a main temp will all files together and encrypt/decrypt all files
    for (const temp of tempFolders) {
      if (temp.songs.length === 0) {
        await temp.path.deleteDir(true)
        continue
      }
      for (const song of temp.songs) {
        // MILO
        const oldMiloPath = song.files.milo
        const newMiloPath = mainTempFolder.gotoFile(`${song.files.milo.name}.milo_xbox`)
        await oldMiloPath.move(newMiloPath, true)

        // PNG
        const oldPNGPath = song.files.png
        const newPNGPath = mainTempFolder.gotoFile(`${song.files.png.name}.png_xbox`)
        if (temp.type === 'stfs') await oldPNGPath.move(newPNGPath, true)
        else {
          // PS3 PNGs must be converted to Xbox
          const tempPNG = pathLikeToFilePath(temporaryFile({ extension: 'png' }))
          const tex = new TextureFile(oldPNGPath)
          const newImg = await tex.convertToImage(tempPNG, 'png')

          await newImg.convertToTexture(newPNGPath, 'png_xbox')
          await tempPNG.delete()
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
        const newMIDIPath = mainTempFolder.gotoFile(`${song.songname}.mid`)

        // MIDI is decrypted, just move the MIDI file to main temp
        if (temp.type === 'stfs') await oldMIDIPath.move(newMIDIPath, true)
        // MIDI might be encrypted for PKG files
        else if (temp.type === 'pkg') {
          const oldEDAT = new EDATFile(oldMIDIPath)
          const isEDATEncrypted = await oldEDAT.isEncrypted()

          if (!isEDATEncrypted) {
            // MIDI is decrypted, just move the MIDI file to main temp
            await oldMIDIPath.move(newMIDIPath, true)
          } else {
            // Original MIDI must be decrypted anyway
            const tempDecEDAT = pathLikeToFilePath(temporaryFile({ extension: 'mid' }))
            const oldDevklic = EDATFile.genDevKLicHash(temp.stat.folderName)
            await BinaryAPI.edatToolDecrypt(oldMIDIPath, oldDevklic, tempDecEDAT)
            await tempDecEDAT.move(newMIDIPath, true)
          }
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

  if (dest.exists) await dest.deleteDir(true)

  const newDTAPath = dest.gotoFile('songs/songs.dta')

  await dest.gotoDir('songs').mkDir(true)

  parser.sort('ID')
  parser.patchSongsEncodings()
  parser.patchCores()
  try {
    await parser.export(newDTAPath)
  } catch (err) {
    for (const temp of tempFolders) {
      await temp.path.deleteDir(true)
    }
    await mainTempFolder.deleteDir(true)
    throw new Error(`No DTA file could be created. None of the provided internal songnames were found on the packages provided.`)
  }
  const dtaStat = await newDTAPath.stat()

  let packSize: number = dtaStat.size

  try {
    for (const temp of tempFolders) {
      if (temp.songs.length === 0) {
        continue
      }
      for (const { songname } of temp.songs) {
        const mainTempMOGG = mainTempFolder.gotoFile(`${songname}.mogg`)
        const mainTempMIDI = mainTempFolder.gotoFile(`${songname}.mid`)
        const mainTempPNG = mainTempFolder.gotoFile(`${songname}_keep.png_xbox`)
        const mainTempMILO = mainTempFolder.gotoFile(`${songname}.milo_xbox`)

        if (!mainTempMOGG.exists) {
          await mainTempFolder.deleteDir()
          throw new Error(`Registered song on DTA with internal songname "${songname}" has no audio files linked to the song.`)
        }

        const songGenFolder = dest.gotoDir(`songs/${songname}/gen`)
        await songGenFolder.mkDir(true)
        const newMOGG = songGenFolder.gotoFile(`../${songname}.mogg`)
        const newMIDI = songGenFolder.gotoFile(`../${songname}.mid`)
        const newPNG = songGenFolder.gotoFile(`${songname}_keep.png_xbox`)
        const newMILO = songGenFolder.gotoFile(`${songname}.milo_xbox`)

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
    await mainTempFolder.deleteDir(true)
    throw err
  }
  // Delete anything residual from temp folder
  await mainTempFolder.deleteDir()
  return {
    mainTempFolder,
    tempFolders,
    packSize,
    songsInstalled: parser.songs.length,
    songs: parser.songs,
    installedSongIDs: parser.songs.map((song) => song.id),
    installedSongSongnames: parser.songs.map((song) => song.songname),
  }
}
