'use strict';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough, Readable } from 'stream';
import webpmux from 'node-webpmux';
export async function imageToWebp(buffer) {
    return sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toBuffer();
}
export function videoToWebp(buffer, { fps = 10, duration = 6 } = {}) {
    return new Promise((resolve, reject) => {
        const input = new Readable({ read() { } });
        input.push(buffer);
        input.push(null);
        const output = new PassThrough();
        const chunks = [];
        output.on('data', (c) => chunks.push(c));
        output.on('end', () => resolve(Buffer.concat(chunks)));
        output.on('error', reject);
        ffmpeg(input)
            .inputOptions(['-t', String(duration)])
            .outputOptions([
            '-vcodec', 'libwebp',
            '-vf', `fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=0x00000000`,
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-f', 'webp',
        ])
            .on('error', (err) => reject(new Error(`ffmpeg error: ${err.message}`)))
            .pipe(output, { end: true });
    });
}
function slugify(str) {
    return String(str || 'bot')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        || 'bot';
}

export async function addStickerMetadata(webpBuffer, { packName = 'Sticker', authorName = 'Bot' } = {}) {
    const img = new webpmux.Image();
    await img.load(webpBuffer);
    const json = {
        'sticker-pack-id': `com.${slugify(packName)}.${Date.now()}`,
        'sticker-pack-name': packName,
        'sticker-pack-publisher': authorName,
        emojis: ['🤖'],
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;
    return img.save(null);
}
export async function makeSticker(buffer, { isVideo = false, packName, authorName } = {}) {
    const raw = isVideo ? await videoToWebp(buffer) : await imageToWebp(buffer);
    return addStickerMetadata(raw, { packName, authorName });
}
export default { imageToWebp, videoToWebp, addStickerMetadata, makeSticker };
