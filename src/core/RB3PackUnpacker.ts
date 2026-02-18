import { pathLikeToFilePath } from 'node-lib'
import { PKGFile, STFSFile } from '../core.exports'
import { unpackExtractForRPCS3, type RB3PackageLikeType, type RPCS3ExtractionOptions, type RPCS3PackageExtractionObject, type SupportedRB3PackageFileType } from '../lib.exports'

/**
 * A class that gathers Rock Band 3 package files from Xbox 360 and PS3 for different format extractions.
 */
export class RB3PackUnpacker {
  /**
   * An array with package files to be extracted.
   */
  packs: SupportedRB3PackageFileType[]

  /**
   * A class that gathers Rock Band 3 package files from Xbox 360 and PS3 for different format extractions.
   * - - - -
   * @param {RB3PackageLikeType[] | undefined} songs An array with Xbox 360 and PS3 package files to be extracted.
   */
  constructor(songs?: RB3PackageLikeType[]) {
    this.packs = []
    if (songs) {
      for (const path of songs) {
        if (typeof path === 'string') {
          const p = pathLikeToFilePath(path)
          if (p.ext === '.pkg') this.packs.push(new PKGFile(p))
          else this.packs.push(new STFSFile(p))

          continue
        }

        this.packs.push(path)
      }
    }
  }

  /**
   * Extracts and installs the provided STFS/PKG song package files as a song package on the RPCS3's Rock Band 3 USRDIR folder .
   *
   * The `options` parameter is an object where you can tweak the extraction and package creation process, placing the `dev_hdd0` folder path, selecting the package folder name, and forcing encryption/decryption of all files for vanilla Rock Band 3 support.
   * - - - -
   * @param {RPCS3ExtractionOptions} options An object that settles and tweaks the extraction and package creation process.
   * @returns {Promise<RPCS3PackageExtractionObject>}
   */
  async extractForRPCS3(options: RPCS3ExtractionOptions): Promise<RPCS3PackageExtractionObject> {
    return await unpackExtractForRPCS3(this.packs, options)
  }
}
