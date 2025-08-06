import { type DirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { PythonAPI, type MOGGFileStatPythonObject } from '../core.exports'
import type { RB3CompatibleDTAFile } from '../lib.exports'

// #region Types

export interface MOGGFileJSONRepresentation extends FilePathJSONRepresentation, MOGGFileStatPythonObject {}
export type MOGGFileEncryptionVersion = 10 | 11 | 12 | 13

/**
 * `MOGGFile` is a class that represents a MOGG file.
 */
export class MOGGFile {
  // #region Constructor

  /**
   * The path to the MOGG file.
   */
  path: FilePath

  /**
   * `MOGGFile` is a class that represents a MOGG file.
   * - - - -
   * @param {FilePathLikeTypes} moggFilePath The path of the MOGG file.
   */
  constructor(moggFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(moggFilePath)
  }

  // #region Methods

  /**
   * Checks the integrity of the instantiated MOGG file by reading its signature (magic bytes).
   *
   * This function returns the encryption version of the MOGG file, if the MOGG file is valid.
   * - - - -
   * @returns {Promise<number>}
   * @throws {Error} When it identifies file signature of a multitrack OGG file with no MOGG header or any unknown file format.
   */
  async checkFileIntegrity(): Promise<number> {
    if (!this.path.exists) throw new Error(`Provided MOGG file "${this.path.path}" does not exists`)
    const magic = (await this.path.readOffset(0, 4)).readUint32LE()
    if (magic === 1399285583) throw new Error(`Provided MOGG file "${this.path.path}" is a decrypted OGG file with no HMX MOGG header`)
    else if (magic >= 10 && magic <= 17) return magic
    throw new Error(`Provided MOGG file "${this.path.path}" is not a valid MOGG or decrypted OGG file with no HMX MOGG header`)
  }

  /**
   * Checks if the MOGG file is encrypted.
   * - - - -
   * @returns {Promise<boolean>}
   * @throws {Error} When it identifies file signature of a multitrack OGG file with no MOGG header or any unknown file format.
   */
  async isEncrypted(): Promise<boolean> {
    return (await this.checkFileIntegrity()) > 10
  }

  /**
   * Returns an object with stats of the MOGG file.
   * - - - -
   * @returns {Promise<MOGGFileStatPythonObject>}
   */
  async stat(): Promise<MOGGFileStatPythonObject> {
    await this.checkFileIntegrity()
    return await PythonAPI.moggFileStat(this.path)
  }

  /**
   * Returns a JSON representation of this `MOGGFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the MOGG file path.
   * - - - -
   * @returns {Promise<MOGGFileJSONRepresentation>}
   */
  async toJSON(): Promise<MOGGFileJSONRepresentation> {
    const stat = await this.stat()
    return {
      ...stat,
      ...this.path.toJSON(),
    }
  }

  /**
   * Decrypts this MOGG file and returns an instantiated `MOGGFile` class pointing to the new decrypted MOGG file. Returns this
   * instantiated `MOGGFile` class if the MOGG file is already decrypted.
   * - - - -
   * @param {FilePathLikeTypes} decMoggPath The path to the decrypted MOGG file.
   * @returns {Promise<MOGGFile>}
   */
  async decrypt(decMoggPath: FilePathLikeTypes): Promise<MOGGFile> {
    if (await this.isEncrypted()) return await PythonAPI.decryptMOGG(this.path, decMoggPath)
    return this
  }

  /**
   * Encrypts a MOGG file and returns an instantiated `MOGGFile` class pointing to the new encrypted MOGG file. Returns this
   * instantiated `MOGGFile` class if the MOGG file is already encrypted using the same encryption version.
   * - - - -
   * @param {FilePathLikeTypes} encMoggPath The path of the encrypted MOGG file.
   * @param {MOGGFileEncryptionVersion} [encVersion] `OPTIONAL` The type of the encryption. Default is `11`.
   * @param {boolean} [usePS3] `OPTIONAL` Use PS3 keys for encryption, used only on certain encryption versions. Default is `false`.
   * @param {boolean} [useRed] `OPTIONAL` Use red keys for encryption, used only on certain encryption versions. Default is `false`.
   * @returns {Promise<MOGGFile>}
   */
  async encrypt(encMoggPath: FilePathLikeTypes, encVersion: MOGGFileEncryptionVersion = 11, usePS3 = false, useRed = false) {
    const thisEncVersion = await this.checkFileIntegrity()
    if (thisEncVersion === encVersion) return this
    return await PythonAPI.encryptMOGG(this.path, encMoggPath, encVersion, usePS3, useRed)
  }

  async extractTracks(songdata: RB3CompatibleDTAFile, destFolderPath: DirPathLikeTypes): Promise<DirPath> {
    return await PythonAPI.moggTrackExtractor(this.path, songdata, destFolderPath)
  }

  async createPreview(songdata: RB3CompatibleDTAFile, destPath: FilePathLikeTypes, format?: 'wav' | 'flac' | 'ogg' | 'mp3', mixCrowd?: boolean): Promise<FilePath> {
    return await PythonAPI.moggPreviewCreator(this.path, songdata, destPath, format, mixCrowd)
  }
}
