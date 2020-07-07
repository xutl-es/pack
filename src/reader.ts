import { promises as fs } from 'fs';
import { gunzip } from 'zlib';
import { PkgIndex } from './info';
import { readIndex } from './package';

export class Reader implements AsyncIterable<[string, Buffer]> {
	readonly #filename: string;
	readonly #index: Promise<PkgIndex>;
	constructor(filename: string) {
		this.#filename = filename;
		this.#index = getIndex(filename);
	}
	get name() {
		return this.#index.then((index) => index.name);
	}
	get entries() {
		return this.#index.then((index) => Object.keys(index.entries));
	}
	async buffer(name: string): Promise<Buffer> {
		name = new URL(name, `pkg://${(await this.#index).name}/`).toString();
		const index = await this.#index;
		if (!(name in index.entries)) throw new Error(`not found: ${name}`);
		const { start, length } = index.entries[name];
		const fd = await fs.open(this.#filename, 'r');
		const result = Buffer.alloc(length);
		const { bytesRead } = await fd.read(result, 0, length, start);
		if (bytesRead !== length) throw new Error(`only read ${bytesRead} bytes rather than ${length}`);
		return unzip(result);
	}
	async string(name: string) {
		const buffer = await this.buffer(name);
		return buffer.toString('utf-8');
	}
	async json(name: string) {
		const string = await this.string(name);
		return JSON.parse(string);
	}
	[Symbol.asyncIterator]() {
		let items: string[];
		return {
			next: async (): Promise<IteratorResult<[string, Buffer]>> => {
				items = items || (await this.entries);
				const item = items.shift();
				if (!item) return { done: true, value: null };
				const buffer = await this.buffer(item);
				return { done: false, value: [item, buffer] };
			},
		};
	}
}

async function getIndex(filename: string) {
	const fd = await fs.open(filename, 'r');
	const { index } = await readIndex(fd);
	await fd.close();
	return index;
}
async function unzip(buffer: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		gunzip(buffer, (error: Error | null, result: Buffer) => {
			if (error) return reject(error);
			resolve(result);
		});
	});
}
