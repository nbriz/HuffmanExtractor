/*
    HuffmanExtractor
    -----------
    by Nick Briz <nickbriz@gmail.com>
    GNU GPLv3 - https://www.gnu.org/licenses/gpl-3.0.txt
    2019

    -----------
       info
    -----------

    this class extracts huffman table information from a JPEG data passed to
    the constructor as a Uint8Array or a base64 encoded string. It organizes
    all the huffman info into objects and collects them in two separate arrays
    (one for DC tables and another for AC tables), example Array looks like:

    this.DC_tables = [
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

    -----------
       usage
    -----------

    // NODE.JS

    const fs = require('fs')
    const HuffmanExtractor = require('huffmanExtractor')

    fs.readFile(`path/to/file.jpg`, (err, data) => {
      if (err) return console.log(err.Error)
      let huffman = new HuffmanExtractor(data)
      console.log(huffman.DC_tables)
      console.log(huffman.AC_tables)
    })

*/
class HuffmanExtractor {
  constructor (data) {
    this.data = null // JPEG data stored in a Uint8Array (decimal) bytes
    this.index = null // index for the Huffman Table marker
    this.length = null // length of huffman data (starting after marker)
    this.AC_tables = [] // collection of objects containing AC table info
    this.DC_tables = [] // collection of objects containing DC table info

    if (typeof data === 'string') {
      let jpg = `data:image/jpeg;base64,`
      if (data.indexOf(jpg) !== 0) {
        this.err('string passed to constructor must be a base64 encoded JPEG')
      } else {
        data = data.substr(jpg.length)
        this.data = this.base64ToArrayBuffer(data)
        this.init()
      }
    } else if (data instanceof Uint8Array) {
      this.data = data
      this.init()
    } else {
      this.err('constructor expecting either a Uint8Array or base64 string')
    }
  }

  err (message) {
    console.error(`HuffmanExtractor: ${message}`)
  }

  init () {
    let d = this.data
    // confirm this is a JPEG
    if (!(d[0].toString(16) === 'ff' && d[1].toString(16) === 'd8')) {
      return this.err('data passed to constructor is not a JPEG')
    }
    // loop through JPEG Data to find huffman table marker
    for (let i = 0; i < d.length; i++) {
      if (d[i].toString(16) === 'ff' && d[i + 1].toString(16) === 'c4') {
        this.index = i
        // create huffman table objects && push to DC && AC table arrays
        this.parseHuffmanData(d, i)
        break
      }
    }
  }

  dataToHexArray () {
    let hex = []
    for (let i = 0; i < this.data.length; i++) {
      let byte = this.data[i].toString(16)
      if (byte.length === 1) byte = '0' + byte
      byte = byte.toUpperCase()
      hex.push(byte)
    }
    return hex
  }

  base64ToArrayBuffer (base64) {
    // this base64ToArrayBuffer function by Goran.it && Luke Madhanga
    // via: https://stackoverflow.com/a/21797381/1104148
    let binaryString = window.atob(base64)
    let len = binaryString.length
    let bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  numberFrom2Bytes (b1, b2) {
    b1 = b1.toString(16)
    b2 = b2.toString(16)
    if (b1.length === 1) b1 = '0' + b1
    if (b2.length === 1) b2 = '0' + b2
    let hex = b1 + b2
    return parseInt(hex, 16)
  }

  tableSpecFromByte (b) {
    let byte = b.toString(16)
    let spec = { type: null, id: null }
    if (byte.length === 1) {
      spec.type = 'DC'
      spec.id = parseInt(byte, 16)
    } else {
      spec.type = 'AC'
      spec.id = parseInt(byte[1], 16)
    }
    if (spec.id > 3) {
      return this.err('file corrupted? huffman table does not have a valid id')
    } else return spec
  }

  parseHuffmanData (data, start) {
    let nextTableId = 0
    this.length = this.numberFrom2Bytes(data[start + 2], data[start + 3])
    for (let i = 0; i < this.length - 2; i++) {
      let byte = data[start + 4 + i]
      if (i === nextTableId) {
        // get table type (DC / AC) and table ID, from identifier byte
        let ht = this.tableSpecFromByte(byte)
        ht.index = start + 4 + nextTableId
        // code lengths indicate how many end points are in each level
        // of the huffman tree (starting from the top), always 16 bytes
        ht.codeLengths = new Array(16)
        ht.codeLengthSum = 0
        for (let j = 0; j < 16; j++) {
          ht.codeLengths[j] = data[(start + 4 + i) + (j + 1)]
          ht.codeLengthSum += ht.codeLengths[j]
        }
        // code length sum is used to know how many of the subsequent
        // bytes contain the code values (ie symbols) we need to collect
        ht.values = new Array(ht.codeLengthSum)
        for (let k = 0; k < ht.codeLengthSum; k++) {
          ht.values[k] = data[(start + 4 + i) + (k + 16)]
        }
        // why not use the info above to build the huffman tables
        ht.table = this.buildHuffmanTable(ht.codeLengths, ht.values)
        // how many bytes is this particular table
        ht.length = 1 + 16 + ht.codeLengthSum
        // collect table object in the appropriate array based on it's type
        if (ht.type === 'DC') this.DC_tables.push(ht)
        else this.AC_tables.push(ht)
        nextTableId = i + 1 + 16 + ht.codeLengthSum
      }
    }
  }

  // this buildHuffmanTable function by Eugene Ware
  // via: https://github.com/eugeneware/jpeg-js/blob/master/lib/decoder.js
  // ...didn't initiallly plan for this, but figured if i've gone this
  // far parsing out the huffman tables, why not go all the way :)
  buildHuffmanTable (codeLengths, values) {
    let k = 0
    let code = []
    let i
    let j
    let length = 16
    while (length > 0 && !codeLengths[length - 1]) { length-- }
    code.push({ children: [], index: 0 })
    let p = code[0]
    let q
    for (i = 0; i < length; i++) {
      for (j = 0; j < codeLengths[i]; j++) {
        p = code.pop()
        p.children[p.index] = values[k]
        while (p.index > 0) {
          p = code.pop()
        }
        p.index++
        code.push(p)
        while (code.length <= i) {
          code.push(q = { children: [], index: 0 })
          p.children[p.index] = q.children
          p = q
        }
        k++
      }
      if (i + 1 < length) {
        // p here points to last code
        code.push(q = { children: [], index: 0 })
        p.children[p.index] = q.children
        p = q
      }
    }
    return code[0].children
  }
}

if (typeof module !== 'undefined') module.exports = HuffmanExtractor
