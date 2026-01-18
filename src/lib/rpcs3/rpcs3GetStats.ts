import { MyObject, pathLikeToDirPath, pathLikeToFilePath, type DirPathLikeTypes, type FilePathLikeTypes } from 'node-lib'
import { parse as parseYAMLBuffer } from 'yaml'

// #region Types

export interface RockBand3SpecificStats {
  /**
   * The path where the game is installed.
   */
  gamePath: string
  /**
   * The name of the game.
   */
  gameName: string
  /**
   * The catalog ID of the game.
   */
  gameID: string
  /**
   * The path to the game save data file.
   */
  saveDataPath: string
  /**
   * Tells if the game has a save data file.
   */
  hasSaveData: boolean
  /**
   * An array with folder paths where the game is reading downloadable contents.
   */
  dlcFolders: string[]
  /**
   * Tells if the game has any update (official or MiloHax's Deluxe) installed.
   */
  hasUpdate: boolean
  /**
   * Tells if the game has any MiloHax Deluxe patch installed.
   */
  hasDeluxe: boolean
  /**
   * The type of the update installed.
   */
  updateType: 'milohaxDX' | 'tu5' | 'unknown'
  /**
   * The Rock Band 3 Deluxe version installed.
   */
  deluxeVersion: string | null
  /**
   * Tells if the Teleport Glitch Patch is installed.
   */
  hasTeleportGlitchPatch: boolean
  /**
   * Tells if the High Memory Patch is installed.
   */
  hasHighMemoryPatch: boolean
}

export interface RPCS3StatsObject {
  /**
   * The name of the user in the PS3 console.
   */
  userName: string
  /**
   * Stats from Rock Band 3.
   */
  rb3?: RockBand3SpecificStats
}

// #region Function

/**
 * Returns an object with stats of each supported Rock Band game, if installed.
 * - - - -
 * @param {DirPathLikeTypes} devhdd0DirPath The path of the user's `dev_hdd0` folder.
 * @param {FilePathLikeTypes} rpcs3ExeFilePath The path to the RPCS3 executable.
 * @param {number | undefined} [userIndex] `OPTIONAL` The index of the user account.
 * @returns {Promise<RPCS3StatsObject>}
 */
export const rpcs3GetStats = async (devhdd0DirPath: DirPathLikeTypes, rpcs3ExeFilePath: FilePathLikeTypes, userIndex = 0): Promise<RPCS3StatsObject> => {
  const devhdd0Path = pathLikeToDirPath(devhdd0DirPath)
  const rpcs3ExePath = pathLikeToFilePath(rpcs3ExeFilePath)

  const map = new MyObject<RPCS3StatsObject>()
  const games = parseYAMLBuffer(await rpcs3ExePath.gotoFile('config/games.yml').read('utf-8')) as Record<'BLUS30463' | 'BLUS30147', string>

  const localUsernameFilePath = devhdd0Path.gotoFile(`home/0000000${(userIndex + 1).toString()}/localusername`)
  map.set('userName', await localUsernameFilePath.read('utf8'))

  const ROCKBAND3_ID = 'BLUS30463'
  if (ROCKBAND3_ID in games) {
    // Rock Band 3 (USA)
    const rb3 = new MyObject<RockBand3SpecificStats>()
    const rb3GamePath = pathLikeToDirPath(games.BLUS30463)

    const saveDataPath = devhdd0Path.gotoFile('home/00000001/savedata/BLUS30463-AUTOSAVE/SAVE.DAT')

    const dlcFolders: string[] = []
    const rb3DLCFolder = devhdd0Path.gotoFile('game/BLUS30463/USRDIR')
    dlcFolders.push(rb3DLCFolder.path)
    const rb2DLCFolder = devhdd0Path.gotoFile('game/BLUS30050/USRDIR')
    if (rb2DLCFolder.exists) dlcFolders.push(rb2DLCFolder.path)

    const gen = devhdd0Path.gotoDir('game/BLUS30463/USRDIR/gen')
    const hdr = gen.gotoFile('patch_ps3.hdr')
    const ark = gen.gotoFile('patch_ps3_0.ark')

    rb3.setMany({
      gamePath: rb3GamePath.path,
      gameName: 'Rock Band 3',
      gameID: ROCKBAND3_ID,
      saveDataPath: saveDataPath.path,
      hasSaveData: saveDataPath.exists,
      dlcFolders: dlcFolders,
      hasUpdate: gen.exists && hdr.exists && ark.exists,
      hasDeluxe: false,
      updateType: 'unknown',
      deluxeVersion: null,
      hasTeleportGlitchPatch: false,
      hasHighMemoryPatch: false,
    })

    if (hdr.exists && ark.exists) {
      const arkStats = await ark.stat()
      const hdrStats = await hdr.stat()

      // Only RB3DX update can be bigger than 500mb
      if (arkStats.size > 0x1f400000) {
        rb3.setMany({
          hasDeluxe: true,
          updateType: 'milohaxDX',
          deluxeVersion: 'unknown',
        })
      }

      // CHECK: Title Update 5?
      else if (hdrStats.size === 0x8d69) rb3.set('updateType', 'tu5')
    }

    if (rb3GamePath.gotoFile('PS3_GAME/USRDIR/gen/main_ps3_vanilla.hdr').exists && rb3GamePath.gotoFile('PS3_GAME/USRDIR/gen/main_ps3_10.ark').exists) rb3.set('hasTeleportGlitchPatch', true)
    if (gen.gotoFile('../dx_high_memory.dta').exists) rb3.set('hasHighMemoryPatch', true)

    map.set('rb3', rb3.toJSON())
  }

  return map.toJSON()
}
