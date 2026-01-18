import { createHashFromBuffer, DirPath, FilePath, MyObject, parseReadableBytesSize, pathLikeToDirPath, type DirPathLikeTypes } from 'node-lib'
import { DTAParser, EDATFile, RBTools } from '../../core.exports'
import type { RB3CompatibleDTAFile } from '../dta/dtaStruct'

// #region Types

export type GamePackageOriginTypes = 'preRb3DLC' | 'rb3DLC'

export interface InstalledSongPackagesStats {
  /**
   * The name of the package folder.
   */
  name: string
  /**
   * The path of the package.
   */
  packagePath: string
  /**
   * The path of the package DTA file.
   */
  dtaFilePath: string
  /**
   * The game this pack belongs to.
   */
  origin: GamePackageOriginTypes
  /**
   * The size of the package in bytes.
   */
  packageSize: number
  /**
   * The amount of songs inside the package.
   */
  songsCount: number
  /**
   * The possible hash to decrypt its EDAT files.
   */
  devKLic: string
  /**
   * An unique identifier of the package DTA file contents using SHA3-224 hashing algorithm.
   */
  dtaHash: string
  /**
   * An unique identifier of the package contents using SHA3-224 hashing algorithm.
   */
  contentsHash: string
  allIDs: string[]
  allSongnames: string[]
  allSongIDs: (string | number)[]
  /**
   * The string used to calculate `contentsHash`.
   */
  manifest: string
  /**
   * An array with relative paths to all files included in the package.
   */
  files: string[]
  imgData?: string
}

