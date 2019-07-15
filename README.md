# HuffmanExtractor

ok, this is pretty esoteric && won't make any sense if u don't know how JPEG compression works (just FYI). this is a vanilla JS class (works in a browser + in nodeJS) that extracts the huffman tables from a JPG file. [what the hell would i possibly use this for?](https://github.com/nbriz/databending101)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

## install

u could just download the `HuffmanExtractor.js` file and include client-side as a script tag, or alternatively u could install with npm, so client-side (ie. in a browser) that look like:
```
$ npm install git+https://github.com/nbriz/HuffmanExtractor.git
```
```HTML
<script src="node_modules/huffmanextractor/HuffmanExtractor.js"></script>
```

or server-side (ie. in nodeJS) that looks like this:
```
$ npm install git+https://github.com/nbriz/HuffmanExtractor.git
```
```js
const fs = require('fs') // u'll prolly need fs to get imageData
const HuffmanExtractor = require('huffmanextractor')
```

## browser "client-side" example

say for the sake of argument u're using my handy-dandy [FileUploader](https://github.com/nbriz/FileUploader) class to load up a JPG file on the click of a `<button id="my-btn">click</button>`
```js
new FileUploader({
  types: ['image/jpeg'],
  click: '#my-btn',
  ready: (file) => {
    // constructor takes JPEG data passed as either a
    // Uint8Array or a base64 encoded string
    let huff = new HuffmanExtractor(file.data)
    // how u've got access to the huffman tables && other info like:
    huff.data       // JPEG data stored in a Uint8Array (decimal) bytes
    huff.index      // index for the Huffman Table marker in data
    huff.length     // length of huffman data (starting after the marker)
    huff.AC_tables  // array of objects containing AC table info
    huff.DC_tables  // array of objects containing DC table info
  },
  error: (err) => console.error(err)
})
```

## node "server-side" example

same thing, except u'd need to use something like `fs` to load up the JPG data instead:

```js
fs.readFile(`path/to/file.jpg`, (err, data) => {
  if (err) return console.log(err.Error)
  let huff = new HuffmanExtractor(data)
  console.log(huff.DC_tables)
  console.log(huff.AC_tables)
})
```

**&& here's an example of what the DC_tables Array looks like**
```js
[
  { type: 'DC',
    id: 0,
    index: 1631,
    length: 29,
    codeLengths: [ 0, 0, 6, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    codeLengthSum: 12,
    values: [ 0, 0, 1, 2, 6, 7, 8, 3, 5, 9, 4, 10 ],
    table: [ [Array], [Array] ],
  },
  { type: 'DC',
    id: 1,
    index: 1660,
    length: 55,
    codeLengths: [ 0, 1, 5, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    codeLengthSum: 9,
    values: [ 0, 0, 1, 2, 4, 5, 6, 3, 7 ],
    table: [ [Array], [Array] ]
  }
]
```
