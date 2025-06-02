import { BinaryReader, FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes, HexVal, pathLikeToFilePath, randomByteFromRanges } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { BinaryAPI, EDATFile, PythonAPI, type MIDIFileStatPythonObject } from '../core.exports'

// #region Types

export interface MIDIFileJSONRepresentation extends FilePathJSONRepresentation, MIDIFileStatPythonObject {}

export interface EDATEncryptionOptions {
  /**
   * The Content ID to the encrypted EDAT file. You can generate formatted Content IDs using static `EDATFile.genContentID()`.
   */
  contentID: string
  /**
   * The pack folder name where the song will be installed, to create a DevKLic based on the folder's name.
   */
  packFolderName: string
  /**
   * `OPTIONAL` The destination of the encrypted EDAT file. If no destination path is provided, it will simply add the `.edat` extension on the file name and save it on the same directory of the decrypted file.
   */
  destPath?: FilePathLikeTypes
}

export class MIDIFile {
  // #region Constructor

  /**
   * The path to the MIDI file.
   */
  path: FilePath

  /**
   * `MIDIFile` is a class that represents a MIDI file.
   * - - - -
   * @param {FilePathLikeTypes} midiFilePath The path of the MIDI file.
   */
  constructor(midiFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(midiFilePath)
  }

  /**
   * Checks the integrity of the EDAT by reading the file signature (magic).
   * - - - -
   * @returns {Promise<string>}
   * @throws {Error} When it identifies file signature of a MIDI file or any unknown file format.
   */
  private async checkFileIntegrity(): Promise<string> {
    if (!this.path.exists) throw new Error(`Provided MIDI file path "${this.path.path}" does not exists`)
    const magic = await BinaryReader.fromBuffer(await this.path.readOffset(0, 4)).readUInt32LE()

    // MThd
    if (magic === 0x6468544d) return HexVal.processHex(0x6468544d)
    // NPD
    else if (magic === 0x44504e) throw new Error(`Provided MIDI file "${this.path.path}" is an encrypted EDAT file.`)
    throw new Error(`Provided EDAT file "${this.path.path}" is not a valid EDAT or decrypted MIDI file with no HMX EDAT header.`)
  }

  /**
   * Returns an object with stats of the MIDI file.
   * - - - -
   * @returns {Promise<MIDIFileStatPythonObject>}
   */
  async stat(): Promise<MIDIFileStatPythonObject> {
    await this.checkFileIntegrity()
    return await PythonAPI.midiFileStat(this.path)
  }

  /**
   * Returns a JSON representation of this `MIDIFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the MIDI file path.
   * - - - -
   * @returns {Promise<MIDIFileJSONRepresentation>}
   */
  async toJSON(): Promise<MIDIFileStatPythonObject> {
    return {
      ...this.path.toJSON(),
      ...(await this.stat()),
    }
  }

  /**
   * Encrypts the MIDI file using custom 16-bytes `devKLic` key hash and returns an instance of `EDATFile` pointing to the new encrypted EDAT file.
   * - - - -
   * @param {EDATEncryptionOptions} options An object with values that changes the behavior of the encryption process.
   * @returns {Promise<EDATFile>}
   */
  async encrypt(options: EDATEncryptionOptions): Promise<EDATFile> {
    const { contentID, destPath, packFolderName } = setDefaultOptions({ contentID: EDATFile.genContentID(`RBTOOLSEDAT${randomByteFromRanges(6, ['numbers']).toString()}`), packFolderName: 'RBTOOLS', destPath: this.path.fullname }, options)

    return await BinaryAPI.edatToolEncrypt(this.path, contentID, EDATFile.genDevKLicHash(packFolderName), destPath)
  }
}
