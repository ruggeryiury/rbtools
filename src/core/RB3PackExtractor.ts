import { DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes } from 'node-lib'
import { PKGFile, STFSFile } from '../core.exports'
import { extractPackagesForRPCS3, type RB3PackageLikeType, type RPCS3ExtractionOptions, type RPCS3PackageExtractionObject, type SupportedRB3PackageFileType } from '../lib.exports'

export type RPCS3PackExtractorOptions = Omit<RPCS3ExtractionOptions, 'devhdd0Path'>

/**
 * A class that gathers Rock Band 3 package files from Xbox 360 and PS3 for different format extractions.
 */
export class RB3PackExtractor {
  /**
   * The path of the user's `dev_hdd0` folder.
   */
  devhdd0Path: DirPath
  /**
   * An array with package files to be extracted.
   */
  packages: SupportedRB3PackageFileType[]

  /**
   * A class that gathers Rock Band 3 package files from Xbox 360 and PS3 for different format extractions.
   * - - - -
   * @param {RB3PackageLikeType[] | undefined} packages An array with Xbox 360 and PS3 package files to be extracted.
   */
  constructor(devhdd0Path: DirPathLikeTypes, packages?: RB3PackageLikeType[]) {
    this.devhdd0Path = pathLikeToDirPath(devhdd0Path)
    this.packages = []
    if (packages) {
      for (const packagesPath of packages) {
        if (typeof packagesPath === 'string') {
          const p = pathLikeToFilePath(packagesPath)
          if (p.ext === '.pkg') this.packages.push(new PKGFile(p))
          else this.packages.push(new STFSFile(p))

          continue
        }

        this.packages.push(packagesPath)
      }
    }
  }

  /**
   * Extracts and installs the provided STFS/PKG song package files as a song package on the RPCS3's Rock Band 3 USRDIR folder .
   *
   * The `options` parameter is an object where you can tweak the extraction and package creation process, placing the `dev_hdd0` folder path, selecting the package folder name, and forcing encryption/decryption of all files for vanilla Rock Band 3 support.
   * - - - -
   * @param {RPCS3PackExtractorOptions} options An object that settles and tweaks the extraction and package creation process.
   * @returns {Promise<RPCS3PackageExtractionObject>}
   */
  async toRPCS3(options: RPCS3PackExtractorOptions): Promise<RPCS3PackageExtractionObject> {
    return await extractPackagesForRPCS3(this.packages, { ...options, devhdd0Path: this.devhdd0Path })
  }
}
