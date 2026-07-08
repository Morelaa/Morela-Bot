'use strict';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';
import { makeSticker } from '../../Library/sticker.js';
import config from '../../config.js';
const handler = async (m, { conn }) => {
    const media = findMediaMessage(m);
    if (!media) {
        await m.reply('Kirim atau reply gambar/video dengan caption .sticker ya.');
        return;
    }
    await conn.setTyping(m.chat);
    const buffer = await downloadMessageMedia(m, conn);
    if (!buffer?.length) {
        await m.reply('Gagal download media, coba lagi.');
        return;
    }
    const isVideo = media.type === 'videoMessage';
    if (isVideo && (media.message.seconds || 0) > 15) {
        await m.reply('Video kepanjangan, maksimal 15 detik ya.');
        return;
    }
    const webp = await makeSticker(buffer, { isVideo, packName: config.botName, authorName: m.pushName || config.copyrightName });
    await conn.sendMessage(m.chat, { sticker: webp }, { quoted: m.raw });
};
handler.help = ['sticker'];
handler.tags = ['tools'];
handler.command = /^(sticker|s|stiker)$/i;
export default handler;
