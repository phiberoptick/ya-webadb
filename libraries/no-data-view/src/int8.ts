export function getInt8(buffer: Uint8Array, offset: number): number {
    return (buffer[offset]! << 24) >> 24;
}
