import { execAsync, FilePath, pathLikeToFilePath, pathLikeToString, resolve, type FilePathLikeTypes } from 'node-lib'
import { EDATFile, ImageFile, MIDIFile, RBTools } from '../core.exports'

/**
 * A class with APIs to use RBTools executables.
 */
export class BinaryAPI {
  /**
   * Inserts the HMX MOGG header on a multitrack OGG file. You can also encrypt the MOGG file with `0x1B` encryption, that works on both Xbox 360 and PS3 systems.
   * - - - -
   * @param {FilePathLikeTypes} srcPath The path to the multitrack OGG file, without HMX header, to be converted to MOGG file.
   * @param {FilePathLikeTypes} destPath The destination path of the new MOGG file.
   * @param {boolean} [encrypt] `OPTIONAL` Encrypts the MOGG file if `true`. Default is `false`.
   */
  static async makeMoog(srcPath: FilePathLikeTypes, destPath: FilePathLikeTypes, encrypt = false): Promise<void> {
    const exeName = RBTools.binFolder.gotoFile('makemogg.exe').name
    const command = `${exeName} "${pathLikeToString(srcPath)}" -${encrypt ? 'e' : ''}m "${pathLikeToString(destPath)}"`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) throw new Error(stderr.trim())
  }

  /**
   * Encrypts MIDI files using custom 16-bytes `devKLic` key hash and returns an instance of `EDATFile` pointing to the new encrypted EDAT file.
   * - - - -
   * @param {FilePathLikeTypes} midiFilePath The path to the MIDI file to be encrypted.
   * @param {string} contentID The Content ID to the encrypted EDAT file. You can generate formatted Content IDs using static `EDATFile.genContentID()`.
   * @param {string} devKLic A 16-bytes key used to encrypt the EDAT file. You can generated DevKLic for Rock Band games using the static `EDATFile.genDevKLic()`.
   * @param {FilePathLikeTypes} [destPath] `OPTIONAL` The destination path of the encrypted EDAT file. If no argument is provided, the new EDAT file will be placed on the same directory of the source MIDI file.
   * @returns {Promise<EDATFile>}
   */
  static async edatToolEncrypt(midiFilePath: FilePathLikeTypes, contentID: string, devKLic: string, destPath?: FilePathLikeTypes): Promise<EDATFile> {
    const exeName = RBTools.binFolder.gotoFile('edattool.exe').name
    const midi = pathLikeToFilePath(midiFilePath)
    let dest: FilePath
    if (destPath) dest = pathLikeToFilePath(`${pathLikeToString(destPath)}${pathLikeToString(destPath).toLowerCase().endsWith('.edat') ? '' : '.edat'}`)
    else dest = pathLikeToFilePath(`${midi.root}/${midi.fullname}${midi.fullname.toLowerCase().endsWith('.edat') ? '' : '.edat'}`)

    const command = `${exeName} encrypt -custom:${devKLic} ${contentID.slice(0, 36)} 03 02 00 "${midi.path}" "${dest.path}"`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) throw new Error(stderr.trim())
    if (!stdout.split('\r\n').slice(-2)[0].startsWith('COMPLETE:')) throw new Error(stdout.split('\r\n').slice(-2)[0].slice(7))

    return new EDATFile(dest)
  }

  /**
   * Decrypts EDAT files using a `devKLic` key hash and returns an instance of `MIDIFile` pointing to the decrypted MIDI file.
   * - - - -
   * @param {FilePathLikeTypes} edatFilePath The path to the EDAT file to be decrypted.
   * @param {string} devKLicHash A 16-bytes hash used to decrypt the EDAT file.
   *
   * A DevKLic key hash is made by concating the folder name where the `.mid.edat` is installed, so the EDAT file content is only decrypted correctly using the original name of the folder.
   *
   * You can generate DevKLic hashes for Rock Band games on PS3 using the static `EDATFile.genDevKLic()` method.
   * @param {FilePathLikeTypes} [destPath] `OPTIONAL` The destination path of the decrypted MIDI file. If no argument is provided, the new MIDI file will be placed on the same directory of the source EDAT file.
   * @returns {Promise<MIDIFile>}
   */
  static async edatToolDecrypt(edatFilePath: FilePathLikeTypes, devKLicHash: string, destPath?: FilePathLikeTypes): Promise<MIDIFile> {
    const exeName = RBTools.binFolder.gotoFile('edattool.exe').name
    const edat = pathLikeToFilePath(edatFilePath)
    let dest: FilePath
    if (destPath) dest = pathLikeToFilePath(destPath).changeFileExt('mid')
    else dest = pathLikeToFilePath(resolve(edat.root, edat.name))
    const command = `${exeName} decrypt -custom:${devKLicHash} "${edat.path}" "${dest.path}"`
    const { stderr, stdout } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) throw new Error(stderr.trim())
    if (!stdout.split('\r\n').slice(-2)[0].startsWith('COMPLETE:')) throw new Error(stdout.split('\r\n').slice(-2)[0].slice(7))

    return new MIDIFile(dest)
  }
  /**
   * Executes the Wiimms Image Tool encoder.
   * - - - -
   * @param {FilePathLikeTypes} srcPngFile The path to the PNG file to be converted.
   * @param {FilePathLikeTypes} destTplFile The path to the new converted TPL file.
   * @returns {Promise<FilePath>}
   */
  static async WimgtEnc(srcPngFile: FilePathLikeTypes, destTplFile: FilePathLikeTypes): Promise<FilePath> {
    const exeName = RBTools.binFolder.gotoFile('wimgt.exe').name
    const src = pathLikeToFilePath(srcPngFile)
    const dest = pathLikeToFilePath(destTplFile)
    const command = `${exeName} -d "${dest.path}" ENC -x TPL.CMPR "${src.path}"`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) {
      if (stderr.includes("find_fast_cwd: WARNING: Couldn't compute FAST_CWD pointer")) return pathLikeToFilePath(dest)
      else throw new Error(stderr.trim())
    }
    return pathLikeToFilePath(dest)
  }

  /**
   * Asynchronously executes the Wiimms Image Tool decoder.
   * - - - -
   * @param {FilePathLikeTypes} srcTexFile The path to the PNG_WII file to be converted.
   * @param {FilePathLikeTypes} destImageFile The path to the new converted TPL file.
   * @returns {Promise<FilePath>}
   */
  static async WimgtDec(srcTexFile: FilePathLikeTypes, destImageFile: FilePathLikeTypes): Promise<ImageFile> {
    const exeName = RBTools.binFolder.gotoFile('wimgt.exe').name
    const src = pathLikeToFilePath(srcTexFile)
    const dest = pathLikeToFilePath(destImageFile)
    const command = `${exeName} -d "${dest.path}" DEC -x TPL.CMPR "${src.path}"`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) {
      if (stderr.includes("find_fast_cwd: WARNING: Couldn't compute FAST_CWD pointer")) return new ImageFile(dest)
      else throw new Error(stderr.trim())
    }
    return new ImageFile(dest)
  }

  /**
   * Executes the NVIDIA Texture Tools.
   *
   * _NVIDIA Texture Tools converts any image file format to DDS image files._
   * - - - -
   * @param {FilePathLikeTypes} srcTgaFile The path to the TGA file to be converted.
   * @param {FilePathLikeTypes} destDdsPath The path to the new converted DDS file.
   * @returns {Promise<FilePath>}
   */
  static async NVCompress(srcTgaFile: FilePathLikeTypes, destDdsPath: FilePathLikeTypes): Promise<FilePath> {
    const exeName = RBTools.binFolder.gotoFile('nvcompress.exe').name
    const src = pathLikeToFilePath(srcTgaFile)
    const dest = pathLikeToFilePath(destDdsPath)

    const command = `${exeName} -nocuda -bc3 "${src.path}" "${dest.path}"`
    const { stderr } = await execAsync(command, { windowsHide: true, cwd: RBTools.binFolder.path })
    if (stderr) throw new Error(stderr.trim())
    return dest
  }
}
