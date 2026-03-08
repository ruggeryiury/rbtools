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
  code: 'tu5' | 'rb1' | 'rb2' | 'rb3' | 'lrb' | 'tbrb' | 'gdrb' | 'rb3_to_rb2' | 'rb3_to_blitz' | 'rb3beta' | 'rbb' | 'rb4' | 'rb4r' | 'rbvr' | 'rbdlc1' | 'rbdlc2' | 'rbdlc3' | 'rbdlc4' | 'rbdlc5' | 'rbdlc6' | 'rbdlc7' | 'rbdlc8' | 'rbdlc9' | 'rbdlc10' | 'rb3dlc1' | 'rb3dlc2' | 'rb3dlc3' | 'rb3dlc4' | 'rb3dlc5' | 'rb4dlc1' | 'rb4dlc2' | 'rb4dlc3' | 'rb4dlc4' | 'rb4dlc5' | 'rb4dlc6'
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

  // Paths
  /**
   * A function that evaluates to the path to the official package thumbnail.
   */
  thumbnailPath: () => FilePath
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
    hashes: {
      extractedRPCS3: '',
      pkg: 'cba38dc92d6b7327e0a4c6efb014f3269d183ba475fce6d863b33d2178d28778',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/tu5.jpg'),
  },
  {
    name: 'Rock Band 1',
    code: 'rb1',
    outdated: false,
    folderName: 'RB1FULLEXPORTPS3',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'dfb3bd3a8b9060f853be063906947b705695e90b7301e2504e73e5f96bb05bff',
      pkg: 'e386b8ab41e844ff087400533920cccca99c4fe3d455756bab35223592b0e683',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb1.jpg'),
  },
  {
    name: 'Rock Band 2',
    code: 'rb2',
    outdated: false,
    folderName: 'RB2-Rock-Band-2-Export',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '72afb485363fba9bbbf7e92e570e796c2245a0cb82d3081e1a88290a306c154d',
      pkg: '92462fe7347aa14446b5b38409c7a91c48564fd4932d76e0b4e83a52fb3ca5ce',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb2.jpg'),
  },
  {
    name: 'LEGO Rock Band',
    code: 'lrb',
    outdated: false,
    folderName: 'LEGO-Rock-Band-Export',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'e1fd2a120c3ddb3352fee74b99247b939734f23fa9ef5a6d2a2608e50c35a9b4',
      pkg: '7b76d701a8513dd7a2a50065d34d0eb0b10aee4980e0ae6814baeb43f3caae87',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/lrb.jpg'),
  },
  {
    name: 'The Beatles: Rock Band',
    code: 'tbrb',
    outdated: false,
    folderName: 'TheBeatlesRockBand',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: 'fa11c956b9a20c6dfbd40037f8931b4eebd00eab37b5cecb194396196a75a603',
      pkg: 'e9dc7c631ab5abeb9acdc8d5314a5c40c9cf81402e007378a4a32043058cc03c',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/tbrb.jpg'),
  },
  {
    name: 'Green Day: Rock Band',
    code: 'gdrb',
    outdated: false,
    folderName: 'Green-Day-Rock-Band-Export',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'cbf9e908f9ace1ffa3c566264b1fdeb8c361be59e2096f2d5e6a16b39c022475',
      pkg: 'c4d8ecfb9a192c3bdba390f1bac799260a0cf5fcdededceb059abea23ad6fbca',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/gdrb.jpg'),
  },
  {
    name: 'Rock Band 3 (to RB2)',
    code: 'rb3_to_rb2',
    outdated: false,
    folderName: 'RB3-to-RB2-DISC',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'cd3f8eb9736e36b13884dd13fa68a7e97da67a8f06549e638f181c189d977ed2',
      pkg: 'b919ddd11ed5a9e399119805d0a4a7904f2a09b2f2c030e0c79741a817fa8a0e',
      stfs: '',
    },
    isDuplicatedForRB3: true,
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3.jpg'),
  },
  {
    name: 'Rock Band 3 (to Blitz)',
    code: 'rb3_to_blitz',
    outdated: false,
    folderName: 'RB3-Rock-Band-3-Export',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '146eb95cfc53662e7384c792f4fa5a2c64cda7a77f3dd8de2915b7f9525f75b6',
      pkg: '548091726f960589e5f3a180754ab702643d77ec752bc17ea211689628661a86',
      stfs: '',
    },
    isDuplicatedForRB3: true,
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3.jpg'),
  },
  {
    name: 'Rock Band 3 Beta Songs',
    code: 'rb3beta',
    outdated: false,
    folderName: 'RB3BetaSongs',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '580e45e1733ee8b997243bcf5fe4b86e530ceb896a022df022b19502a1fda1a3',
      pkg: 'df60d01b226d3d94ebc78fed44199040e551fbb96280ddd964b59d88bc0e077b',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3beta.jpg'),
  },
  {
    name: 'Rock Band Blitz',
    code: 'rbb',
    outdated: false,
    folderName: 'Rock-Band-Bltz-Export',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: 'af63279a693e585ef95a70794db1bdb2b0f30f6559835ae07284a711dc7f838c',
      pkg: 'e10d0362d06128ba7111a4bc16369c6c2c8044c4ec2a298bf78a45d30e7c6c0e',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbb.jpg'),
  },
  {
    name: 'Rock Band 4',
    code: 'rb4',
    outdated: false,
    folderName: 'RB4-to-RB2-DISC',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '95042a20e3533c245567a9a83116e40fa76f512cd0e82bc0fe2dbe1c45e8595e',
      pkg: 'bcec0a387334d58ca23c7048bc7be99c02fb00bd68230d0c61bed79299743539',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4.jpg'),
  },
  {
    name: 'Rock Band 4 Rivals',
    code: 'rb4r',
    outdated: false,
    folderName: 'RB4-to-RB2-RIVALS',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: 'bca83294fb5a5f95d484b6918932cc049d07018e460fcb4611b8ca1fc12df1b8',
      pkg: '94a1da8caf9006771c87b14d9d6412a676293a9c80c01d55723d3378d09a0e36',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4r.jpg'),
  },
  {
    name: 'Rock Band VR',
    code: 'rbvr',
    outdated: false,
    folderName: 'RBVREXCLUSIVES-to-RB2',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '834f26860ab0892d47d3c2a32b54a06997f3efe88efe7770e10cf6cee2c3a0c6',
      pkg: '028efbc1af4972b2df6bda1dafdfd7c6079ef18ae736fb4a15d8870e3b6408a6',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbvr.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 01',
    code: 'rbdlc1',
    outdated: false,
    folderName: 'RB1DLCPACK01OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'fdfd08204608b155c919bf48cb3079733bdb74aaf4c93edebf32f36219becd21',
      pkg: '09b366ffd83d1952ceb0bb45a27e990773109ffeffc590118075a43d786a65f6',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc1.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 02',
    code: 'rbdlc2',
    outdated: false,
    folderName: 'RB1DLCPACK02OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '155b3d86d6fb59690aea29426ff930a937f00bbe2972ebc068e621cf94b1f59b',
      pkg: 'c7759d3d82d396e393e627db77a6622f295e32533740ec9f12f76f82fcd346d0',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc2.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 03',
    code: 'rbdlc3',
    outdated: false,
    folderName: 'RB1DLCPACK03OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'e5592142b98710dd8b29ffecd5fcb0175b581f368f1b0a26cb8591daadbd8ff7',
      pkg: '523d2ed8ea9844f33fb2a8eff6ea46763262b075b279a14048551f66826f036d',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc3.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 04',
    code: 'rbdlc4',
    outdated: false,
    folderName: 'RB1DLCPACK04OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '5e265b7a9b262a4e162d1e116785c1a9d53057eaa34339dbfdbd7d8c1a8cb1d1',
      pkg: '663694ac425f4c63729258d8f2bbfa3486ee5c2dbf9ead8e98bdec6e70769bb6',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc4.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 05',
    code: 'rbdlc5',
    outdated: false,
    folderName: 'RB1DLCPACK05OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'd35e60e383892499587fa35b6fb6af760e8b0113e00de948fea70f70ba0c044c',
      pkg: '6e72d18e8df87a435a0adaecb962a4948f1c4b2b3249839082016b1a77c19c40',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc5.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 06',
    code: 'rbdlc6',
    outdated: false,
    folderName: 'RB1DLCPACK06OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '23662412fd40e215637f3c179eba7ab76394641a8bc67b3dc093e06c1d4d794f',
      pkg: '7eea3b38eed30405c59075e8ddbb0aec9625946ce32a47f061cca8d89ea15eb3',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc6.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 07',
    code: 'rbdlc7',
    outdated: false,
    folderName: 'RB1DLCPACK07OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '6fddd079928b0aa8ae39ee67d8698429c8fe546c1880924877d9cfe78d645296',
      pkg: '3c39a7433e9d5475382c7f1f09bbd1d20062fcdeed503c7153a2af3d588e5470',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc7.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 08',
    code: 'rbdlc8',
    outdated: false,
    folderName: 'RB1DLCPACK08OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'd446b7663ef6dde4d46f7b64d270aab74fb1c66a01d873c48d7e2e5348b0fd9f',
      pkg: 'e6615d2bf62527faf0ac6afc123462bfcbab1a6d5a0671f51cd2cb63db7cf936',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc8.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 09',
    code: 'rbdlc9',
    outdated: false,
    folderName: 'RB1DLCPACK09OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: 'a0651dd1c52d419ba7dc16012a765833bdeebab99de6ccdb4465bfbb20c5afba',
      pkg: '48acc7f212aa3460647846ad31899948649817ea7c48c421914a93c23e69feee',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc9.jpg'),
  },
  {
    name: 'Rock Band DLC Pack 10',
    code: 'rbdlc10',
    outdated: false,
    folderName: 'RB1DLCPACK10OF10',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '902166c43337d232d6b7b2f8e6ddb0ffce7fc51d316b11956b94c6b0040d289b',
      pkg: '8bed8148d3882dcde72403d90cbf56371bda267698608729695cc1417a6fdec2',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rbdlc10.jpg'),
  },
  {
    name: 'Rock Band 3 DLC Pack 01',
    code: 'rb3dlc1',
    outdated: false,
    folderName: 'RB3DLCPACK01OF05',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '42b271c039f0b50b4cfc0c2b1f89ea7bac78595076e41047702bf04af7d7ce1b',
      pkg: '4ff83da2b9e1e7e045894f1c8573538782d6315f2d4de12804e5c7b811c4d28f',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3dlc1.jpg'),
  },
  {
    name: 'Rock Band 3 DLC Pack 02',
    code: 'rb3dlc2',
    outdated: false,
    folderName: 'RB3DLCPACK02OF05',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '7db93c7abe86185881a11dccafa67faf178898d05b8bfcfa1bbbcdb8e4f74baf',
      pkg: '81cfbad95157af8b1ea2f0ee46d4ecf70125c29a47f38778cd4cf3927fd4ba42',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3dlc2.jpg'),
  },
  {
    name: 'Rock Band 3 DLC Pack 03',
    code: 'rb3dlc3',
    outdated: false,
    folderName: 'RB3DLCPACK03OF05',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '15a8a9da7e9063742c2aa2f5362762f0af3fc691a25b0ea5af86a39a71543db7',
      pkg: 'a5bb6f17ab9239a1eb78e07bf5b2b66bccf5bba28920a3c6b1ec75feef89b231',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3dlc3.jpg'),
  },
  {
    name: 'Rock Band 3 DLC Pack 04',
    code: 'rb3dlc4',
    outdated: false,
    folderName: 'RB3DLCPACK04OF05',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: '71a8063f9db38e970365f1c7ee4406a077f42aa1d2383d648398e9a7cad312eb',
      pkg: '5357d7690c56c61752c55006898201652b5c455893957374507fa73dc0f63ab5',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3dlc4.jpg'),
  },
  {
    name: 'Rock Band 3 DLC Pack 05',
    code: 'rb3dlc5',
    outdated: false,
    folderName: 'RB3DLCPACK05OF05',
    packageType: 'rb3',
    hashes: {
      extractedRPCS3: 'c16eeea984e761325e71e60f255c19ed5caa8b6d11a34816e8cb5955a8c4610e',
      pkg: 'b2f715fb7ebe8b893cac9c13c8b1ec7da8803395c879f48299086465d84ca47d',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb3dlc5.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 01',
    code: 'rb4dlc1',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-1',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: 'ad5e6f3a03152ccb0dddd2a78a68cb240ef3985880a8252ec54fa1da4e00dbe4',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc1.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 02',
    code: 'rb4dlc2',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-2',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: '68bfc0fe61a8961780c5b65ff05f8ee894391ffe07ecf0781375cd2dd6d9227d',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc2.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 03',
    code: 'rb4dlc3',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-3',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: '6b07dc4a812c26e71120ce62c41ecd6cc77b5781300b6051f83d52bcb361a802',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc3.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 04',
    code: 'rb4dlc4',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-4',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: '16a9ff93b938ae95d2397dbd2b645a9d10808dc528481373a299da249c3b77f2',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc4.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 05',
    code: 'rb4dlc5',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-5',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: 'eb8d1d89f3cd7e349865199a69666c7ce4c6186d40aab1f277a0b043f975667d',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc5.jpg'),
  },
  {
    name: 'Rock Band 4 DLC Pack 06',
    code: 'rb4dlc6',
    outdated: false,
    folderName: 'RB4-to-RB2-DLC-6',
    packageType: 'rb1',
    hashes: {
      extractedRPCS3: '',
      pkg: '141d10d08fe7e789455f9726a06aa6edb4f1c023e390bd80b4e378ea7cd10876',
      stfs: '',
    },
    thumbnailPath: () => RBTools.resFolder.gotoFile('icons/rb4dlc6.jpg'),
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
