'use strict';
import { createMeme } from '../../Library/meme.js';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';
const handler = async (m, { conn, text }) => {
    const media = findMediaMessage(m);
    if (!media || media.type !== 'imageMessage') {
        await m.reply('Reply gambar dengan caption .meme teksatas|teksbawah ya.\nContoh: .meme KETIKA BOT|ERROR LAGI');
        return;
    }
    if (!text) {
        await m.reply('Kasih teksnya. Format: .meme teksatas|teksbawah');
        return;
    }
    const [top = '', bottom = ''] = text.split('|').map((s) => s.trim());
    const buffer = await downloadMessageMedia(m, conn);
    if (!buffer?.length) {
        await m.reply('Gagal download gambar.');
        return;
    }
    const result = await createMeme(buffer, { topText: top, bottomText: bottom });
    await conn.sendMessage(m.chat, { image: result }, { quoted: m.raw });
};
handler.help = ['meme teksatas|teksbawah'];
handler.tags = ['maker'];
handler.command = /^meme$/i;
export default handler;
