import { pathLikeToFilePath, type FilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { PythonAPI, type MOGGFileStatPythonObject } from '../core.exports'

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
}
