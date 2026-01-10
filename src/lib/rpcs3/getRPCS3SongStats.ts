import { createHashFromBuffer, DirPath, FilePath, MyObject } from 'node-lib'
import { DTAParser, EDATFile, RPCS3, type RPCS3Options } from '../../core.exports'
import type { AnyDTAType } from '../../lib.exports'

export type GamePackageOriginTypes = 'preRB3' | 'rb3'

export interface InstalledSongPackagesStats {
  /**
   * The path of the package.
   */
  packagePath: string
  /**
   * The path of the package's DTA file.
   */
  dtaPath: string
  /**
   * The folder name of the package.
   */
  folderName: string
  /**
   * The game this pack belongs to.
   */
  origin: GamePackageOriginTypes
  /**
   * The possible hash to decrypt its EDAT files.
   */
  devKLic: string
  /**
   * An unique identifier of the package and its contents using SHA3-512 hashing
   */
  id: string
  /**
   * List of songs included in the package.
   */
  songs: AnyDTAType[]
  /**
   * An array with relative paths to all files included in the package.
   */
  files: string[]
}

export interface GamePackagesStats {
  /**
   * The amount of songs on the Rock Band 3.
   */
  rb3SongsCount: number
  /**
   * The amount of packs installed on the Rock Band 3 DLC folder.
   */
  rb3DLCPacksCount: number
  /**
   * The amount of songs installed on the Rock Band 3 DLC folder.
   */
  rb3DLCSongsCount: number
  /**
   * The amount of packs installed on the Rock Band 1 DLC folder.
   */
  preRB3DLCPacksCount: number
  /**
   * The amount of songs installed on the Rock Band 1 DLC folder.
   */
  preRB3DLCSongsCount: number
  /**
   * The amount of packs installed that works on both all main Rock Band titles.
   */
  allPacksCount: number
  /**
   * The amount of songs installed that works on both all main Rock Band titles.
   */
  allSongsCount: number
  /**
   * The amount of packs installed that works on both all main Rock Band titles, including the 83 songs from Rock Band 3.
   */
  allSongsCountWithRB3Songs: number
  /**
   * The amount of stars that can be earned for each song.
   */
  starsCount: number
  /**
   * An array with information about all song packages installed.
   */
  packages: InstalledSongPackagesStats[]
}

/**
 * Returns an object containing information about all installed song packages.
 * - - - -
 * @param {RPCS3Options} options An object with the RPCS3 executable and `dev_hdd0` folder path.
 * @returns {Promise<GamePackagesStats>}
 */
export const getRPCS3SongStats = async (options: RPCS3Options): Promise<GamePackagesStats> => {
  const { devhdd0Path } = RPCS3.getParsedRPCS3Options(options)

  const packs: InstalledSongPackagesStats[] = []
  let rb3PacksCount = 0,
    rb3SongsCount = 0,
    preRB3PacksCount = 0,
    preRB3SongsCount = 0

  // TO-DO Adding Rock Band 3 On Disc songs
  const usrdir = devhdd0Path.gotoDir('game/BLUS30463/USRDIR')
  if (usrdir.exists) {
    const allPacks = (await usrdir.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen').map((entry) => entry.gotoFile('songs/songs.dta'))

    for (const pack of allPacks) {
      if (pack.exists) {
        const t = async (a: string[]) => {
          let value = ''
          let i = 0
          for (const ba of a.map((entry) => pack.gotoDir('').gotoFile(entry))) {
            const stat = await ba.stat()
            value += `file=${a[i]} size=${stat.size}\n`
            i++
          }

          return createHashFromBuffer(Buffer.from(value), 'sha3-512')
        }
        rb3PacksCount++
        const parsedData = await DTAParser.fromFile(pack)
        rb3SongsCount += parsedData.songs.length

        const packagePath = pack.gotoDir('../').path
        const dtaPath = pack.path
        const folderName = pack.gotoDir('../').name
        const origin = 'rb3'
        const devKLic = EDATFile.genDevKLicHash(pack.gotoDir('../').name)
        const files = (await pack.gotoDir('').readDir(true)).filter((entry) => entry instanceof FilePath).map((entry) => entry.path.slice(pack.gotoDir('').path.length + 1).replace(/\\/g, '/'))
        const test = await t(files)

        const packMap = new MyObject<InstalledSongPackagesStats>()
        packMap.set('packagePath', packagePath)
        packMap.set('dtaPath', dtaPath)
        packMap.set('folderName', folderName)
        packMap.set('origin', origin)
        packMap.set('devKLic', devKLic.toLowerCase())
        packMap.set('id', test)
        packMap.set('songs', parsedData.songs)
        packMap.set('files', files)
        packs.push(packMap.toObject())
      }
    }
  }

  const usrdirPreRB3 = devhdd0Path.gotoDir('game/BLUS30050/USRDIR')
  if (usrdirPreRB3.exists) {
    const allPacks = (await usrdirPreRB3.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen').map((entry) => entry.gotoFile('songs/songs.dta'))

    for (const pack of allPacks) {
      if (pack.exists) {
        preRB3PacksCount++
        const parsedData = await DTAParser.fromFile(pack)
        await parsedData.applyDXUpdatesOnSongs(true)
        preRB3SongsCount += parsedData.songs.length
        preRB3SongsCount += parsedData.updates.length
        const packMap = new MyObject<InstalledSongPackagesStats>()
        packMap.set('path', pack.path)
        packMap.set('name', pack.gotoDir('../').name)
        packMap.set('origin', 'preRB3')
        packMap.set('songs', [...parsedData.updates, ...parsedData.songs])
        packMap.set('klic', EDATFile.genDevKLicHash(pack.gotoDir('../').name).toLowerCase())
        packs.push(packMap.toObject())
      }
    }
  }

  const value = new MyObject<GamePackagesStats>()

  const allSongsCountWithRB3Songs = preRB3SongsCount + rb3SongsCount + 83

  value.set('rb3SongsCount', 83)
  value.set('preRB3DLCPacksCount', preRB3PacksCount)
  value.set('preRB3DLCSongsCount', preRB3SongsCount)
  value.set('rb3DLCPacksCount', rb3PacksCount)
  value.set('rb3DLCSongsCount', rb3SongsCount)
  value.set('allPacksCount', preRB3PacksCount + rb3PacksCount)
  value.set('allSongsCount', preRB3SongsCount + rb3SongsCount)
  value.set('allSongsCountWithRB3Songs', allSongsCountWithRB3Songs)
  value.set('starsCount', allSongsCountWithRB3Songs * 5)
  value.set('packages', packs)

  return value.toObject()
}
