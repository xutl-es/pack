#!/usr/bin/env node

import { promises as fs, createWriteStream, stat, createReadStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Package } from './index';
import { list } from './list';
import path from 'path';

if (process.argv.length < 4) usage(1);
if (!['pack', 'spill', 'list', 'show'].includes(process.argv[2])) usage(1);
main(process.argv[2] as 'pack' | 'spill' | 'list' | 'show', process.argv[3], process.argv.slice(4)).catch((e) => {
	console.error(e);
	usage(2);
});

async function main(mode: 'pack' | 'spill' | 'list' | 'show', pkgfile: string, files: string[]) {
	const pkg = await Package.open(pkgfile);
	try {
		switch (mode) {
			case 'spill': {
				const directory = path.resolve(files.shift() || '.');
				for (const name of pkg.entries) {
					const filename = path.join(directory, name);
					await fs.mkdir(path.dirname(filename), { recursive: true });
					await promisify(pipeline)(pkg.get(name), createWriteStream(filename));
				}
				break;
			}
			case 'pack': {
				for (let item of files) {
					item = path.resolve(item);
					const info = await fs.stat(item);
					if (info.isFile()) {
						const name = path.basename(item);
						console.error(`Packaging: ${name}`);
						const stream = createReadStream(item);
						await pkg.add(name, stream);
					} else if (info.isDirectory()) {
						for await (let file of list(item)) {
							file = path.resolve(item, file);
							const name = path.relative(path.dirname(item), file);
							console.error(`Packing: ${name}`);
							const stream = createReadStream(file);
							await pkg.add(name, stream);
						}
					}
				}
				break;
			}
			case 'show': {
				for (const name of files) {
					const item = await pkg.content(name);
					process.stdout.write(item);
				}
				break;
			}
			default: {
				for (const name of pkg.entries) {
					console.log(name);
				}
			}
		}
	} finally {
		await pkg.close();
	}
}

function usage(code: number = 0) {
	console.error('xutlpack list <file.pkg>');
	console.error('xutlpack show <file.pkg> <entries>');
	console.error('xutlpack pack <file.pkg> [<files>]');
	console.error('xutlpack spill <file.pkg> [<files>]');
	process.exit(code);
}
