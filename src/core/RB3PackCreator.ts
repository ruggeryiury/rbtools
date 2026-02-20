import { DirPath, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes } from 'node-lib'
import { PKGFile, STFSFile, type PKGFileJSONRepresentation, type STFSFileJSONRepresentation } from '../core.exports'
import { extractPackagesForExCON, extractPackagesForRPCS3, type ExCONExtractionOptions, type ExCONPackageExtractionObject, type RPCS3ExtractionOptions, type RPCS3PackageExtractionObject, type UnpackedFilePathsFromSongObject } from '../lib.exports'

export type SupportedRB3PackageFileType = STFSFile | PKGFile
export type SupportedRB3PackageFileNames = 'stfs' | 'pkg'
export type RB3PackageLikeType = SupportedRB3PackageFileType | string

export interface PackageExtractionSongsObject {
  /**
   * The internal songname used by the song and all its files.
   */
  songname: string
  /**
   * An object with the path of all files from the extracted song.
   */
  files: UnpackedFilePathsFromSongObject
}

export interface STFSExtractionTempFolderObject {
  /**
   * The path where the STFS package were extracted.
   */
  path: DirPath
  /**
   * The type of the package extracted.
   */
  type: 'stfs'
  /**
   * An array with objects representing extracted songs from the package and its files.
   */
  songs: PackageExtractionSongsObject[]
  /**
   * An object with stats of the extracted STFS file.
   */
  stat: STFSFileJSONRepresentation
}

export interface PKGExtractionTempFolderObject {
  /**
   * The path where the PKG package were extracted.
   */
  path: DirPath
  /**
   * The type of the package extracted.
   */
  type: 'pkg'
  /**
   * An array with objects representing extracted songs from the package and its files.
   */
  songs: PackageExtractionSongsObject[]
  /**
   * An object with stats of the extracted PKG file.
   */
  stat: PKGFileJSONRepresentation
}

export interface SelectedSongForExtractionObject {
  /**
   * The type of value provided to select the song. It can be the song ID, internal songname, or songID.
   */
  type: 'id' | 'songname' | 'songID'
  /**
   * The value provided to select the song. It can be the song ID, internal songname, or songID.
   */
  value: string | number
}
export interface SelectedSongFromSongnameObject {
  /**
   * The type of value provided to select the song.
   */
  type: 'songname'
  /**
   * The value provided to select the song.
   */
  value: string
}

/**
 * A class that gathers Rock Band 3 package files from Xbox 360 and PS3 for different format extractions.
 */
export class RB3PackCreator {
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
        if (packagesPath instanceof STFSFile || packagesPath instanceof PKGFile) {
          this.packages.push(packagesPath)
          continue
        } else {
          const filePath = pathLikeToFilePath(packagesPath)
          if (filePath.ext === '.pkg') this.packages.push(new PKGFile(filePath))
          else this.packages.push(new STFSFile(filePath))
        }
      }
    }
  }

  /**
   * Extracts and installs the provided STFS/PKG song package files as a song package on the RPCS3's Rock Band 3 USRDIR folder .
   *
   * The `options` parameter is an object where you can tweak the extraction and package creation process, placing the `dev_hdd0` folder path, selecting the package folder name, and forcing encryption/decryption of all files for vanilla Rock Band 3 support.
   * - - - -
   * @param {Omit<RPCS3ExtractionOptions, 'devhdd0Path'>} options An object that settles and tweaks the extraction and package creation process.
   * @returns {Promise<RPCS3PackageExtractionObject>}
   */
  async toRPCS3(options: Omit<RPCS3ExtractionOptions, 'devhdd0Path'>): Promise<RPCS3PackageExtractionObject> {
    return await extractPackagesForRPCS3(this.packages, { ...options, devhdd0Path: this.devhdd0Path.path })
  }

  async toExtractedCON(options: ExCONExtractionOptions): Promise<ExCONPackageExtractionObject> {
    return await extractPackagesForExCON(this.packages, options)
  }

  async toSTFSPackage() {}

  async toPKGPackage() {}
}
