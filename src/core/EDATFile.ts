import { BinaryReader, createHash, FilePath, getReadableBytesSize, pathLikeToFilePath, type FilePathJSONRepresentation, type FilePathLikeTypes } from 'node-lib'
import { setDefaultOptions } from 'set-default-options'
import { BinaryAPI, MIDIFile } from '../core.exports'

// #region Types

const ps3GameIDs = {
  rb1: 'BLUS30050',
  rb3: 'BLUS30463',
} as const

export type RockBandPS3TitleIDs = keyof typeof ps3GameIDs

export interface EDATFileStatObject {
  /**
   * Tells if the EDAT file is encrypted or not.
   */
  isEncrypted: boolean
  /**
   * The folder name which (possibly) the content is decrypted.
   *
   * This variable only is a string when a folder name can be taken from the installed DLC, and they must be installed on RPCS3.
   * Even with this, it's not garanteed if i'll work, since this folder can be renamed.
   */
  devKLicFolderName: string | null
  /**
   * The (possible) DevKLic hash that might decrypt the EDAT content.
   *
   * This variable only is a string when a folder name can be taken from the installed DLC, and they must be installed on RPCS3.
   * Even with this, it's not garanteed if i'll work, since this folder can be renamed.
   */
  devKLicHash: string | null
  /**
   * Contents parsed from the EDAT file header.
   */
  header: {
    /**
     * The file signature. Always "NPD\0" (4E 50 44 00)
     * - - - -
     */
    magic: string
    /**
     * There are 4 PS3 EDAT (and NPD) format major versions:
     *
     * - 1: compatible with SDK 2.1x or older. Supported since at least PS3 System Software version 1.01.
     * - 2: compatible with SDK 3.0x or older
     * - 3: compatible with SDK 3.7x or older
     * - 4: compatible with SDK ?.?? or older. Supported since certainly some 4.0x System Software version.
     */
    version: number
    /**
     * For PS2 EDAT, PS3 OS requires it to be with activation (i.e. Local DRM). For PS1 PKG, PS3 System Software version 4.00 introduced some changes for installing them with regard to the EDAT DRM type.
     */
    drmType: number
    /**
     * The applcation type.
     */
    applicationType: number
    /**
     * Content ID (with padding to fit 48 bytes).
     */
    contentID: string
    /**
     * QA digest. It seems to be a SHA-1 hash of the non-finalized file (debug SELF/SPRX created with make_fself_npdrm) or of the original EDAT data. Original data are unknown until the whole file is read, so it cannot be used as a check, however it can be used as watermark or zeroed on forged file.
     */
    digest: string
    /**
     * CID-FN hash. AES-CMAC hash of concatenation of Content ID (48 bytes) and EDAT/SELF filename (eg "MINIS.EDAT", "EBOOT.BIN") using the npd_cid_fn_hash_aes_cmac_key. Example: aes_cmac(`55 50 30 35 37 36 2D 4E 50 55 5A 30 30 31 34 39 5F 30 30 2D 56 41 4E 47 55 41 52 44 32 30 30 30 30 30 30 31 00 00 00 00 00 00 00 00 00 00 00 00 4D 49 4E 49 53 2E 45 44 41 54`, npd_cid_fn_hash_aes_cmac_key).
     */
    cidFNHash: string
    /**
     * Header hash. AES CMAC hash of the 0x60 bytes from the beginning of the file using (devklic XOR npd_header_hash_xor_key) as AES-CMAC key. Warning: devklic is an hardcoded klicensee that is not necessarily the klicensee when DRM Type is not Free.
     */
    headerHash: string
    /**
     * Start of the validity period, filled with 00 if not used.
     */
    limitedTimeStart: number
    /**
     * End of the validity period, filled with 00 if not used.
     */
    limitedTimeEnd: number
    /**
     * - 00: EDAT
     * - 01: SDAT
     * - 80: Non Finalized (unsigned)
     */
    edatType: number
    /**
     * - 00: ???
     * - 01: Compressed?
     * - 02: Plain text?
     * - 03: Compressed plain text?
     * - 05: Compressed?
     * - 06: Plain text?
     * - 07: Compressed plain text?
     * - 12: ???
     * - 13: Compressed data?
     * - 60: Data/misc?
     */
    metadataType: number
    /**
     * Default block size is 16 KB (0x4000 bytes). Max block size is 32 KB (0x8000 bytes). Working block sizes are: 1, 2, 4, 8, 16, 32 KB.
     * - - - -
     */
    blockSize: string
    /**
     * Decoded data size.
     */
    dataSize: number
    /**
     * Unknown hash.
     */
    metadataSectionsHash: string
    /**
     * AES-CMAC hash of 160 bytes from the beginning of EDAT file. It uses the hash key as AES-CMAC key and it depends on the file flags and keys. ?What does this mean, see make_npdata by Hykem?
     */
    extendedHeaderHash: string
    /**
     * ECDSA curve type is vsh type 2. ECDSA public key is vsh public key (to check). It can be zeroed on forged file.
     */
    ecdsaMetadataSignature: string
    /**
     * ECDSA curve type is vsh type 2. ECDSA public key is vsh public key (to check). Enabled (only?) for PS2 classic contents: all PS3 CFWs are patched to skip the ECDSA signature check. It can be zeroed on forged file.
     */
    ecdsaHeaderSignature: string
  }
  /**
   * Contents parsed from the EDAT footer.
   */
  footer: {
    /**
     * "EDATA" or "SDATA".
     */
    footerName: string
    /**
     * - Version 1: "packager"
     * - Version 2: "2.4.0.L"
     * - Version 2: "2.4.0.W"
     * - Version 2: "2.7.0.W"
     * - Version 2: "2.7.0.L"
     * - Version 3: "3.1.0.W"
     * - Version 3: "3.3.0.L"
     * - Version 3: "3.3.0.W"
     * - Version 4: "4.0.0.L"
     * - Version 4: "4.0.0.W"
     */
    packagerVersion: string
  }
}

