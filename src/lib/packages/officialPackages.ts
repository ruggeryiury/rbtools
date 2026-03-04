import { DirPath, type DirPathLikeTypes, type FilePath } from 'node-lib'
import { RBTools } from '../../core.exports'
import { isRPCS3Devhdd0PathValid } from '../../lib.exports'

export interface OfficialSongPackageStats {
  /**
   * The name of the package (in English).
   */
  name: string
  /**
   * A string code that can be used as a package identifier.
   */
  code: 'tu5' | 'rb1' | 'rb2' | 'rb3' | 'lrb' | 'tbrb' | 'gdrb' | 'rb3_to_rb2' | 'rb3_to_blitz' | 'rb3beta' | 'rbb' | 'rbvr'
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

  // Flags
  /**
   * If `true`, this package is a port of Rock Band 3 on-disc songs to any other Rock Band titles.
   */
  isDuplicatedForRB3?: boolean
}

export type OfficialPackagesHashTypes = keyof OfficialSongPackageStats['hashes']

export interface OfficialSongPackageStatsJSON extends Omit<OfficialSongPackageStats, 'thumbnailPath'> {
  /**
   * The path to the official package thumbnail.
   */
  thumbnailPath: string
}

export const officialPackages: OfficialSongPackageStats[] = [
  {
    name: 'Title Update 5',
    code: 'tu5',
    outdated: false,
    folderName: 'gen',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/tu5.jpg'),
    hashes: {
      extractedRPCS3: '',
      pkg: 'cba38dc92d6b7327e0a4c6efb014f3269d183ba475fce6d863b33d2178d28778',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 1',
    code: 'rb1',
    outdated: false,
    folderName: 'RB1FULLEXPORTPS3',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb1.jpg'),
    hashes: {
      extractedRPCS3: 'dfb3bd3a8b9060f853be063906947b705695e90b7301e2504e73e5f96bb05bff',
      pkg: 'e386b8ab41e844ff087400533920cccca99c4fe3d455756bab35223592b0e683',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 2',
    code: 'rb2',
    outdated: false,
    folderName: 'RB2-Rock-Band-2-Export',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb2.jpg'),
    hashes: {
      extractedRPCS3: '72afb485363fba9bbbf7e92e570e796c2245a0cb82d3081e1a88290a306c154d',
      pkg: '92462fe7347aa14446b5b38409c7a91c48564fd4932d76e0b4e83a52fb3ca5ce',
      stfs: '',
    },
  },
  {
    name: 'LEGO Rock Band',
    code: 'lrb',
    outdated: false,
    folderName: 'LEGO-Rock-Band-Export',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/lrb.jpg'),
    hashes: {
      extractedRPCS3: 'e1fd2a120c3ddb3352fee74b99247b939734f23fa9ef5a6d2a2608e50c35a9b4',
      pkg: '7b76d701a8513dd7a2a50065d34d0eb0b10aee4980e0ae6814baeb43f3caae87',
      stfs: '',
    },
  },
  {
    name: 'The Beatles: Rock Band',
    code: 'tbrb',
    outdated: false,
    folderName: 'TheBeatlesRockBand',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/tbrb.jpg'),
    hashes: {
      extractedRPCS3: 'fa11c956b9a20c6dfbd40037f8931b4eebd00eab37b5cecb194396196a75a603',
      pkg: 'e9dc7c631ab5abeb9acdc8d5314a5c40c9cf81402e007378a4a32043058cc03c',
      stfs: '',
    },
  },
  {
    name: 'Green Day: Rock Band',
    code: 'gdrb',
    outdated: false,
    folderName: 'Green-Day-Rock-Band-Export',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/gdrb.jpg'),
    hashes: {
      extractedRPCS3: 'cbf9e908f9ace1ffa3c566264b1fdeb8c361be59e2096f2d5e6a16b39c022475',
      pkg: 'c4d8ecfb9a192c3bdba390f1bac799260a0cf5fcdededceb059abea23ad6fbca',
      stfs: '',
    },
  },
  {
    name: 'Rock Band 3 (to RB2)',
    code: 'rb3_to_rb2',
    outdated: false,
    folderName: 'RB3-to-RB2-DISC',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3.jpg'),
    hashes: {
      extractedRPCS3: 'cd3f8eb9736e36b13884dd13fa68a7e97da67a8f06549e638f181c189d977ed2',
      pkg: 'b919ddd11ed5a9e399119805d0a4a7904f2a09b2f2c030e0c79741a817fa8a0e',
      stfs: '',
    },
    isDuplicatedForRB3: true,
  },
  {
    name: 'Rock Band 3 (to Blitz)',
    code: 'rb3_to_blitz',
    outdated: false,
    folderName: 'RB3-Rock-Band-3-Export',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3.jpg'),
    hashes: {
      extractedRPCS3: '146eb95cfc53662e7384c792f4fa5a2c64cda7a77f3dd8de2915b7f9525f75b6',
      pkg: '548091726f960589e5f3a180754ab702643d77ec752bc17ea211689628661a86',
      stfs: '',
    },
    isDuplicatedForRB3: true,
  },
  {
    name: 'Rock Band 3 Beta Songs',
    code: 'rb3beta',
    outdated: false,
    folderName: 'RB3BetaSongs',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3beta.jpg'),
    hashes: {
      extractedRPCS3: '580e45e1733ee8b997243bcf5fe4b86e530ceb896a022df022b19502a1fda1a3',
      pkg: 'df60d01b226d3d94ebc78fed44199040e551fbb96280ddd964b59d88bc0e077b',
      stfs: '',
    },
  },
  {
    name: 'Rock Band Blitz',
    code: 'rbb',
    outdated: false,
    folderName: 'Rock-Band-Bltz-Export',
    packageType: 'rb3',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbb.jpg'),
    hashes: {
      extractedRPCS3: 'af63279a693e585ef95a70794db1bdb2b0f30f6559835ae07284a711dc7f838c',
      pkg: 'e10d0362d06128ba7111a4bc16369c6c2c8044c4ec2a298bf78a45d30e7c6c0e',
      stfs: '',
    },
  },
  {
    name: 'Rock Band VR',
    code: 'rbvr',
    outdated: false,
    folderName: 'RBVREXCLUSIVES-to-RB2',
    packageType: 'rb1',
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbvr.jpg'),
    hashes: {
      extractedRPCS3: '834f26860ab0892d47d3c2a32b54a06997f3efe88efe7770e10cf6cee2c3a0c6',
      pkg: '028efbc1af4972b2df6bda1dafdfd7c6079ef18ae736fb4a15d8870e3b6408a6',
      stfs: '',
    },
  },
]

/**
 * Returns an object with known properties of a specific official song package based on the song package contents hash. Returns `undefined` if the provided hash does not match any known official song package hashes.
 * - - - -
 * @param {OfficialPackagesHashTypes} type The type of the contents hash you want to search to.
 * @param {string} hash The actual hash string you want to search to.
 * @returns {ParsedSongPackageDatabaseObject | undefined}
 */
export const getOfficialSongPackageStatsFromHash = (type: OfficialPackagesHashTypes, hash: string): OfficialSongPackageStatsJSON | undefined => {
  for (const pack of officialPackages) {
    if (pack.hashes[type].toLowerCase() === hash.toLowerCase())
      return {
        ...pack,
        thumbnailPath: pack.thumbnailPath().path,
      }
  }
}

/**
 * Returns an object with known properties of a specific official song package based on its installed folder name. Returns `undefined` if the provided folder name does not match any known official song package folder names.
 * - - - -
 * @param {string} folderName The folder name you want to search to.
 * @returns {ParsedSongPackageDatabaseObject | undefined}
 */
export const getOfficialSongPackageStatsFromPKGFolderName = (folderName: string): OfficialSongPackageStatsJSON | undefined => {
  for (const pack of officialPackages) {
    if (pack.folderName === folderName)
      return {
        ...pack,
        thumbnailPath: pack.thumbnailPath().path,
      }
  }
  return
}

/**
 * Checks if the provided folder name is available to be used on the Rock Band 3's USRDIR folder without merging/overwriting an existing package.
 * - - - -
 * @param {DirPathLikeTypes} devhdd0Path The path to the `dev_hdd0` folder of your RPCS3 installation.
 * @param {string} folderName The folder name you want to check availability.
 * @returns {Promise<boolean>}
 */
export const isRB3FolderNameFreeOnRPCS3 = async (devhdd0Path: DirPathLikeTypes, folderName: string): Promise<boolean> => {
  let proof = true
  const devhdd0 = isRPCS3Devhdd0PathValid(devhdd0Path)
  const allOfficialFolderNames = officialPackages.filter((pack) => pack.packageType === 'rb3').map((pack) => pack.folderName)
  const allUnofficialFolderNames = (await devhdd0.gotoDir('game/BLUS30463/USRDIR').readDir()).filter((dir) => dir instanceof DirPath && dir.name !== 'gen' && !allOfficialFolderNames.includes(dir.name))
  const allFolderNames = [...allOfficialFolderNames, ...allUnofficialFolderNames]

  if (allFolderNames.includes(folderName)) proof = false
  return proof
}
