import { promises as fs } from 'fs';
import { Readable } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import path from 'path';

import { PartialStreamIterator } from './partial';
import { readHeader, PkgIndex, writeHeader } from './info';

export class Package {
	#handle: fs.FileHandle;
	#index: PkgIndex;
	#position: number;
	#lastindex: number;
	constructor(handle: fs.FileHandle, index: PkgIndex, position: number) {
		this.#handle = handle;
		this.#index = index;
		this.#position = this.#lastindex = position;
	}
	get name() {
		return this.#index.name;
	}
	get entries() {
		return Object.keys(this.#index.entries)
			.map((url) => new URL(url).pathname.slice(1))
			.filter((x) => !!x);
	}
	public async add(name: string, data: Readable | Buffer | string): Promise<void> {
		if (!this.#handle) throw new Error('package closed');
		if ('string' === typeof data) data = Buffer.from(data);
		if (data instanceof Buffer) data = Readable.from([data]);
		name = new URL(name, `pkg://${this.#index.name}`).toString();
		const start = this.#position;
		let length = 0;

		const stream = data.pipe(createGzip());
		for await (const data of stream) {
			const { bytesWritten } = await this.#handle.write(data, 0, data.length, this.#position);
			this.#position += bytesWritten;
			length += bytesWritten;
			if (bytesWritten !== data.length) throw new Error(`failed to write ${name} (${bytesWritten} !== ${data.length})`);
		}
		this.#index.entries[name] = { start, length };
	}
	get(name: string): Readable {
		if (!this.#handle) throw new Error('package closed');
		name = new URL(name, `pkg://${this.#index.name}`).toString();
		const { start, length } = this.#index.entries[name];
		return Readable.from(new PartialStreamIterator(this.#handle, start, length)).pipe(createGunzip());
	}
	async content(name: string): Promise<Buffer> {
		const readable = this.get(name);
		const buffers: Buffer[] = [];
		let length = 0;
		for await (const buffer of readable) {
			buffers.push(buffer);
			length += buffer.length;
		}
		return Buffer.concat(buffers, length);
	}
	async string(name: string): Promise<string> {
		return (await this.content(name)).toString('utf-8');
	}
	async json(name: string): Promise<any> {
		return JSON.parse((await this.content(name)).toString('utf-8'));
	}
	async close() {
		if (!this.#handle) return;
		if (this.#lastindex !== this.#position) {
			const start = this.#position;
			const index = Buffer.from(JSON.stringify(this.#index));
			await this.add('', Readable.from([index]));
			const length = this.#position - start;
			await writeHeader(this.#handle, start, length);
		}
		await this.#handle.close();
		this.#handle = (null as any) as fs.FileHandle;
	}
	static async open(filename: string, readonly: boolean = false) {
		if (await fileExists(filename)) {
			const fd: fs.FileHandle = await fs.open(filename, readonly ? 'r' : 'r+');
			const { index, start } = await readIndex(fd);
			return new Package(fd, index, start);
		} else if (!readonly) {
			return await Package.create(filename);
		}
		throw new Error(`could not open ${filename}`);
	}
	static async create(filename: string, name: string = path.basename(filename, path.extname(filename))) {
		const fd = await fs.open(filename, 'w+');
		const index = { name, entries: {} };
		const start = await writeHeader(fd, 0, 0);
		return new Package(fd, index, start);
	}
}

export async function readIndex(fd: fs.FileHandle) {
	const { start, length } = await readHeader(fd);
	const iter = new PartialStreamIterator(fd, start, length);

	const buffers = [];
	let buflen = 0;
	for await (const buf of Readable.from(iter).pipe(createGunzip())) {
		buffers.push(buf);
		buflen += buf.length;
	}
	const index = JSON.parse(Buffer.concat(buffers, buflen).toString('utf-8')) as PkgIndex;
	return { index, start };
}
async function fileExists(filename: string) {
	try {
		return (await fs.stat(filename)).isFile();
	} catch (e) {
		return false;
	}
}

const Default = Object.freeze({ Package });
export default Default;