export interface EDATDecryptionOptions {
  /**
   * `OPTIONAL` The destination of the decrypted EDAT file. If no destination path is provided, it will simply remove the `.edat` extension from the file name and save it on the same directory of the EDAT file.
   */
  destPath?: FilePathLikeTypes
  /**
   * The 16-bytes HEX string used to decrypt the EDAT file.
   */
  devKLicHash: string
}

export interface EDATFileJSONRepresentation extends FilePathJSONRepresentation, EDATFileStatObject {}

/**
 * `EDATFile` is a class that represents a EDAT file.
 * - - - -
 * @see {@link https://www.psdevwiki.com/ps3/NPD|EDAT File Format Specifications}
 */
export class EDATFile {
  // #region Constructor

  /**
   * The path to the EDAT file.
   */
  path: FilePath

  /**
   * `EDATFile` is a class that represents a EDAT file.
   * - - - -
   * @param {FilePathLikeTypes} edatFilePath The path of the EDAT file.
   * @see {@link https://www.psdevwiki.com/ps3/NPD|EDAT File Format Specifications}
   */
  constructor(edatFilePath: FilePathLikeTypes) {
    this.path = pathLikeToFilePath(edatFilePath)
  }

  // #region Static Methods

  /**
   * Generates a MD5 hash that decrypts Rock Band PS3 `EDAT` files based on the installed DLC folder name.
   * - - - -
   * @param {string} folderName The installed DLC folder name.
   * @returns {string}
   */
  static genDevKLicHash(folderName: string): string {
    return createHash(`Ih38rtW1ng3r${folderName}10025250`, 'md5').toUpperCase()
  }

  /**
   * Generates a Content ID based on the given text. This can be used on EDAT file creation.
   * - - - -
   * @param {string} text The custom text to place on the Content ID.
   * @param {RockBandPS3TitleIDs} game `OPTIONAL`. Default is `rb3`.
   * @returns {string}
   */
  static genContentID(text: string, game: RockBandPS3TitleIDs = 'rb3'): string {
    let contentID = `UP${game === 'rb1' ? '0002' : '8802'}-${ps3GameIDs[game]}_00-`
    text = text.replace(/\s+/g, '').toUpperCase()
    if ((contentID + text).length > 0x1c) {
      contentID += text
      contentID = contentID.slice(0, 0x1c)
    } else if ((contentID + text).length < 0x1c) {
      const diff = 0x1c - (contentID + text).length
      contentID += text
      for (let i = 0; i < diff; i++) {
        contentID += '\0'
      }
    } else contentID += text

    return contentID
  }

  // #region Private Methods

  /**
   * Checks the integrity of the EDAT by reading the file signature (magic).
   * - - - -
   * @returns {Promise<string>}
   * @throws {Error} When it identifies file signature of a MIDI file or any unknown file format.
   */
  async checkFileIntegrity(): Promise<string> {
    if (!this.path.exists) throw new Error(`Provided EDAT file path "${this.path.path}" does not exists\n`)
    const magic = await BinaryReader.fromBuffer(await this.path.readOffset(0, 4)).readUInt32BE()

    // NPD
    if (magic === 0x4e504400) return 'NPD'
    // MThd
    else if (magic === 0x4d546864) throw new Error(`Provided EDAT file "${this.path.path}" is a decrypted MIDI file with no HMX EDAT header.`)
    throw new Error(`Provided EDAT file "${this.path.path}" is not a valid EDAT or decrypted MIDI file with no HMX EDAT header.`)
  }

