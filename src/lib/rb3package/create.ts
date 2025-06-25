import { BinaryWriter, FilePath, pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryFile } from 'tempy'
import { DTAParser, ImageFile, PythonAPI, TextureFile, type STFSFile } from '../../core.exports'
import { getSongContentsStatsByShortname, mapPackageFiles, defaultArtwork } from '../../lib.exports'

export type RB3PackageFilesTypes = FilePathLikeTypes | STFSFile

export interface RB3PackageCreationOptions {
  /**
   * The version of the song package. Default is `1`.
   */
  version?: number
  /**
   * The name of the song package, up to 80 characters.
   */
  name: string
  /**
   * The preffered folder name of the song package when processed through PS3 console and RPCS3, up to 48 characters.
   */
  folderName: string
  description?: FilePathLikeTypes | Buffer | null
  artwork?: FilePathLikeTypes | Buffer | ImageFile | TextureFile | null
  files: RB3PackageFilesTypes[]
}

/**
 * Creates a RB3 Package file buffer.
 * - - - -
 * @param {RB3PackageCreationOptions} options An object with values to be added to the RB3 Package file.
 * @returns {Promise<Buffer>}
 */
export const createRB3PackageBuffer = async (options: RB3PackageCreationOptions): Promise<Buffer> => {
  const opts = setDefaultOptions(
    {
      version: 1,
      name: '',
      folderName: '',
      description: null,
      artwork: Buffer.from(defaultArtwork),
      files: [],
    },
    options
  )

  if (opts.files.length === 0) throw new Error('No packages were selected to implement into the RB3 Package file.')
  if (opts.name === '') throw new Error("RB3 Package name can't be blank.")
  if (opts.folderName === '') throw new Error("RB3 Package folder name can't be blank.")

  if (opts.name.length > 0x50) throw new Error(`RB3 Package name can't have more than 80 characters.`)
  if (opts.folderName.length > 0x30) throw new Error(`RB3 Package folder name can't have more than 48 characters.`)

  const io = new BinaryWriter()
  const { songs, extractionFolder } = await mapPackageFiles(opts.files)
  const dta = new DTAParser()
  dta.addSongs(songs)
  dta.patchCores()
  dta.patchIDs()
  dta.patchSongsEncodings()
  dta.sort('Shortname')
  const songDTAContents = Buffer.from(dta.stringify({ addMAGMAValues: true, omitUnusedValues: true, sortBy: 'ID' }))

  let desc: Buffer, art: Buffer

  if (opts.description === null) desc = Buffer.alloc(0)
  else if (Buffer.isBuffer(opts.description)) desc = opts.description
  else desc = await pathLikeToFilePath(opts.description).read()

  if (opts.artwork === null) art = Buffer.alloc(0)
  else if (Buffer.isBuffer(opts.artwork)) art = await PythonAPI.imageBufferProcessor(opts.artwork, 'png', { width: 256, height: 256 })
  else if (opts.artwork instanceof ImageFile) art = await PythonAPI.imageBufferProcessor(opts.artwork.path, 'png', { width: 256, height: 256 })
  else if (opts.artwork instanceof TextureFile) {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.png' }))
    await opts.artwork.convertToImage(tempImg, 'png', { width: 256, height: 256 })
    art = await tempImg.read()
    await tempImg.delete()
  } else {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.png' }))
    const img = new ImageFile(pathLikeToFilePath(opts.artwork as FilePathLikeTypes))
    await img.convertToImage(tempImg, 'png', { width: 256, height: 256 })
    art = await tempImg.read()
    await tempImg.delete()
  }

  io.writeUTF8('RB3 ')
  io.writeUInt8(1)
  io.writeUInt8(opts.version)
  io.writeUInt16LE(dta.songs.length)

  const headerSize = 176
  const songEntriesBlockSize = dta.songs.length * 80
  const binaryBlockOffset = headerSize + songEntriesBlockSize + songDTAContents.length + desc.length + art.length
  io.writeUInt32LE(headerSize)
  io.writeUInt32LE(songEntriesBlockSize)
  io.writeUTF8(opts.name, 80)
  io.writeUTF8(opts.folderName, 48)

  io.writeUTF8('DATA')
  io.writeUInt32LE(songDTAContents.length)
  io.writeUTF8('DESC')
  io.writeUInt32LE(desc.length)
  io.writeUTF8('ART ')
  io.writeUInt32LE(art.length)

  io.writeUTF8('BIN ')
  io.writeUInt32LE(binaryBlockOffset)

  const operators: { songname: string; moggSize: number; moggPath: FilePath; midiSize: number; midiPath: FilePath; pngSize: number; pngPath: FilePath; miloSize: number; miloPath: FilePath; offset: number; length: number }[] = []

  let offset = 0
  for (const song of dta.songs) {
    const stat = await getSongContentsStatsByShortname(extractionFolder, song.songname)
    const binaryBlockLength = stat.moggSize + stat.midiSize + stat.pngSize + stat.miloSize
    operators.push({ songname: song.songname, ...stat, offset, length: binaryBlockLength })
    offset += binaryBlockLength
  }

  for (const op of operators) {
    io.writeASCII(op.songname, 50)
    io.writePadding(6)
    io.writeUInt32LE(op.offset)
    io.writeUInt32LE(op.length)
    io.writeUInt32LE(op.moggSize)
    io.writeUInt32LE(op.midiSize)
    io.writeUInt32LE(op.pngSize)
    io.writeUInt32LE(op.miloSize)
  }

  io.write(songDTAContents)
  io.write(desc)
  io.write(art)

  for (const op of operators) {
    io.write(await op.moggPath.read())
    io.write(await op.midiPath.read())
    io.write(await op.pngPath.read())
    io.write(await op.miloPath.read())
  }

  await extractionFolder.deleteDir(true)

  return io.toBuffer()
}
