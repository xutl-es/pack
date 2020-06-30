import { promises as fs } from 'fs';

const VERSION = 1;
const INT64 = 8;
const INT32 = 8;
const HEADER_SIGNATURE = Buffer.from('%pkg');
const HEADER_SIGN = 0;
const HEADER_VERS = HEADER_SIGN + HEADER_SIGNATURE.length;
const HEADER_START = HEADER_VERS + INT32;
const HEADER_LENGTH = HEADER_START + INT64;
const HEADERSIZE = HEADER_LENGTH + INT64;

export async function writeHeader(fd: fs.FileHandle, start: number, length: number) {
	const hb = Buffer.alloc(HEADERSIZE, 0);
	HEADER_SIGNATURE.copy(hb, HEADER_SIGN, 0, HEADER_SIGNATURE.length);
	hb.writeUInt32BE(VERSION, HEADER_VERS);
	hb.writeBigInt64BE(BigInt(start), HEADER_START);
	hb.writeBigInt64BE(BigInt(length), HEADER_LENGTH);
	const { bytesWritten } = await fd.write(hb, 0, hb.length, 0);
	if (bytesWritten !== hb.length) throw new Error('failed to write header');
	return bytesWritten;
}
export async function readHeader(fd: fs.FileHandle): Promise<{ start: number; length: number }> {
	const hb = Buffer.alloc(HEADERSIZE, 0);
	const { bytesRead } = await fd.read(hb, 0, hb.length, 0);
	if (bytesRead !== hb.length) throw new Error('failed to read header');
	if (VERSION !== hb.readUInt32BE(HEADER_VERS)) throw new Error('invalid header version');
	const start = Number(hb.readBigInt64BE(HEADER_START));
	const length = Number(hb.readBigInt64BE(HEADER_LENGTH));
	return { start, length };
}

export interface PkgIndex {
	name: string;
	entries: { [name: string]: { start: number; length: number } };
}
