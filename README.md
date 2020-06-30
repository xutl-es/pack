# @xutl/pack

One [eXtremely Useful Tool Library](https://xutl.es) to package files.

The advantage of this is that the generarted archive contains individually compressed files, and that because of this
it is possible to randomly access files. THis makes it great for packages, because the package never needs to be extracted
to disk.

## Install

```bash
npm install --save-dev @xutl/pack
```

## Usage

```bash
xutlpack pack file.pkg files/ # packages directory up
xutlpack spill file.pkg destination/ # unpackages a package
xutlpack list file.pkg # lists the packages contents
```

## Code Usage

```typescript
import ( Package ) from '@xutl/pack';

const pkg = await Package.open(filename);

await pkg.add('my/file.json', JSON.stringify({}));
await pkg.add('my/file.gif', createReadStream('my/file.gif'));
await pkg.add('data.bin', Buffer.from('raw data'));

const stream = pkg.get('my/file.gif');
const buffer = pkg.content('my/file.gif');
const string = pkg.string('my/file.json');
const object = pkg.json('my/file.json');

await pkg.close();
```

## License

Copyright 2019,2020 xutl.es

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
