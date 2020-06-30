import { promises as fsp } from 'fs';
import path from 'path';

export function list(directory: string): AsyncIterable<string> {
	return { [Symbol.asyncIterator]: () => ls(directory) };
}
async function* ls(directory: string): AsyncIterator<string> {
	const info = await fsp.stat(directory);
	if (info.isFile()) yield directory;
	if (!info.isDirectory()) return;

	const dir = await fsp.opendir(directory);
	for await (const info of dir) {
		if (info.isFile()) yield info.name;
		if (info.isDirectory()) {
			const iter = list(path.join(directory, info.name));
			for await (const sub of iter) yield path.join(info.name, sub);
		}
	}
}
if (module.id === '.') {
	(async (file: string) => {
		console.log(`Listing: ${file}`);
		for await (const found of list(file)) {
			console.log(`item: ${found}`);
		}
	})(process.argv[2] || '.').catch((e) => console.error(e));
}
