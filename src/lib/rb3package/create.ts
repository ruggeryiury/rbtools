import { BinaryWriter, FilePath, pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryFile } from 'tempy'
import { DTAParser, ImageFile, PythonAPI, TextureFile, type STFSFile } from '../../core.exports'
import { getSongContentsStatsByShortname, mapPackageFiles, defaultArtwork256x256, isURL } from '../../lib.exports'

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
 * Calculates the padding necessary to get a byte length to a multiple of 16.
 * - - - -
 * @param {Buffer | number} bufferOrLength A buffer object or the length of a buffer object to calculate the padding
 * @returns {number}
 */
export const paddingToMultipleOf16 = (bufferOrLength: Buffer | number): number => {
  const remainder = (Buffer.isBuffer(bufferOrLength) ? bufferOrLength.length : bufferOrLength) % 16
  return (16 - remainder) % 16
}

export interface PaddedBufferObject {
  /**
   * The unprocessed buffer.
   */
  oldBuffer: Buffer
  /**
   * The buffer with the added padding.
   */
  newBuffer: Buffer
  /**
   * The amount of padding inserted to the buffer.
   */
  padding: number
}

/**
 *
 * - - - -
 * @param {Buffer} buffer a
 * @returns {PaddedBufferObject}
 */
export const addPaddingToBuffer = (buffer: Buffer): PaddedBufferObject => {
  const padding = paddingToMultipleOf16(buffer)
  const newBuffer = Buffer.alloc(buffer.length + padding)
  buffer.copy(newBuffer, 0, 0, buffer.length)
  return {
    oldBuffer: buffer,
    newBuffer: newBuffer,
    padding,
  }
}

export interface RB3PackageSongOperatorObject {
  songname: string
  offset: number
  length: number
  moggSize: number
  moggPath: FilePath
  moggPadding: number
  midiSize: number
  midiPath: FilePath
  midiPadding: number
  pngSize: number
  pngPath: FilePath
  pngPadding: number
  miloSize: number
  miloPath: FilePath
  miloPadding: number
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
      artwork: Buffer.from(defaultArtwork256x256),
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
  const songDTAContents = addPaddingToBuffer(Buffer.from(dta.stringify({ addMAGMAValues: true, omitUnusedValues: true, sortBy: 'ID' })))

  let desc: PaddedBufferObject, art: PaddedBufferObject

  if (opts.description === null) desc = addPaddingToBuffer(Buffer.alloc(0))
  else if (Buffer.isBuffer(opts.description)) desc = addPaddingToBuffer(opts.description)
  else desc = addPaddingToBuffer(await pathLikeToFilePath(opts.description).read())

  if (opts.artwork === null) art = addPaddingToBuffer(Buffer.alloc(0))
  else if (Buffer.isBuffer(opts.artwork)) art = addPaddingToBuffer(await PythonAPI.imageBufferProcessor(opts.artwork, 'png', { width: 256, height: 256 }))
  else if (opts.artwork instanceof ImageFile) art = addPaddingToBuffer(await PythonAPI.imageBufferProcessor(opts.artwork.path, 'png', { width: 256, height: 256 }))
  else if (opts.artwork instanceof TextureFile) {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.webp' }))
    await opts.artwork.convertToImage(tempImg, 'webp', { width: 256, height: 256 })
    art = addPaddingToBuffer(await tempImg.read())
    await tempImg.delete()
  } else if (typeof opts.artwork === 'string' && isURL(opts.artwork)) {
    const rawBuffer = await ImageFile.urlToBuffer(opts.artwork)
    art = addPaddingToBuffer(await ImageFile.process(rawBuffer, 'png', { height: 256, width: 256 }))
  } else {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.webp' }))
    const img = new ImageFile(pathLikeToFilePath(opts.artwork as FilePathLikeTypes))
    await img.convertToImage(tempImg, 'webp', { width: 256, height: 256 })
    art = addPaddingToBuffer(await tempImg.read())
    await tempImg.delete()
  }

  io.writeASCII('RB3 ')
  io.writeUInt8(1)
  io.writeUInt8(opts.version)
  io.writeUInt16LE(dta.songs.length)

  const headerSize = 176
  const songEntriesBlockSize = dta.songs.length * 80
  const binaryBlockOffset = headerSize + songEntriesBlockSize + songDTAContents.newBuffer.length + desc.newBuffer.length + art.newBuffer.length
  io.writeUInt32LE(headerSize)
  io.writeUInt32LE(songEntriesBlockSize)
  io.writeASCII('DAT')
  io.writeUInt8(songDTAContents.padding)
  io.writeUInt32LE(songDTAContents.oldBuffer.length)
  io.writeASCII('DSC')
  io.writeUInt8(desc.padding)
  io.writeUInt32LE(desc.oldBuffer.length)
  io.writeASCII('ART')
  io.writeUInt8(art.padding)
  io.writeUInt32LE(art.oldBuffer.length)
  io.writeASCII('BIN0')
  io.writeUInt32LE(binaryBlockOffset)

  io.writeUTF8(opts.name, 80)
  io.writeUTF8(opts.folderName, 48)

  const operators: RB3PackageSongOperatorObject[] = []

  let offset = 0
  for (const song of dta.songs) {
    const stat = await getSongContentsStatsByShortname(extractionFolder, song.songname)
    const moggPadding = paddingToMultipleOf16(stat.moggSize)
    const midiPadding = paddingToMultipleOf16(stat.midiSize)
    const pngPadding = paddingToMultipleOf16(stat.pngSize)
    const miloPadding = paddingToMultipleOf16(stat.miloSize)
    const binaryBlockLength = stat.moggSize + moggPadding + stat.midiSize + midiPadding + stat.pngSize + pngPadding + stat.miloSize + miloPadding
    operators.push({ songname: song.songname, ...stat, offset, length: binaryBlockLength, moggPadding, midiPadding, pngPadding, miloPadding })
    offset += binaryBlockLength
  }

  for (const op of operators) {
    io.writeASCII(op.songname, 50)
    io.writePadding(2)
    io.writeUInt32LE(op.offset)
    io.writeUInt32LE(op.length)
    io.writeUInt8(op.moggPadding)
    io.writeUInt8(op.midiPadding)
    io.writeUInt8(op.pngPadding)
    io.writeUInt8(op.miloPadding)
    io.writeUInt32LE(op.moggSize)
    io.writeUInt32LE(op.midiSize)
    io.writeUInt32LE(op.pngSize)
    io.writeUInt32LE(op.miloSize)
  }

  io.write(songDTAContents.newBuffer)
  io.write(desc.newBuffer)
  io.write(art.newBuffer)

  for (const op of operators) {
    io.write(addPaddingToBuffer(await op.moggPath.read()).newBuffer)
    io.write(addPaddingToBuffer(await op.midiPath.read()).newBuffer)
    io.write(addPaddingToBuffer(await op.pngPath.read()).newBuffer)
    io.write(addPaddingToBuffer(await op.miloPath.read()).newBuffer)
  }

  await extractionFolder.deleteDir(true)

  return io.toBuffer()
}
