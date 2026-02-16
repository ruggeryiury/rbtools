import { type DirPathLikeTypes, pathLikeToDirPath } from 'node-lib'

/**
 * Checks if the provided `dev_hdd0` folder path is valid.
 * - - - -
 * @param {DirPathLikeTypes} devhdd0Path The `dev_hdd0` folder path you want to check.
 * @returns {boolean}
 */
export const isDevhdd0PathValid = (devhdd0Path: DirPathLikeTypes): boolean => {
  let proof = true
  const devhdd0 = pathLikeToDirPath(devhdd0Path)
  if (!devhdd0.exists) throw new Error(`Provided dev_hdd0 folder path "${devhdd0.path}" does not exist`)
  if (!devhdd0.gotoDir('game').exists) proof = false
  if (!devhdd0.gotoDir('home').exists) proof = false

  return proof
}
