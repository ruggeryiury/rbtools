import { BinaryReader, BinaryWriter } from 'node-lib'

/**
 * Swaps the bytes of a texture file contents buffer and returns with the bytes swapped.
 * - - - -
 * @param {Buffer} textureBuffer The buffer of the texture file you want to swap.
 * @returns {Promise<Buffer>}
 */
export const swapTextureBytes = async (textureBuffer: Buffer): Promise<Buffer> => {
  const fin = BinaryReader.fromBuffer(textureBuffer)
  const size = fin.length
  const fout = new BinaryWriter()

  // That's the size of the HMX header for Xbox 360 and PS3
  fout.write(await fin.read(32))

  // Reverse the bytes until the end of the file
  for (let i = fin.getOffset; i < size; i += 2) {
    const byte1 = await fin.read(1)
    const byte2 = await fin.read(1)
    fout.write(byte2)
    fout.write(byte1)
  }

  return fout.toBuffer()
}