export interface RB3SongPackagesData {
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

// #region Function

export const rpcs3GetPackageFilesData = async (packageDirPath: DirPathLikeTypes): Promise<string[]> => {
  const packagePath = pathLikeToDirPath(packageDirPath)
  const files = (await packagePath.gotoDir('songs').readDir(true)).filter((entry) => entry instanceof FilePath).map((entry) => entry.path.slice(packagePath.gotoDir('songs').path.length + 1).replace(/\\/g, '/'))
  return files.toReversed()
}

export interface RPCS3PackageFilesManifestData {
  /**
   * A string with the name and size of all files formatted to create contents hash from it.
   */
  manifest: string
  /**
   * The size of all files from the package.
   */
  packageSize: number
}

export const rpcs3GetPackageFilesManifest = async (packageDirPath: DirPathLikeTypes, files: string[]): Promise<RPCS3PackageFilesManifestData> => {
  const packagePath = pathLikeToDirPath(packageDirPath)
  const insideSongsFolderPath = packagePath.gotoDir('songs').path
  let manifest = ''
  let packageSize = 0
  let i = 0
  const filesPath = files.filter((val) => val !== 'songs.dta').map((f) => FilePath.of(insideSongsFolderPath, f))

  for (const file of filesPath) {
    const fileStat = await file.stat()
    manifest += `| file=${filesPath[i].path.slice(insideSongsFolderPath.length + 1).replace(/\\/g, '/')} | size=${fileStat.size}\n`
    packageSize += fileStat.size
    i++
  }

  return { manifest, packageSize }
}

/**
 * Returns an object containing information about all installed song packages.
 * - - - -
 * @param {DirPathLikeTypes} devhdd0DirPath The path of the user's `dev_hdd0` folder.
 * @returns {Promise<RB3SongPackagesData>}
 */
export const rpcs3GetPackagesData = async (devhdd0DirPath: DirPathLikeTypes): Promise<RB3SongPackagesData> => {
  const devhdd0Path = pathLikeToDirPath(devhdd0DirPath)

  const packages: InstalledSongPackagesStats[] = []
  let rb3DLCPacksCount = 0,
    rb3DLCSongsCount = 0,
    preRB3DLCPacksCount = 0,
    preRB3DLCSongsCount = 0

  // RB3 Songs
  const rb3Songs = await RBTools.dbFolder.gotoFile('rb3.json').readJSON<RB3CompatibleDTAFile[]>()
  const packMap = new MyObject<InstalledSongPackagesStats>({
    name: 'Rock Band 3',
    packagePath: '_ark/songs',
    dtaFilePath: '_ark/songs/songs.dta',
    origin: 'rb3DLC',
    packageSize: parseReadableBytesSize('2.38GB'),
    songsCount: rb3Songs.length,
    devKLic: EDATFile.genDevKLicHash('RB3-Rock-Band-3-Export'),
    dtaHash: Buffer.alloc(56 / 2).toString('hex'),
    contentsHash: Buffer.alloc(56 / 2).toString('hex'),
    allIDs: rb3Songs.map((song) => song.id).toSorted(),
    allSongnames: rb3Songs.map((song) => song.songname).toSorted(),
    allSongIDs: rb3Songs.map((song) => song.song_id).toSorted(),
    manifest: '',
    files: [],
  })

  packages.push(packMap.toJSON())

  const usrdir = devhdd0Path.gotoDir('game/BLUS30463/USRDIR')
  if (usrdir.exists) {
    const allPacksFolder = (await usrdir.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen').map((entry) => DirPath.of(entry.path))

    for (const packagePath of allPacksFolder) {
      const dtaFilePath = packagePath.gotoFile('songs/songs.dta')

      rb3DLCPacksCount++
      const parsedData = await DTAParser.fromFile(dtaFilePath)
      parsedData.sort('ID')
      rb3DLCSongsCount += parsedData.songs.length

      const packageFiles = await rpcs3GetPackageFilesData(packagePath)
      const origin: GamePackageOriginTypes = 'rb3DLC'
      const devKLic = EDATFile.genDevKLicHash(packagePath.name)
      const { manifest, packageSize } = await rpcs3GetPackageFilesManifest(packagePath, packageFiles)
      const dtaHash = createHashFromBuffer(Buffer.from(parsedData.stringify()), 'sha3-224')
      const contentsHash = createHashFromBuffer(Buffer.from(manifest), 'sha3-224')
      const songsCount = parsedData.songs.length
      const allIDs = parsedData.songs.map((song) => song.id).toSorted()
      const allSongnames = parsedData.songs.map((song) => song.songname).toSorted()
      const allSongIDs = parsedData.songs.map((song) => song.song_id).toSorted()

      const packMap = new MyObject<InstalledSongPackagesStats>({
        name: packagePath.name,
        packagePath: packagePath.path,
        dtaFilePath: dtaFilePath.path,
        origin,
        packageSize,
        songsCount,
        devKLic,
        dtaHash,
        contentsHash,
        allIDs,
        allSongnames,
        allSongIDs,
        manifest,
        files: packageFiles,
      })

      packages.push(packMap.toJSON())
    }
  }

  const usrdirPreRB3 = devhdd0Path.gotoDir('game/BLUS30050/USRDIR')
  if (usrdirPreRB3.exists) {
    const RB1_RAP_FOLDER = 'CCF0099'
    const OFFICIAL_PACK_NAMES = ['RB1FULLEXPORTPS3', 'RB2-Rock-Band-2-Export', 'RB4-to-RB2-DISC', 'RB1DLCPACK01OF10', 'RB1DLCPACK02OF10', 'RB1DLCPACK03OF10', 'RB1DLCPACK04OF10', 'RB1DLCPACK05OF10', 'RB1DLCPACK06OF10', 'RB1DLCPACK07OF10', 'RB1DLCPACK08OF10', 'RB1DLCPACK09OF10', 'RB1DLCPACK10OF10']
    const allPacksFolder = (await usrdirPreRB3.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen' && entry.name !== RB1_RAP_FOLDER && OFFICIAL_PACK_NAMES.includes(entry.name)).map((entry) => DirPath.of(entry.path))

    for (const packagePath of allPacksFolder) {
      const dtaFilePath = packagePath.gotoFile('songs/songs.dta')

      preRB3DLCPacksCount++
      const parsedData = await DTAParser.fromFile(dtaFilePath)
      await parsedData.applyDXUpdatesOnSongs(true)
      parsedData.sort('ID')
      preRB3DLCSongsCount += parsedData.songs.length

      const packageFiles = await rpcs3GetPackageFilesData(packagePath)
      const origin: GamePackageOriginTypes = 'preRb3DLC'
      const devKLic = EDATFile.genDevKLicHash(packagePath.name)
      const { manifest, packageSize } = await rpcs3GetPackageFilesManifest(packagePath, packageFiles)
      const dtaHash = createHashFromBuffer(Buffer.from(parsedData.stringify()), 'sha3-224')
      const contentsHash = createHashFromBuffer(Buffer.from(manifest), 'sha3-224')
      const songsCount = parsedData.songs.length

      const packMap = new MyObject<InstalledSongPackagesStats>({
        name: packagePath.name,
        packagePath: packagePath.path,
        dtaFilePath: dtaFilePath.path,
        origin,
        packageSize,
        songsCount,
        devKLic,
        dtaHash,
        contentsHash,
        manifest,
        files: packageFiles,
      })

      packages.push(packMap.toJSON())
    }
  }

  const value = new MyObject<RB3SongPackagesData>()
  const rb3SongsCount = 83
  const allPacksCount = preRB3DLCPacksCount + rb3DLCPacksCount
  const allSongsCount = preRB3DLCSongsCount + rb3DLCSongsCount
  const allSongsCountWithRB3Songs = allSongsCount + rb3SongsCount
  const starsCount = allSongsCountWithRB3Songs * 5

  value.setMany({
    rb3SongsCount,
    preRB3DLCPacksCount,
    preRB3DLCSongsCount,
    rb3DLCPacksCount,
    rb3DLCSongsCount,
    allPacksCount,
    allSongsCount,
    allSongsCountWithRB3Songs,
    starsCount,
    packages,
  })

  return value.toJSON()
}
