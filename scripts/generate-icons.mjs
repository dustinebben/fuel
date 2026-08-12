// Generates placeholder PWA icons (solid bg + centered accent glyph) with zero
// dependencies, using Node's built-in zlib to hand-roll minimal PNGs. Swap these for
// real artwork before shipping — see README "Icons".
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join } from 'node:path'

const BG = [0x13, 0x13, 0x18] // #131318
const ACCENT = [0x8a, 0x7c, 0xd6] // approx oklch(0.70 0.18 285)

function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function generatePng(size, { maskable = false } = {}) {
  const width = size
  const height = size
  const raw = Buffer.alloc(height * (1 + width * 4))

  const center = size / 2
  // Maskable icons need content inside the safe zone (inner 80% circle); non-maskable
  // ones can use the full canvas.
  const glyphRadius = size * (maskable ? 0.3 : 0.34)

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0 // no filter
    for (let x = 0; x < width; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      const inGlyph = dist < glyphRadius
      const [r, g, b] = inGlyph ? ACCENT : BG
      const offset = rowStart + 1 + x * 4
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
      raw[offset + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const idat = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(import.meta.dirname, '..', 'public')
const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'icon-180.png', size: 180 }, // apple-touch-icon
]

for (const t of targets) {
  writeFileSync(join(outDir, t.name), generatePng(t.size, { maskable: t.maskable }))
  console.log(`wrote ${t.name}`)
}
