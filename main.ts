// news-image-20261123 — entry program (Node 22, standard library only).
//
// The entry image is the generated front page in entry.png beside this
// file. This program copies it to the harness output directory as
// entry.png, after checking the file is a whole, in-limits image:
// a PNG or JPEG by its first bytes, at most 1 MiB, at most 1024x1024.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

function fail(message) {
  throw new Error(`news-image-20261123: ${message}`);
}

// Read the width and height out of an image header. PNG stores them in
// the IHDR chunk (bytes 16-23, big-endian); JPEG stores them in the
// first Start Of Frame segment (length, precision, height, width).
function readDimensions(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), kind: 'PNG' };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) fail('corrupt JPEG marker stream');
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5), kind: 'JPEG' };
      }
      offset += 2 + length;
    }
    fail('no JPEG frame header found');
  }
  fail('entry.png is neither PNG nor JPEG by its first bytes');
}

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'entry.png');
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const outputPath = join(outputDir, 'entry.png');

const bytes = readFileSync(sourcePath);
if (bytes.length === 0) fail('entry.png is empty');
if (bytes.length > MAX_BYTES) fail(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
const image = readDimensions(bytes);
if (image.width === 0 || image.height === 0) fail('entry.png has a zero dimension');
if (image.width > MAX_SIDE || image.height > MAX_SIDE) {
  fail(`entry.png is ${image.width}x${image.height}, over the 1024x1024 limit`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, outputPath);

// Prove the copy landed byte for byte: re-read it and compare content.
const copied = readFileSync(outputPath);
if (!copied.equals(bytes)) fail('copied entry.png bytes do not match the source');
console.log(`wrote ${outputPath} (${image.kind} ${image.width}x${image.height}, ${bytes.length} bytes)`);
