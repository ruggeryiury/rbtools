import { createHashFromBuffer, DirPath, FilePath, MyObject, parseReadableBytesSize, pathLikeToDirPath, type DirPathLikeTypes } from 'node-lib'
import { DTAParser, EDATFile, RBTools } from '../../core.exports'
import { getOfficialPkgFromHash, isRPCS3Devhdd0PathValid, type ParsedSongPackageDatabaseObject, type RB3CompatibleDTAFile } from '../../lib.exports'
import { useDefaultOptions } from 'use-default-options'

export interface RPCS3SongPackagesObject {
  name: string
  path: string
  packageType: 'rb3' | 'rb1'
  dtaFilePath: string
  isOfficial: ParsedSongPackageDatabaseObject | undefined
  packageSize: number
  songsCount: number
  devklic: string
  contentsHash: string
  entriesIDs: string[]
  songnames: string[]
  songIDs: (string | number)[]
  // manifest: string
  packageFiles: string[]
  rsdat?: {}
}

export interface RPCS3SongPackagesData {
  rb3SongsCount: number
  rb1PackagesCount: number
  rb1PackagesSongsCount: number
  rb3PackagesCount: number
  rb3PackagesSongsCount: number
  allPackagesCount: number
  allSongsCount: number
  allSongsPlusRB3: number
  starsCount: number
  packages: RPCS3SongPackagesObject[]
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
  /**
   *
   */
  packageFiles: string[]
}

const RB1_RAP_FOLDER = 'CCF0099'

export const rpcs3GetPackageFilesManifest = async (packageDirPath: DirPathLikeTypes): Promise<RPCS3PackageFilesManifestData> => {
  const packagePath = pathLikeToDirPath(packageDirPath)
  const insideSongsFolderPath = packagePath.gotoDir('songs').path
  const files = (await packagePath.gotoDir('songs').readDir(true))
    .filter((entry) => entry instanceof FilePath)
    .map((entry) => entry.path.slice(packagePath.gotoDir('songs').path.length + 1).replace(/\\/g, '/'))
    .toReversed()
    .filter((val) => val !== 'songs.dta')
    .map((file) => FilePath.of(insideSongsFolderPath, file))
  let manifest = ''
  let packageSize = 0
  let i = 0

  for (const file of files) {
    const fileStat = await file.stat()
    manifest += `| file=${files[i].path.slice(insideSongsFolderPath.length + 1).replace(/\\/g, '/')} | size=${fileStat.size}\n`
    packageSize += fileStat.size
    i++
  }

  return { manifest, packageSize, packageFiles: files.map((file) => file.path) }
}

export interface RPCS3SongPackageStatsOptions {
  /**
   * Includes the Rock Band 3 on-disc song package. Default is `true`.
   */
  includeRB3Songs: boolean
}

/**
 * Returns an object with statistics of installed Rock Band song packages on RPCS3 emulator.
 * - - - -
 * @param {DirPathLikeTypes} devhdd0Path The path to the `dev_hdd0` folder of your RPCS3 installation.
 * @param {RPCS3SongPackageStatsOptions} [options] `OPTIONAL` An object with properties that modifies the default behavior of the stat data fetching process.
 * @returns {Promise<RPCS3SongPackagesData>}
 */
