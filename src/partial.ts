import { promises as fs } from 'fs';

export class PartialStreamIterator implements AsyncIterableIterator<Buffer> {
	constructor(private readonly fd: fs.FileHandle, private position: number, private bytesWanted: number) {}
	private buffer = Buffer.alloc(1024, 0);
	async next(): Promise<IteratorResult<Buffer>> {
		if (!this.bytesWanted) return { done: true, value: null };
		const { bytesRead } = await this.fd.read(
			this.buffer,
			0,
			Math.min(this.buffer.length, this.bytesWanted),
			this.position,
		);
		if (!bytesRead) return { done: true, value: null };
		this.position += bytesRead;
		this.bytesWanted -= bytesRead;
		const value = Buffer.alloc(bytesRead);
		this.buffer.copy(value, 0, 0, bytesRead);
		return { done: false, value };
	}
	[Symbol.asyncIterator]() {
		return this;
	}
}
