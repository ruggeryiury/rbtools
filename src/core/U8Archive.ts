import { BinaryReader, DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, FilePath, type FilePathLikeTypes } from 'node-lib'

// #region Types

export interface U8ArchiveEntries {
  /**
   * The name of the file or directory.
   */
  name: string
  /**
   * The type of the node.
   */
  nodeType: 'file' | 'dir'
  /**
   * The offset of the entry name in the string pool.
   */
  stringPoolOffset: number
  /**
   * - File: Offset of begin of data.
   * - Directory: Index of the parent directory.
   */
  fileDataOffset: number
  /**
   * - File: Size of data.
   * - Directory: Index of the first node that is not part of this directory (skip to node).
   */
  fileDataSize: number
}

export interface U8AppFileHeader {
  /**
   * The file signature. Always `55` `AA` `38` `2D`.
   */
  magic: string
  /**
   * The offset to the first node.
   */
  firstNodeOffset: number
  /**
   * Size of all nodes including the string table.
   */
  allNodesSizePlusStringTable: number
  /**
   * File offset of data.
   */
  dataOffset: number
  /**
   * The offset of the string pool.
   */
  stringPoolOffset: number
  /**
   * The amount of file entries on the U8 archive.
   */
  entriesCount: number
  /**
   * An array with the entries of the archive.
   */
  entries: U8ArchiveEntries[]
}

// #region Main Class

/**
 * `U8Archive` is a class that represents a Wii APP file.
 */
export class U8Archive {
  /**
   * The path to the Wii APP file.
   */
  path: FilePath

  /**
   * `U8Archive` is a class that represents a Wii APP file.
   * - - - -
   * @param {FilePathLikeTypes} appFilePath The path of the U8 file.
   */
  constructor(appFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(appFilePath)
    if (this.path.ext !== '.app') throw new Error(`Provided file "${this.path.path} is not a valid U8 archive file"`)
  }

  /**
   * Checks the integrity of the U8 file.
   *
   * This function checks existence of the file and the file signature.
   * - - - -
   * @returns {Promise<boolean>}
   * @throws {Error} When it identifies file signature of any unknown file format.
   */
  async checkFileIntegrity(): Promise<boolean> {
    if (!this.path.exists) throw new Error(`Provided Wii APP file path "${this.path.path}" does not exists`)
    const magic = (await this.path.readOffset(0, 4)).readUint32BE()
    if (magic === 0x55aa382d) return true
    throw new Error(`Provided Wii APP file "${this.path.path}" is not a valid Wii APP file`)
  }

  /**
   * Parses the U8 archive header and entries.
   * - - - -
   * @returns {Promise<U8AppFileHeader>}
   * @throws {Error} When it identifies file signature of any unknown file format.
   */
  private async parseU8ArchiveHeader(): Promise<U8AppFileHeader> {
    await this.checkFileIntegrity()
    const reader = await BinaryReader.fromFile(this.path)
    const magic = await reader.readHex(4)
    const firstNodeOffset = await reader.readInt32BE()
    const allNodesSizePlusStringTable = await reader.readInt32BE()
    const dataOffset = await reader.readInt32BE()
    reader.seek(firstNodeOffset)
    const filesSpec: { nodeType: 'file' | 'dir'; stringPoolOffset: number; fileDataOffset: number; fileDataSize: number }[] = []

    let gettingNodesData = true
    let entriesCount = 0
    do {
      const dataTable = await reader.read(0xc)
      const dataReader = BinaryReader.fromBuffer(dataTable)
      const nodeType = (await dataReader.readUInt8()) === 0 ? 'file' : 'dir'
      const stringPoolOffset = await dataReader.readUInt24BE()
      if (stringPoolOffset > allNodesSizePlusStringTable) {
        gettingNodesData = false
        continue
      }
      const fileDataOffset = await dataReader.readUInt32BE()
      const fileDataSize = await dataReader.readUInt32BE()
      entriesCount++
      filesSpec.push({ nodeType, stringPoolOffset, fileDataOffset, fileDataSize })
      continue
    } while (gettingNodesData)

    const entries: { name: string; nodeType: 'file' | 'dir'; stringPoolOffset: number; fileDataOffset: number; fileDataSize: number }[] = []
    const stringPoolOffset = 0x20 + entriesCount * 0xc
    let nextStringOffset = 0
    reader.seek(stringPoolOffset)

    for (let i = 0; i < filesSpec.length; i++) {
      reader.seek(stringPoolOffset + nextStringOffset)
      const spec = filesSpec[i]
      if (i === 0) {
        entries.push({
          name: '.',
          ...spec,
        })
        nextStringOffset = filesSpec[i + 1].stringPoolOffset
      } else if (i < filesSpec.length - 1) {
        entries.push({ name: await reader.readASCII(filesSpec[i + 1].stringPoolOffset - nextStringOffset), ...spec })
        nextStringOffset = filesSpec[i + 1].stringPoolOffset
      } else {
        entries.push({ name: await reader.readASCII(dataOffset - stringPoolOffset - nextStringOffset), ...spec })
      }
    }

    await reader.close()

    return {
      magic,
      firstNodeOffset,
      allNodesSizePlusStringTable,
      dataOffset,
      stringPoolOffset,
      entriesCount,
      entries,
    }
  }

  /**
   * Extracts the U8 archive into a folder.
   * - - - -
   * @param {DirPathLikeTypes} destPath The destination folder where the contents will be extracted.
   * @throws {Error} When it identifies file signature of any unknown file format.
   */
  async extract(destPath: DirPathLikeTypes): Promise<void> {
    const dest = pathLikeToDirPath(destPath)
    const header = await this.parseU8ArchiveHeader()
    const reader = await BinaryReader.fromFile(this.path)
    const entries: { path: FilePath | DirPath; nodeType: 'file' | 'dir'; data?: Buffer }[] = [
      {
        path: dest,
        nodeType: 'dir',
      },
    ]
    let lastDir = dest
    for (let i = 0; i < header.entries.length; i++) {
      if (i === 0) continue
      const entry = header.entries[i]
      if (entry.nodeType === 'dir') {
        const parentFolderIndex = entry.fileDataOffset
        entries.push({
          path: DirPath.of(entries[parentFolderIndex].path.path, entry.name),
          nodeType: 'dir',
        })
        lastDir = entries[entries.length - 1].path as DirPath
      } else {
        reader.seek(entry.fileDataOffset)
        const data = await reader.read(entry.fileDataSize)
        entries.push({
          path: FilePath.of(lastDir.path, entry.name),
          nodeType: 'file',
          data,
        })
      }
    }
    await reader.close()

    for (const entry of entries) {
      if (entry.nodeType === 'dir') {
        if (!entry.path.exists) await (entry.path as DirPath).mkDir()
      } else {
        if (entry.data) {
          await (entry.path as FilePath).write(entry.data)
        }
      }
    }
  }
}
