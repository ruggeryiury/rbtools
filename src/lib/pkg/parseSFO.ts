import { BinaryReader, HexStr, pathLikeToString, type FilePathLikeTypes } from 'node-lib'

export interface SFODataObject {
  /**
   * The key name of the entry.
   */
  keyName: string
  data: string
  keyOffset: number
  paramFormat: 'utf8special' | 'utf8' | 'uint32'
  paramLength: number
  paramMaxLength: number
  dataOffset: number
}

export interface SFOData {
  /**
   * The semantic version of the file.
   */
  version: string
  /**
   * The start offset of the key table.
   */
  keyTableStartOffset: number
  /**
   * The start offset of the data table.
   */
  dataTableStartOffset: number
  /**
   * The amount of entries of the SFO file.
   */
  tableEntriesCount: number
  /**
   * The data of the entries of the SFO file.
   */
  data: SFODataObject[]
}

/**
 * Parses the information of a `PARAM.SFO` file buffer.
 * - - - -
 * @param {Buffer | BinaryReader} bufferOrReader A `Buffer` of the SFO file or a `BinaryReader` class instantiated to a SFO file.
 * @param {FilePathLikeTypes} [file] `OPTIONAL` The path to the corresponding SFO file that you've working on. This parameter is only used when passing a `BinaryReader` argument to work upon.
 * @returns {Promise<SFOData>}
 */
export const parseSFOFromBuffer = async (bufferOrReader: Buffer | BinaryReader, file?: FilePathLikeTypes): Promise<SFOData> => {
  let reader: BinaryReader
  if (Buffer.isBuffer(bufferOrReader)) reader = BinaryReader.fromBuffer(bufferOrReader)
  else if (file && bufferOrReader instanceof BinaryReader) reader = bufferOrReader
  else throw new Error(`Invalid argument pairs for "bufferOrReader" and "file" provided while trying to read PS3 SFO file or buffer.`)

  const magic = await reader.readHex(4)
  if (magic !== '0x00505346') throw new Error(file ? `Provided file "${pathLikeToString(file)}" has invalid PS3 SFO file signature.` : 'Provided buffer has invalid PS3 SFO file buffer signature.')
  let version = ''
  version += `${(await reader.readUInt8()).toString()}.`
  version += (await reader.readUInt8()).toString()
  reader.padding(0x02)
  const keyTableStartOffset = await reader.readUInt32LE()
  const dataTableStartOffset = await reader.readUInt32LE()
  const tableEntriesCount = await reader.readUInt32LE()
  const data: SFODataObject[] = []

  for (let i = 0; i < tableEntriesCount; i++) {
    const keyName = ''
    const keyOffset = await reader.readUInt16LE()
    reader.padding(0x01)
    let paramFormat: SFODataObject['paramFormat'] = 'utf8special'
    switch (await reader.readUInt8()) {
      case 0:
        break
      case 2:
        paramFormat = 'utf8'
        break
      case 4:
        paramFormat = 'uint32'
        break
    }
    const paramLength = await reader.readUInt32LE()
    const paramMaxLength = await reader.readUInt32LE()
    const dataOffset = await reader.readUInt32LE()

    data.push({
      keyName,
      data: '',
      keyOffset,
      paramFormat,
      paramLength,
      paramMaxLength,
      dataOffset,
    })
  }

  let i = 0,
    readKeyBytes = 0,
    readDataBytes = 0

  for (const entry of data) {
    const keyOffset = keyTableStartOffset + entry.keyOffset
    const dataOffset = dataTableStartOffset + entry.dataOffset
    let keyLength = 0,
      dataLength = 0
    if (i === data.length - 1) {
      keyLength = dataTableStartOffset - keyOffset
      dataLength = reader.length - dataOffset
    } else {
      keyLength = data[i + 1].keyOffset - readKeyBytes
      dataLength = data[i + 1].dataOffset - readDataBytes
    }

    // Read key first
    reader.seek(keyOffset)
    const keyName = await reader.readUTF8(keyLength)
    readKeyBytes += keyLength

    // Read data
    reader.seek(dataOffset)
    let entryData
    switch (entry.paramFormat) {
      case 'utf8':
      case 'utf8special':
        entryData = await reader.readUTF8(dataLength)
        break
      case 'uint32':
        entryData = HexStr.processHex(await reader.readUInt32LE())
        break
    }
    readDataBytes += dataLength

    data[i] = { ...entry, keyName, data: entryData }
    i++
  }

  await reader.close()
  return {
    version,
    keyTableStartOffset,
    dataTableStartOffset,
    tableEntriesCount,
    data,
  }
}

/**
 * Parses the information of a `PARAM.SFO` file.
 * - - - -
 * @param {FilePathLikeTypes} sfoFilePath A path to a `PARAM.SFO` file to be parsed.
 * @returns {Promise<SFOData>}
 */
export const parseSFOFromFile = async (sfoFilePath: FilePathLikeTypes): Promise<SFOData> => {
  const reader = await BinaryReader.fromFile(sfoFilePath)
  return await parseSFOFromBuffer(reader, sfoFilePath)
}
