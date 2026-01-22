/**
 * CRC16 Modbus calculation
 * Polynomial: 0xA001 (reverse of 0x8005)
 */

const CRC16_TABLE = new Uint16Array(256);

// Initialize CRC16 lookup table (Modbus polynomial)
function initCRC16Table(): void {
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc = crc >> 1;
      }
    }
    CRC16_TABLE[i] = crc;
  }
}

// Initialize table on module load
initCRC16Table();

/**
 * Calculate CRC16 for Modbus RTU
 * @param buffer - Data buffer to calculate CRC for
 * @returns CRC16 value (16-bit)
 */
export function calculateCRC16(buffer: Buffer | Uint8Array): number {
  let crc = 0xffff;

  for (let i = 0; i < buffer.length; i++) {
    const index = (crc ^ buffer[i]) & 0xff;
    crc = ((crc >> 8) ^ CRC16_TABLE[index]) & 0xffff;
  }

  return crc;
}

/**
 * Verify CRC16 of a Modbus response
 * @param buffer - Complete response buffer including CRC bytes
 * @returns true if CRC is valid
 */
export function verifyCRC16(buffer: Buffer): boolean {
  if (buffer.length < 3) return false;

  const data = buffer.slice(0, -2);
  const receivedCRC = buffer.readUInt16LE(buffer.length - 2);
  const calculatedCRC = calculateCRC16(data);

  return receivedCRC === calculatedCRC;
}

/**
 * Append CRC16 to a Modbus request
 * @param buffer - Request buffer without CRC
 * @returns New buffer with CRC appended
 */
export function appendCRC16(buffer: Buffer): Buffer {
  const crc = calculateCRC16(buffer);
  const result = Buffer.allocUnsafe(buffer.length + 2);
  buffer.copy(result);
  result.writeUInt16LE(crc, buffer.length);
  return result;
}
