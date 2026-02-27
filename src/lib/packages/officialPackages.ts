import { DirPath, type DirPathLikeTypes, type FilePath } from 'node-lib'
import { RBTools } from '../../core.exports'
import { isRPCS3Devhdd0PathValid } from '../../lib.exports'

export interface SongPackageDatabaseObject {
  /**
   * The name of the package (in English).
   */
  name: string
  /**
   * A string code that can be used as a package identifier.
   */
  code: 'tu5' | 'rb1' | 'rb2' | 'rb3' | 'rb3beta'
  /**
   * The version of the package.
   */
  version: number
  /**
   * Tells if the package is outdated.
   */
  outdated: boolean
  /**
   * The original folder name in the USRDIR folder.
   */
  folderName: string
  /**
   * The game where the contents must be extracted.
   */
  packageType: 'rb1' | 'rb3'
  /**
   * A function that evaluates to the path to the official package thumbnail.
   */
  thumbnailPath: () => FilePath
  /**
   * An object with known hashes of specific packages.
   */
  hashes: {
    /**
     * SHA256 hash of the extracted contents as RPCS3's content.
     */
    extractedRPCS3: string
    /**
     * `SHA256 hash of the PKG container file entries.`
     */
    pkg: string
    /**
     * SHA1 hash of the STFS container file entries.
     */
    stfs: string
  }
}

export type OfficialPackagesHashTypes = keyof SongPackageDatabaseObject['hashes']

export interface ParsedSongPackageDatabaseObject extends Omit<SongPackageDatabaseObject, 'thumbnailPath'> {
  /**
   * The path to the official package thumbnail.
   */
  thumbnailPath: string
}

export const officialPackages: SongPackageDatabaseObject[] = [
  {
    name: 'Title Update 5',
    code: 'tu5',
    version: 5,
    outdated: false,
    folderName: 'gen',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/tu5.png'),
    hashes: {
      extractedRPCS3: '',
      pkg: 'cba38dc92d6b7327e0a4c6efb014f3269d183ba475fce6d863b33d2178d28778',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 1',
    code: 'rb1',
    version: 1,
    outdated: false,
    folderName: 'RB1FULLEXPORTPS3',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb1.png'),
    hashes: {
      extractedRPCS3: '09f25aef25f3f71ab669283b60a47809d5fc52e6c93ca0bfcf1efe67695b57a2',
      pkg: 'e386b8ab41e844ff087400533920cccca99c4fe3d455756bab35223592b0e683',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 2',
    code: 'rb2',
    version: 1,
    outdated: false,
    folderName: 'RB2-Rock-Band-2-Export',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb2.png'),
    hashes: {
      extractedRPCS3: 'e3e3110dbe6b196ec870eba846617bcf3adc579b5924cfb3bd6c8710de194485',
      pkg: '92462fe7347aa14446b5b38409c7a91c48564fd4932d76e0b4e83a52fb3ca5ce',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 3 Beta Songs',
    code: 'rb3beta',
    version: 1,
    outdated: false,
    folderName: 'RB3BetaSongs',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3.png'),
    hashes: {
      extractedRPCS3: '580e45e1733ee8b997243bcf5fe4b86e530ceb896a022df022b19502a1fda1a3',
      pkg: 'df60d01b226d3d94ebc78fed44199040e551fbb96280ddd964b59d88bc0e077b',
      stfs: '',
    },
  },
]

export const getOfficialPkgFromHash = (type: OfficialPackagesHashTypes, hash: string): ParsedSongPackageDatabaseObject | undefined => {
  for (const pack of officialPackages) {
    if (pack.hashes[type] === hash)
      return {
        ...pack,
        thumbnailPath: pack.thumbnailPath().path,
      }
  }
}

export const getOfficialPkgFromFolderName = (folderName: string): ParsedSongPackageDatabaseObject | undefined => {
  for (const pack of officialPackages) {
    if (pack.folderName === folderName)
      return {
        ...pack,
        thumbnailPath: pack.thumbnailPath().path,
      }
  }
  return
}

export const isRB3FolderNameFreeOnRPCS3 = async (devhdd0Path: DirPathLikeTypes, folderName: string): Promise<boolean> => {
  let proof = true
  const devhdd0 = isRPCS3Devhdd0PathValid(devhdd0Path)
  const allOfficialFolderNames = officialPackages.filter((pack) => pack.packageType === 'rb3').map((pack) => pack.folderName)
  const allUnofficialFolderNames = (await devhdd0.gotoDir('game/BLUS30463/USRDIR').readDir()).filter((dir) => dir instanceof DirPath && dir.name !== 'gen' && !allOfficialFolderNames.includes(dir.name))
  const allFolderNames = [...allOfficialFolderNames, ...allUnofficialFolderNames]

  if (allFolderNames.includes(folderName)) proof = false
  return proof
}
