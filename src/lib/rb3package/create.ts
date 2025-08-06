import { BinaryWriter, type FilePath, pathLikeToFilePath, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { temporaryFile } from 'tempy'
import { DTAParser, ImageFile, PythonAPI, type STFSFile, TextureFile } from '../../core.exports'
import { addPaddingToBuffer, defaultArtwork256x256, extractPackagesForRB3Package, getSongContentsStatsByShortname, isURL, paddingToMultipleOf16, type PaddedBufferObject } from '../../lib.exports'

// #region Types

export type RB3PackageFilesTypes = FilePathLikeTypes | STFSFile

export interface RB3PackageCreationOptions {
  /**
   * The version of the song package to be created. Default is `1`.
   */
  version?: number
  /**
   * The name of the song package to be created.
   */
  name: string
  /**
   * The preffered folder name of the song package to be used on PS3 console and RPCS3 environments, up to 48 characters.
   */
  defaultFolderName: string
  /**
   * The description of the song package. Default is `null` (no description file). It accepts:
   *
   * - `FilePathLikeTypes`: Instantiated `FilePath` classes pointing to a Markdown file or the path to a Markdown file as `string`.
   * - `Buffer`: Buffer object of a Markdown file.
   */
  description?: FilePathLikeTypes | Buffer | null
  /**
   * The artwork of the song package. Defaults to the Rock Band 3 logo. It accepts:
   *
   * - `FilePathLikeTypes`: Instantiated `FilePath` classes pointing to a image/texture file or the path to an image/texture file as `string`.
   * - `Buffer`: Buffer object of an image file (doesn't work with texture file buffers).
   * - Instantiated `ImageFile` or `TextureFile` classes.
   */
  artwork?: FilePathLikeTypes | Buffer | ImageFile | TextureFile | null
  /**
   * An array with CON files to be added to the package.
   */
  files: RB3PackageFilesTypes[]
}

export interface RB3PackageSongOperatorObject {
  /**
   * The shortname of the song.
   */
  songname: string
  /**
   * The offset where the song binary files block starts in the RB3 Package file.
   */
  offset: number
  /**
   * The length of the song binary files block.
   */
  length: number
  /**
   * The size of the song's MOGG file.
   */
  moggSize: number
  /**
   * The path to the song's MOGG file.
   */
  moggPath: FilePath
  /**
   * The bytes padding of the song's MOGG file binary block.
   */
  moggPadding: number
  /**
   * The size of the song's MIDI file.
   */
  midiSize: number
  /**
   * The path to the song's MIDI file.
   */
  midiPath: FilePath
  /**
   * The bytes padding of the song's MIDI file binary block.
   */
  midiPadding: number
  /**
   * The size of the song's album artwork texture file.
   */
  pngSize: number
  /**
   * The path to the song's album artwork texture file.
   */
  pngPath: FilePath
  /**
   * The bytes padding of the song's album artwork texture file binary block.
   */
  pngPadding: number
  /**
   * The size of the song's MILO file.
   */
  miloSize: number
  /**
   * The path to the song's MILO file.
   */
  miloPath: FilePath
  /**
   * The bytes padding of the song's MILO file binary block.
   */
  miloPadding: number
}

// #region Functions

/**
 * Creates a RB3 Package file buffer.
 * - - - -
 * @param {RB3PackageCreationOptions} options Options values for the creation of the RB3 Package file.
 * @returns {Promise<Buffer>}
 */
export const createRB3PackageBuffer = async (options: RB3PackageCreationOptions): Promise<Buffer> => {
  const opts = setDefaultOptions(
    {
      version: 1,
      name: '',
      defaultFolderName: '',
      description: null,
      artwork: Buffer.from(defaultArtwork256x256),
      files: [],
    },
    options
  )

  if (opts.version < 1 || opts.version > 255) throw new Error(`Provided package version is not valid. Package version must be between 1 and 255, provided ${opts.version.toString()}.`)
  if (opts.name === '') throw new Error("RB3 Package name can't be blank.")
  if (opts.defaultFolderName === '') throw new Error("RB3 Package default folder name can't be blank.")

  if (opts.name.length > 256) throw new Error(`RB3 Package name can't have more than 80 characters.`)
  if (opts.defaultFolderName.length > 48) throw new Error(`RB3 Package folder name can't have more than 48 characters.`)

  const io = new BinaryWriter()
  const dta = new DTAParser()
  const { songs, extractionFolder } = await extractPackagesForRB3Package(opts.files)
  dta.addSongs(songs)

  let desc: PaddedBufferObject, art: PaddedBufferObject

  if (opts.description === null) desc = addPaddingToBuffer(Buffer.alloc(0))
  else if (Buffer.isBuffer(opts.description)) desc = addPaddingToBuffer(opts.description)
  else desc = addPaddingToBuffer(await pathLikeToFilePath(opts.description).read())

  const artworkOptions = { width: 256, height: 256 }
  if (opts.artwork === null) art = addPaddingToBuffer(Buffer.alloc(0))
  else if (Buffer.isBuffer(opts.artwork)) art = addPaddingToBuffer(await PythonAPI.imageBufferProcessor(opts.artwork, 'webp', artworkOptions))
  else if (opts.artwork instanceof ImageFile) art = addPaddingToBuffer(await PythonAPI.imageBufferProcessor(opts.artwork.path, 'webp', artworkOptions))
  else if (opts.artwork instanceof TextureFile) {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.webp' }))
    await opts.artwork.convertToImage(tempImg, 'webp', artworkOptions)
    art = addPaddingToBuffer(await tempImg.read())
    await tempImg.delete()
  } else if (typeof opts.artwork === 'string' && isURL(opts.artwork)) {
    const rawBuffer = await ImageFile.urlToBuffer(opts.artwork)
    art = addPaddingToBuffer(await ImageFile.process(rawBuffer, 'webp', artworkOptions))
  } else {
    const tempImg = pathLikeToFilePath(temporaryFile({ extension: '.webp' }))
    const img = new ImageFile(pathLikeToFilePath(opts.artwork as FilePathLikeTypes))
    await img.convertToImage(tempImg, 'webp', artworkOptions)
    art = addPaddingToBuffer(await tempImg.read())
    await tempImg.delete()
  }

  try {
    dta.patchCores()
    dta.patchIDs()
    dta.patchSongsEncodings()
    dta.sort('Shortname')
    const songDTAContents = addPaddingToBuffer(Buffer.from(dta.stringify({ addMAGMAValues: true, omitUnusedValues: true, sortBy: 'ID' })))
    io.writeASCII('RB3P')
    io.writeUInt8(1)
    io.writeUInt8(opts.version)
    io.writeUInt16LE(dta.songs.length)

    const headerSize = 352
    const songEntriesBlockSize = dta.songs.length * 80
    const binaryBlockStart = headerSize + songEntriesBlockSize + songDTAContents.newBuffer.byteLength + desc.newBuffer.byteLength + art.newBuffer.byteLength
    io.writeUInt32LE(headerSize)
    io.writeUInt32LE(songEntriesBlockSize)

    io.writeASCII('DAT')
    io.writeUInt8(songDTAContents.padding)
    io.writeUInt32LE(songDTAContents.newBuffer.byteLength)

    io.writeASCII('DSC')
    io.writeUInt8(desc.padding)
    io.writeUInt32LE(desc.newBuffer.byteLength)

    io.writeASCII('ART')
    io.writeUInt8(art.padding)
    io.writeUInt32LE(art.newBuffer.byteLength)

    io.writeASCII('BIN')
    io.writeUInt8(0)
    io.writeUInt32LE(binaryBlockStart)

    io.writeUTF8(opts.name, 256)
    io.writeUTF8(opts.defaultFolderName, 48)

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
      io.writeUInt32LE(op.moggSize + op.moggPadding)
      io.writeUInt32LE(op.midiSize + op.midiPadding)
      io.writeUInt32LE(op.pngSize + op.pngPadding)
      io.writeUInt32LE(op.miloSize + op.miloPadding)
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
  } catch (err) {
    await extractionFolder.deleteDir(true)
    throw err
  }
}
