import { BinaryReader, type DirPath, pathLikeToDirPath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryDirectory } from 'tempy'
import { stringify as stringifyYaml } from 'yaml'
import { DTAParser, ImageFile, OnyxCLI, RB3Package } from '../../core.exports'
import { DTAIO, mountRPCS3SongExtractionPaths, swapTextureBytes, type RB3SongEntriesObject, formatStringFromDTA, mountYARGSongExtractionPaths, defaultArtwork64x64 } from '../../lib.exports'

export interface RB3PackageExtractionOptions {
  patches?: 'idType1'[]
  selectSongs?: string | string[]
  folderName?: string | null
}

export const extractRB3PackageToRPCS3 = async (rb3PackagePath: RB3Package | FilePathLikeTypes, usrdirPath: DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> => {
  const opts = setDefaultOptions(
    {
      selectSongs: [],
      patches: [],
      folderName: null,
    },
    options
  )
  const packageFile = rb3PackagePath instanceof RB3Package ? rb3PackagePath : new RB3Package(rb3PackagePath)
  await packageFile.checkFileIntegrity()
  const usrdir = pathLikeToDirPath(usrdirPath)
  if (!usrdir.exists) await usrdir.mkDir()
  const reader = await BinaryReader.fromFile(packageFile.path)
  try {
    const { header, entries, dta } = await packageFile.stat()

    const packageFolder = usrdir.gotoDir(opts.folderName ?? header.folderName)
    if (packageFolder.exists) await packageFolder.deleteDir(true)
    await packageFolder.mkDir()

    const songsFolder = packageFolder.gotoDir('songs')
    await songsFolder.mkDir()

    const songsDtaPath = songsFolder.gotoFile('songs.dta')
    const exportDTA = new DTAParser()

    const operators: RB3SongEntriesObject[] = entries.filter((val) => {
      if (Array.isArray(opts.selectSongs) && opts.selectSongs.length === 0) {
        if (opts.selectSongs.includes(val.songname)) return true
      }
      if (typeof opts.selectSongs === 'string' && opts.selectSongs) {
        if (opts.selectSongs === val.songname) return true
      } else return true
    })
    const { binaryBlockOffset } = header

    const patchType1 = opts.patches.includes('idType1')

    for (const op of operators) {
      if (patchType1) {
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`Internal error: Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        exportDTA.addSongs(songDTAObject)

        for (let i = 0; i < exportDTA.songs.length; i++) {
          const val = formatStringFromDTA(exportDTA.songs[i], '{{id1}}', 'id')
          exportDTA.songs[i] = {
            ...exportDTA.songs[i],
            id: val,
            songname: val,
          }
        }

        const paths = await mountRPCS3SongExtractionPaths(songsFolder, formatStringFromDTA(songDTAObject, '{{id1}}', 'id'))
        reader.seek(songBinaryOffset)
        await paths.mogg.write(await reader.read(op.moggSize))
        reader.padding(op.moggPadding)
        await paths.midi.write(await reader.read(op.midiSize))
        reader.padding(op.midiPadding)
        await paths.png.write(await swapTextureBytes(await reader.read(op.pngSize)))
        reader.padding(op.pngPadding)
        await paths.milo.write(await reader.read(op.miloSize))
      } else {
        // opts.patches.length === 0
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`Internal error: Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        exportDTA.addSongs(songDTAObject)

        const paths = await mountRPCS3SongExtractionPaths(songsFolder, op.songname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(await reader.read(op.moggSize))
        reader.padding(op.moggPadding)
        await paths.midi.write(await reader.read(op.midiSize))
        reader.padding(op.midiPadding)
        await paths.png.write(await swapTextureBytes(await reader.read(op.pngSize)))
        reader.padding(op.pngPadding)
        await paths.milo.write(await reader.read(op.miloSize))
      }
    }

    await songsDtaPath.write(exportDTA.stringify({ addMAGMAValues: true, formatOptions: DTAIO.formatOptions.defaultRB3, omitUnusedValues: true }))
    await reader.close()

    return packageFolder
  } catch (err) {
    await reader.close()
    throw err
  }
}

export const extractRB3PackageToYARG = async (rb3PackagePath: RB3Package | FilePathLikeTypes, extractedPackageRootPath: DirPathLikeTypes, options?: RB3PackageExtractionOptions): Promise<DirPath> => {
  const opts = setDefaultOptions(
    {
      folderName: null,
      selectSongs: [],
      patches: [],
    },
    options
  )
  const packageFile = rb3PackagePath instanceof RB3Package ? rb3PackagePath : new RB3Package(rb3PackagePath)
  await packageFile.checkFileIntegrity()
  const songsDir = pathLikeToDirPath(extractedPackageRootPath)
  if (!songsDir.exists) await songsDir.mkDir()
  const reader = await BinaryReader.fromFile(packageFile.path)
  try {
    const { header, entries, dta } = await packageFile.stat()

    const packageFolder = songsDir.gotoDir(opts.folderName ?? header.folderName)
    if (packageFolder.exists) await packageFolder.deleteDir(true)
    await packageFolder.mkDir()

    const songsFolder = packageFolder.gotoDir('songs')
    await songsFolder.mkDir()

    const songsDtaPath = songsFolder.gotoFile('songs.dta')
    const exportDTA = new DTAParser()

    const operators: RB3SongEntriesObject[] = entries.filter((val) => {
      if (Array.isArray(opts.selectSongs) && opts.selectSongs.length === 0) {
        if (opts.selectSongs.includes(val.songname)) return true
      }
      if (typeof opts.selectSongs === 'string' && opts.selectSongs) {
        if (opts.selectSongs === val.songname) return true
      } else return true
    })
    const { binaryBlockOffset } = header

    const patchType1 = opts.patches.includes('idType1')

    for (const op of operators) {
      if (patchType1) {
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`(INTERNAL ERROR) Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        exportDTA.addSongs(songDTAObject)

        for (let i = 0; i < exportDTA.songs.length; i++) {
          const val = formatStringFromDTA(exportDTA.songs[i], '{{id1}}', 'id')
          exportDTA.songs[i] = {
            ...exportDTA.songs[i],
            id: val,
            songname: val,
          }
        }

        const paths = await mountYARGSongExtractionPaths(songsFolder, formatStringFromDTA(songDTAObject, '{{id1}}', 'id'))
        reader.seek(songBinaryOffset)
        await paths.mogg.write(await reader.read(op.moggSize))
        reader.padding(op.moggPadding)
        await paths.midi.write(await reader.read(op.midiSize))
        reader.padding(op.midiPadding)
        await paths.png.write(await reader.read(op.pngSize))
        reader.padding(op.pngPadding)
        await paths.milo.write(await reader.read(op.miloSize))
      } else {
        // opts.patches.length === 0
        const songBinaryOffset = binaryBlockOffset + op.offset
        const songDTAObject = dta.songs.find((val) => val.songname === op.songname)
        if (!songDTAObject) throw new Error(`(INTERNAL ERROR) Tried to find parsed DTA object for song in song entry "${op.songname}" but no parsed DTA object were found with this songname.`)
        exportDTA.addSongs(songDTAObject)

        const paths = await mountYARGSongExtractionPaths(songsFolder, op.songname)
        reader.seek(songBinaryOffset)
        await paths.mogg.write(await reader.read(op.moggSize))
        reader.padding(op.moggPadding)
        await paths.midi.write(await reader.read(op.midiSize))
        reader.padding(op.midiPadding)
        await paths.png.write(await reader.read(op.pngSize))
        reader.padding(op.pngPadding)
        await paths.milo.write(await reader.read(op.miloSize))
      }
    }

    await songsDtaPath.write(exportDTA.stringify({ addMAGMAValues: true, formatOptions: DTAIO.formatOptions.defaultRB3, omitUnusedValues: true }))
    await reader.close()

    return packageFolder
  } catch (err) {
    await reader.close()
    throw err
  }
}

export interface RB3PackageToSTFSExtractionOptions extends Omit<RB3PackageExtractionOptions, 'folderName'> {
  name?: string
  description?: string
}

export const extractRB3PackageToSTFS = async (onyxCLIExePath: OnyxCLI | FilePathLikeTypes, rb3PackagePath: RB3Package | FilePathLikeTypes, destSTFSFilePath: FilePathLikeTypes, options?: RB3PackageToSTFSExtractionOptions) => {
  const onyx = onyxCLIExePath instanceof OnyxCLI ? onyxCLIExePath : new OnyxCLI(onyxCLIExePath)
  onyx.checkIntegrity()
  const rb3Pack = rb3PackagePath instanceof RB3Package ? rb3PackagePath : new RB3Package(rb3PackagePath)
  const rb3PackStat = await rb3Pack.stat()
  const opts = setDefaultOptions(
    {
      selectSongs: [],
      patches: [],
      name: rb3PackStat.header.name,
      description: '',
    },
    options
  )
  const tempDir = pathLikeToDirPath(temporaryDirectory())

  try {
    const extTemp = await extractRB3PackageToYARG(rb3Pack, tempDir, options)
    const onyxRepackFolder = extTemp.gotoDir('onyx-repack')
    if (!onyxRepackFolder.exists) await onyxRepackFolder.mkDir(true)
    const onyxRepackYmlFile = onyxRepackFolder.gotoFile('repack-stfs.yaml')
    const thumbnail = onyxRepackFolder.gotoFile('thumbnail.png')
    const titleThumbnail = onyxRepackFolder.gotoFile('title-thumbnail.png')
    const repack = { ...OnyxCLI.repackSTFSRB3Object }
    repack['package-name'][0] = opts.name
    repack['package-description'][0] = opts.description
    await thumbnail.write(await ImageFile.process(rb3PackStat.artwork, 'png', { width: 64, height: 64 }))
    await titleThumbnail.write(await defaultArtwork64x64())
    await onyxRepackYmlFile.write(stringifyYaml(repack))

    console.log(tempDir.path)
    const newSTFSFile = await onyx.stfs(extTemp, destSTFSFilePath, 'rb3')

    await tempDir.deleteDir(true)
    return newSTFSFile
  } catch (err) {
    if (tempDir.exists) await tempDir.deleteDir(true)
    throw err
  }
}