  /**
   * Checks if the provided USRDIR folder is valid.
   * - - - -
   * @returns {boolean}
   */
  private _isUSRDIRPathValid(): boolean {
    const usrdir = this.path.gotoDir('../../../')
    const eboot = usrdir.gotoFile('EBOOT.BIN')
    const gen = usrdir.gotoDir('gen')
    if (usrdir.exists && eboot.exists && gen.exists) return true
    return false
  }

  // #region Main Methods

  /**
   * Checks if the EDAT file is encrypted, returns `false` when the EDAT file is a MIDI file with EDAT extension.
   * - - - -
   * @returns {Promise<boolean>}
   */
  async isEncrypted(): Promise<boolean> {
    try {
      await this.checkFileIntegrity()
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('is a decrypted MIDI file')) return false
      else throw error
    }
  }

  /**
   * Returns an object with stats of the EDAT file.
   * - - - -
   * @returns {Promise<EDATFileStatObject>}
   */
  async stat(): Promise<EDATFileStatObject> {
    let devKLicFolderName: string | null = null
    let devKLicHash: string | null = null
    const isEncrypted = await this.isEncrypted()
    if (!isEncrypted) throw new Error(`Provided EDAT file "${this.path.path}" is a decrypted MIDI file with no HMX EDAT header`)
    const reader = await BinaryReader.fromFile(this.path)
    const size = reader.size

    const magic = await reader.readHex(4)
    const version = await reader.readUInt32BE()
    const drmType = await reader.readUInt32BE()
    const applicationType = await reader.readUInt32BE()
    const contentID = await reader.readUTF8(0x30)
    const digest = await reader.readHex(0x10, false)
    const cidFNHash = await reader.readHex(0x10, false)
    const headerHash = await reader.readHex(0x10, false)
    const limitedTimeStart = Number((await reader.readUInt64BE()).toString())
    const limitedTimeEnd = Number((await reader.readUInt64BE()).toString())
    const edatType = await reader.readUInt8()
    const metadataType = await reader.readUInt24BE()
    const blockSize = await reader.readUInt32BE()
    const dataSize = Number(await reader.readUInt64BE())
    const metadataSectionsHash = await reader.readHex(0x10, false)
    const extendedHeaderHash = await reader.readHex(0x10, false)
    const ecdsaMetadataSignature = await reader.readHex(0x10, false)
    const ecdsaHeaderSignature = await reader.readHex(0x10, false)

    reader.seek(size - 0x10)
    const footerName = (await reader.readUTF8(6)).slice(0, -1)
    const packagerVersion = await reader.readUTF8(10)

    await reader.close()

    if (this._isUSRDIRPathValid()) {
      devKLicFolderName = this.path.gotoDir('../../').name
      devKLicHash = EDATFile.genDevKLicHash(devKLicFolderName)
    }
    return {
      isEncrypted,
      devKLicFolderName,
      devKLicHash,
      header: {
        magic,
        version,
        drmType,
        applicationType,
        contentID,
        digest,
        cidFNHash,
        headerHash,
        limitedTimeStart,
        limitedTimeEnd,
        edatType,
        metadataType,
        blockSize: getReadableBytesSize(blockSize),
        dataSize,
        metadataSectionsHash,
        extendedHeaderHash,
        ecdsaMetadataSignature,
        ecdsaHeaderSignature,
      },
      footer: {
        footerName,
        packagerVersion,
      },
    }
  }

  /**
   * Returns a JSON representation of this `EDATFile` class.
   *
   * This method is very similar to `.stat()`, but also returns information about the image file path.
   * - - - -
   * @returns {Promise<EDATFileJSONRepresentation>}
   */
  async toJSON(): Promise<EDATFileJSONRepresentation> {
    return {
      ...this.path.toJSON(),
      ...(await this.stat()),
    }
  }

  /**
   * Decrypts the EDAT file using a `devKLic` key hash and returns an instance of `MIDIFile` pointing to the decrypted MIDI file.
   * - - - -
   * @param {EDATDecryptionOptions} options An object with options to the decrypting process.
   * @returns {Promise<MIDIFile>}
   */
  async decrypt(options: EDATDecryptionOptions): Promise<MIDIFile> {
    const stat = await this.toJSON()
    if (!stat.isEncrypted) {
      const destPath = options.destPath ? pathLikeToFilePath(options.destPath) : FilePath.of(`${stat.root}/${stat.name}`)
      return new MIDIFile(await this.path.copy(destPath))
    }
    const { destPath, devKLicHash } = setDefaultOptions(
      {
        destPath: FilePath.of(`${stat.root}/${stat.name}`),
        devKLicHash: stat.devKLicHash ?? '',
      },
      options
    )
    const dest = pathLikeToFilePath(destPath)
    await BinaryAPI.edatToolDecrypt(this.path, devKLicHash, dest)
    return new MIDIFile(dest)
  }
}
