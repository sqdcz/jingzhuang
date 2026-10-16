// PNG(256x256) → ICO 包装器（现代 ICO 支持 PNG 内嵌）
// 用法: node build/make-ico.js <input.png> <output.ico>
const fs = require('fs')

const pngPath = process.argv[2]
const icoPath = process.argv[3]
if (!pngPath || !icoPath) {
  console.error('用法: node make-ico.js <input.png> <output.ico>')
  process.exit(1)
}

const png = fs.readFileSync(pngPath)

// ICONDIR: reserved(2)=0, type(2)=1, count(2)=1
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)

// ICONDIRENTRY: width(1)=0(即256), height(1)=0(即256), colors(1)=0, reserved(1)=0,
// planes(2)=1, bpp(2)=32, size(4), offset(4)=22
const entry = Buffer.alloc(16)
entry[0] = 0
entry[1] = 0
entry[2] = 0
entry[3] = 0
entry.writeUInt16LE(1, 4)
entry.writeUInt16LE(32, 6)
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12)

fs.writeFileSync(icoPath, Buffer.concat([header, entry, png]))
console.log(`OK: ${icoPath} (${png.length + 22} bytes)`)
