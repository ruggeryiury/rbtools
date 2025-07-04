export interface PaddedBufferObject {
  /**
   * The unprocessed buffer.
   */
  oldBuffer: Buffer
  /**
   * The buffer with the added padding.
   */
  newBuffer: Buffer
  /**
   * The amount of padding inserted to the buffer.
   */
  padding: number
}

/**
 * Calculates the padding necessary to get a byte length to a multiple of 16.
 * - - - -
 * @param {Buffer | number} bufferOrLength A buffer object or the length of a buffer object to calculate the padding
 * @returns {number}
 */
export const paddingToMultipleOf16 = (bufferOrLength: Buffer | number): number => {
  const remainder = (Buffer.isBuffer(bufferOrLength) ? bufferOrLength.length : bufferOrLength) % 16
  return (16 - remainder) % 16
}

/**
 * Adds padding to the given buffer to make its length a multiple of 16 bytes.
 * - - - -
 * @param {Buffer} buffer The original buffer to pad.
 * @returns {PaddedBufferObject}
 */
export const addPaddingToBuffer = (buffer: Buffer): PaddedBufferObject => {
  const padding = paddingToMultipleOf16(buffer)
  const newBuffer = Buffer.alloc(buffer.length + padding)
  buffer.copy(newBuffer, 0, 0, buffer.length)
  return {
    oldBuffer: buffer,
    newBuffer: newBuffer,
    padding,
  }
}

/**
 * Removes padding bytes from the end of a buffer and returns a new buffer without the padding bytes.
 * - - - -
 * @param {Buffer} buffer The original buffer with padding.
 * @param {number} paddingLength The number of padding bytes to remove.
 * @returns {Buffer}
 */
export const removePaddingToBuffer = (buffer: Buffer, paddingLength: number): Buffer => {
  if (paddingLength < 0 || paddingLength > buffer.length) {
    throw new RangeError('Invalid padding length.')
  }

  return buffer.subarray(0, buffer.length - paddingLength)
}
