export const dtbXOR = (key: number): number => {
  let val = (((key - Math.floor(key / 0x1f31d) * 0x1f31d) * 0x41a7) >>> 0) - ((Math.floor(key / 0x1f31d) * 0xb14) >>> 0)
  if (val <= 0) val = (val - 0x80000000 - 1) >>> 0
  return val
}

export const newDTBCrypt = (input: Buffer): Buffer => {
  let key = input.readUInt32LE(0)
  const outSize = input.length - 4
  const output = Buffer.alloc(outSize)
  for (let i = 0; i < outSize; i++) {
    key = dtbXOR(key)
    output[i] = (input[i + 4] & 0xff) ^ (key & 0xff)
  }
  return output
}
