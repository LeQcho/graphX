'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const IMAGE_NAME = /^[a-f0-9]{64}\.(png|jpg|webp)$/;
const VIDEO_NAME = /^[a-f0-9]{64}\.webm$/;
const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 250 * 1024 * 1024;
const MAX_VIDEO_MS = 30 * 60 * 1000;

function isWebM(header) {
  return header.length >= 4 && header.readUInt32BE(0) === 0x1a45dfa3 &&
    header.includes(Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]));
}

function imageType(buffer) {
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';
  if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';
  return null;
}

function imageHeaderValid(buffer, type) {
  return imageType(buffer) === type && (type !== 'png' ||
    (buffer.length >= 24 && buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0 &&
      buffer.readUInt32BE(16) <= 8192 && buffer.readUInt32BE(20) <= 8192 &&
      buffer.readUInt32BE(16) * buffer.readUInt32BE(20) <= 33554432));
}

async function storeAsset(stream, dir, extension) {
  const video = extension === 'webm', limit = video ? MAX_VIDEO : MAX_IMAGE;
  const temp = path.join(dir, '.upload-' + randomUUID());
  const hash = createHash('sha256');
  let size = 0;
  let header = Buffer.alloc(0);
  const file = await fs.promises.open(temp, 'wx', 0o600);
  try {
    try {
      for await (const chunk of stream.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > limit) throw Error(video ? 'Vidéo limitée à 250 Mio.' : 'Image limitée à 25 Mio.');
        if (header.length < 4096) header = Buffer.concat([header, chunk.subarray(0, 4096 - header.length)]);
        hash.update(chunk);
        await file.writeFile(chunk);
      }
    } finally {
      await file.close();
    }
    if (!(video ? isWebM(header) : imageHeaderValid(header, extension))) throw Error(video ? 'Fichier WebM invalide.' : 'Image invalide ou trop grande.');
    const name = hash.digest('hex') + '.' + extension;
    await fs.promises.rename(temp, path.join(dir, 'media', name));
    return name;
  } finally {
    await fs.promises.rm(temp, { force: true });
  }
}

module.exports = { IMAGE_NAME, VIDEO_NAME, MAX_IMAGE, MAX_VIDEO, MAX_VIDEO_MS, isWebM, imageType, imageHeaderValid, storeAsset };
