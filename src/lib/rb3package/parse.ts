import { BinaryReader, type FilePathLikeTypes } from 'node-lib'
import type { RB3PackageSongOperatorObject } from '../../lib.exports'

// #region Types
export interface RB3PackageHeaderObject {
  /**
   * The version of the RB3 Package file itself.
   */
  rb3PackageVersion: number
  /**
   * The version of the created song package.
   */
  songPackageVersion: number
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
   * The preffered folder name of the song package to be used on PS3 console and RPCS3 environments.
   */
  defaultFolderName: string
  /**
   * The bytes padding of the package DTA file binary block.
   */
  dtaPadding: number
  /**
   * The length of the package's DTA file.
   */
  dtaSize: number
  /**
   * The bytes padding of the package description binary block.
   */
  descPadding: number
  /**
   * The length of the package description.
   */
  descSize: number
  /**
   * The bytes padding of the package artwork binary block.
   */
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

export type RB3SongEntriesObject = Omit<RB3PackageSongOperatorObject, 'moggPath' | 'midiPath' | 'pngPath' | 'miloPath'>

// #region Functions

export const parseRB3PackageHeader = async (bufferOrReader: BinaryReader | Buffer, filePath?: FilePathLikeTypes): Promise<RB3PackageHeaderObject> => {
  let reader: BinaryReader
  if (Buffer.isBuffer(bufferOrReader)) reader = BinaryReader.fromBuffer(bufferOrReader)
  else if (filePath && bufferOrReader instanceof BinaryReader) reader = bufferOrReader
  else throw new Error(`Invalid argument pairs for "bufferOrReader" and "file" provided while trying to read RB3 Package or buffer.`)
  const map = new Map<keyof RB3PackageHeaderObject, unknown>()

  if (reader.length < 176) throw new Error('RB3 Package is too small to process, is the file corrupted?')
  reader.seek(0)

  const magic = await reader.readASCII(4)
  if (magic !== 'RB3P') throw new Error(`Invalid file signature of RB3 Package ${filePath ? 'file' : 'buffer'}.`)

  map.set('rb3PackageVersion', await reader.readUInt8())
  map.set('songPackageVersion', await reader.readUInt8())
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
  map.set('name', await reader.readUTF8(256))
  map.set('defaultFolderName', await reader.readUTF8(48))

  return Object.fromEntries(map.entries()) as Record<keyof RB3PackageHeaderObject, unknown> as RB3PackageHeaderObject
}

export const parseRB3PackageEntries = async (header: RB3PackageHeaderObject, bufferOrReader: BinaryReader | Buffer, filePath?: FilePathLikeTypes): Promise<RB3SongEntriesObject[]> => {
  let reader: BinaryReader
  if (Buffer.isBuffer(bufferOrReader)) reader = BinaryReader.fromBuffer(bufferOrReader)
  else if (filePath && bufferOrReader instanceof BinaryReader) reader = bufferOrReader
  else throw new Error(`Invalid argument pairs for "bufferOrReader" and "file" provided while trying to read RB3 Package or buffer.`)

  reader.seek(header.headerSize)
  const entries: RB3SongEntriesObject[] = []

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