export const rpcs3GetSongPackagesStats = async (devhdd0Path: DirPathLikeTypes, options?: RPCS3SongPackageStatsOptions): Promise<RPCS3SongPackagesData> => {
  const { includeRB3Songs } = useDefaultOptions<RPCS3SongPackageStatsOptions>({ includeRB3Songs: true }, options)
  const devhdd0 = isRPCS3Devhdd0PathValid(devhdd0Path)

  const packages: RPCS3SongPackagesObject[] = []

  if (includeRB3Songs) {
    const rb3SongsJSON = await RBTools.dbFolder.gotoFile('rb3.json').readJSON<RB3CompatibleDTAFile[]>()
    const rb3Pack = new MyObject<RPCS3SongPackagesObject>({
      name: 'Rock Band 3',
      path: '_ark/songs',
      packageType: 'rb3',
      dtaFilePath: '_ark/songs/songs.dta',
      isOfficial: {
        name: 'Rock Band 3',
        code: 'rb3',
        version: 1,
        outdated: false,
        folderName: '',
        packageType: 'rb3',
        thumbnailPath: RBTools.resFolder.gotoFile('icons/rb3.png').path,
        hashes: {
          extractedRPCS3: '',
          pkg: 'cba38dc92d6b7327e0a4c6efb014f3269d183ba475fce6d863b33d2178d28778',
          stfs: '',
        },
      },
      packageSize: parseReadableBytesSize('2.38GB'),
      songsCount: rb3SongsJSON.length,
      devklic: EDATFile.genDevKLicHash('RB3-Rock-Band-3-Export'),
      // dtaHash: Buffer.alloc(28).toString('hex'),
      contentsHash: Buffer.alloc(28).toString('hex'),
      entriesIDs: rb3SongsJSON.map((song) => song.id).toSorted(),
      songnames: rb3SongsJSON.map((song) => song.songname).toSorted(),
      songIDs: rb3SongsJSON.map((song) => song.song_id).toSorted(),
      // manifest: '',
      packageFiles: [],
    })

    packages.push(rb3Pack.toJSON())
  }

  let rb1PackagesSongsCount = 0,
    rb1PackagesCount = 0,
    rb3PackagesSongsCount = 0,
    rb3PackagesCount = 0

  const rb3UsrDir = devhdd0.gotoDir('game/BLUS30463/USRDIR')
  if (rb3UsrDir.exists) {
    const allRB3PackagesFolder = (await rb3UsrDir.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen') as DirPath[]

    if (allRB3PackagesFolder.length > 0) {
      for (const packagePath of allRB3PackagesFolder) {
        const dtaFilePath = packagePath.gotoFile('songs/songs.dta')

        if (!dtaFilePath.exists) continue

        const parsedData = await DTAParser.fromFile(dtaFilePath)
        parsedData.sort('ID')
        rb3PackagesCount++
        rb3PackagesSongsCount += parsedData.songs.length

        const devklic = EDATFile.genDevKLicHash(packagePath.name)
        const { manifest, packageSize, packageFiles } = await rpcs3GetPackageFilesManifest(packagePath)
        // const dtaHash = createHashFromBuffer(Buffer.from(parsedData.stringify()))
        const contentsHash = createHashFromBuffer(Buffer.from(manifest))
        const isOfficial = getOfficialPkgFromHash('extractedRPCS3', contentsHash)
        const songsCount = parsedData.songs.length
        const entriesIDs = parsedData.songs.map((song) => song.id).toSorted()
        const songnames = parsedData.songs.map((song) => song.songname).toSorted()
        const songIDs = parsedData.songs.map((song) => song.song_id).toSorted()

        const pack = new MyObject<RPCS3SongPackagesObject>({
          name: packagePath.name,
          path: packagePath.path,
          packageType: 'rb3',
          dtaFilePath: dtaFilePath.path,
          isOfficial,
          packageSize,
          songsCount,
          devklic,
          // dtaHash,
          contentsHash,
          entriesIDs,
          songnames,
          songIDs,
          packageFiles,
          // manifest,
        })

        packages.push(pack.toJSON())
      }
    }
  }

  const rb1UsrDir = devhdd0.gotoDir('game/BLUS30050/USRDIR')
  if (rb1UsrDir.exists) {
    const allRB1PackagesFolder = (await rb1UsrDir.readDir()).filter((entry) => entry instanceof DirPath && entry.name !== 'gen' && entry.name !== RB1_RAP_FOLDER) as DirPath[]

    if (allRB1PackagesFolder.length > 0) {
      for (const packagePath of allRB1PackagesFolder) {
        const dtaFilePath = packagePath.gotoFile('songs/songs.dta')

        if (!dtaFilePath.exists) continue

        const parsedData = await DTAParser.fromFile(dtaFilePath)
        await parsedData.applyDXUpdatesOnSongs(true)

        if (parsedData.songs.length === 0) continue
        parsedData.sort('ID')
        rb1PackagesCount++
        rb1PackagesSongsCount += parsedData.songs.length

        const devklic = EDATFile.genDevKLicHash(packagePath.name)
        const { manifest, packageSize, packageFiles } = await rpcs3GetPackageFilesManifest(packagePath)
        // const dtaHash = createHashFromBuffer(Buffer.from(parsedData.stringify()))
        const contentsHash = createHashFromBuffer(Buffer.from(manifest))
        const isOfficial = getOfficialPkgFromHash('extractedRPCS3', contentsHash)
        const songsCount = parsedData.songs.length
        const entriesIDs = parsedData.songs.map((song) => song.id).toSorted()
        const songnames = parsedData.songs.map((song) => song.songname).toSorted()
        const songIDs = parsedData.songs.map((song) => song.song_id).toSorted()

        const pack = new MyObject<RPCS3SongPackagesObject>({
          name: packagePath.name,
          path: packagePath.path,
          packageType: 'rb1',
          dtaFilePath: dtaFilePath.path,
          isOfficial,
          packageSize,
          songsCount,
          devklic,
          // dtaHash,
          contentsHash,
          entriesIDs,
          songnames,
          songIDs,
          packageFiles,
          // manifest,
        })

        packages.push(pack.toJSON())
      }
    }
  }

  const rb3SongsCount = 83
  const allPackagesCount = rb1PackagesCount + rb3PackagesCount
  const allSongsCount = rb1PackagesSongsCount + rb3PackagesSongsCount
  const allSongsPlusRB3 = allSongsCount + rb3SongsCount
  const starsCount = allSongsPlusRB3 * 5

  const obj = new MyObject<RPCS3SongPackagesData>({
    rb3SongsCount,
    rb1PackagesCount,
    rb1PackagesSongsCount,
    rb3PackagesCount,
    rb3PackagesSongsCount,
    allPackagesCount,
    allSongsCount,
    allSongsPlusRB3,
    starsCount,
    packages,
  })

  return obj.toJSON()
}
