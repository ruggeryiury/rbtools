import { BinaryReader, type FilePathLikeTypes } from 'node-lib'

export interface RB3PackageHeaderObject {
  /**
   * The revision of the RB3 Package file.
   */
  revision: number
  /**
   * The version of the created package.
   */
  version: number
  /**
   * The amount of songs inside the package.
   */
  songsCount: number
  /**
   * The length of the RB3 Package file header.
   *
   * Revision 1: Always 0xb0 (176 bytes).
   */
  headerSize: number
  /**
   * The length of the song entries block.
   */
  songEntriesBlockSize: number
  /**
   * The name of the package.
   */
  name: string
  /**
   * The suggested name of the package folder for PS3 console/RPCS3 environment.
   */
  folderName: string
  dtaPadding: number
  /**
   * The length of the package's DTA file.
   */
  dtaSize: number
  descPadding: number
  /**
   * The length of the package description.
   */
  descSize: number
  artworkPadding: number
  /**
   * The length of the package thumbnail.
   */
  artworkSize: number
  /**
   * The offset start of the package's binary data.
   */
  binaryBlockOffset: number
}

/**
 * Parses a RB3 Package file header.
 * - - - -
 * @param {BinaryReader | Buffer} bufferOrReader A instantiated `BinaryReader` class pointing to a RB3 Package file, or a buffer of a RB3 Package file.
 * @param {FilePathLikeTypes} [file] `OPTIONAL` The path to the RB3 Package file.
 * @returns {Promise<RB3PackageHeaderObject>}
 */
export const parseRB3PackageHeader = async (bufferOrReader: BinaryReader | Buffer, file?: FilePathLikeTypes): Promise<RB3PackageHeaderObject> => {
  let reader: BinaryReader
  if (Buffer.isBuffer(bufferOrReader)) reader = BinaryReader.fromBuffer(bufferOrReader)
  else if (file && bufferOrReader instanceof BinaryReader) reader = bufferOrReader
  else throw new Error(`Invalid argument pairs for "bufferOrReader" and "file" provided while trying to read RB3 Package or buffer.`)
  const map = new Map<keyof RB3PackageHeaderObject, unknown>()

  if (reader.length < 176) throw new Error('')
  reader.seek(0)

  const magic = await reader.readASCII(4)
  if (magic !== 'RB3 ') throw new Error('')

  map.set('revision', await reader.readUInt8())
  map.set('version', await reader.readUInt8())
  map.set('songsCount', await reader.readUInt16LE())
  map.set('headerSize', await reader.readUInt32LE())
  map.set('songEntriesBlockSize', await reader.readUInt32LE())
  reader.padding(3)
  map.set('dtaPadding', await reader.readUInt8())
  map.set('dtaSize', await reader.readUInt32LE())
  reader.padding(3)
  map.set('descPadding', await reader.readUInt8())
  map.set('descSize', await reader.readUInt32LE())
  reader.padding(3)
  map.set('artworkPadding', await reader.readUInt8())
  map.set('artworkSize', await reader.readUInt32LE())
  reader.padding(4)
  map.set('binaryBlockOffset', await reader.readUInt32LE())
  map.set('name', await reader.readUTF8(80))
  map.set('folderName', await reader.readUTF8(48))

  return Object.fromEntries(map.entries()) as Record<keyof RB3PackageHeaderObject, unknown> as RB3PackageHeaderObject
}

export interface RB3SongEntriesObject {
  /**
   * The songname (shortname) of the song.
   */
  songname: string
  /**
   * The offset start of the song's binary files, relative to header's `binaryBlockOffset` value.
   */
  offset: number
  /**
   * The length of the entire song's files block.
   */
  length: number
  moggPadding: number
  /**
   * The length of the song's MOGG file.
   */
  moggSize: number
  midiPadding: number
  /**
   * The length of the song's MIDI file.
   */
  midiSize: number
  pngPadding: number
  /**
   * The length of the song's texture file.
   */
  pngSize: number
  miloPadding: number
  /**
   * The length of the song's MILO file.
   */
  miloSize: number
}

/**
 * Parses a RB3 Package file song entries block.
 * - - - -
 * @param {RB3PackageHeaderObject} header The RB3 Package parsed header values.
 * @param {BinaryReader | Buffer} bufferOrReader A instantiated `BinaryReader` class pointing to a RB3 Package file, or a buffer of a RB3 Package file.
 * @param {FilePathLikeTypes} [file] `OPTIONAL` The path to the RB3 Package file.
 * @returns {Promise<RB3SongEntriesObject[]>}
 */
export const parseRB3PackageEntries = async (header: RB3PackageHeaderObject, bufferOrReader: BinaryReader | Buffer, file?: FilePathLikeTypes): Promise<RB3SongEntriesObject[]> => {
  let reader: BinaryReader
  if (Buffer.isBuffer(bufferOrReader)) reader = BinaryReader.fromBuffer(bufferOrReader)
  else if (file && bufferOrReader instanceof BinaryReader) reader = bufferOrReader
  else throw new Error(`Invalid argument pairs for "bufferOrReader" and "file" provided while trying to read RB3 Package or buffer.`)

  // Revision 1 song entries block offset
  reader.seek(176)
  const entries = []

  for (let i = 0; i < header.songsCount; i++) {
    const map = new Map<keyof RB3SongEntriesObject, unknown>()

    map.set('songname', await reader.readASCII(50))
    reader.padding(2)
    map.set('offset', await reader.readUInt32LE())
    map.set('length', await reader.readUInt32LE())
    map.set('moggPadding', await reader.readUInt8())
    map.set('midiPadding', await reader.readUInt8())
    map.set('pngPadding', await reader.readUInt8())
    map.set('miloPadding', await reader.readUInt8())
    map.set('moggSize', await reader.readUInt32LE())
    map.set('midiSize', await reader.readUInt32LE())
    map.set('pngSize', await reader.readUInt32LE())
    map.set('miloSize', await reader.readUInt32LE())

    entries.push(Object.fromEntries(map.entries()) as Record<keyof RB3SongEntriesObject, unknown> as RB3SongEntriesObject)
  }

  return entries
}
