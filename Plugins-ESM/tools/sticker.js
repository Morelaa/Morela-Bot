'use strict';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';
import { makeSticker } from '../../Library/sticker.js';
import config from '../../config.js';
const handler = async (m, { conn }) => {
    const media = findMediaMessage(m);
    if (!media) {
        await m.reply(`╭┈┈⬡「 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n┃ ✧ ᴋɪʀɪᴍ ᴀᴛᴀᴜ ʀᴇᴘʟʏ ɢᴀᴍʙᴀʀ/ᴠɪᴅᴇᴏ ᴅᴇɴɢᴀɴ ᴄᴀᴘᴛɪᴏɴ .ꜱᴛɪᴄᴋᴇʀ ʏᴀ.\n╰┈┈┈┈┈┈┈┈⬡`);
        return;
    }
    await conn.setTyping(m.chat);
    const buffer = await downloadMessageMedia(m, conn);
    if (!buffer?.length) {
        await m.reply(`╭┈┈⬡「 *ᴇʀʀᴏʀ* 」\n┃ ✧ ɢᴀɢᴀʟ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇᴅɪᴀ, ᴄᴏʙᴀ ʟᴀɢɪ.\n╰┈┈┈┈┈┈┈┈⬡`);
        return;
    }
    const isVideo = media.type === 'videoMessage';
    if (isVideo && (media.message.seconds || 0) > 15) {
        await m.reply(`╭┈┈⬡「 *ᴇʀʀᴏʀ* 」\n┃ ✧ ᴠɪᴅᴇᴏ ᴋᴇᴘᴀɴᴊᴀɴɢᴀɴ, ᴍᴀᴋꜱɪᴍᴀʟ 15 ᴅᴇᴛɪᴋ ʏᴀ.\n╰┈┈┈┈┈┈┈┈⬡`);
        return;
    }
    const webp = await makeSticker(buffer, { isVideo, packName: config.botName, authorName: m.pushName || config.copyrightName });
    await conn.sendMessage(m.chat, { sticker: webp }, { quoted: m.raw });
};
handler.help = ['sticker'];
handler.tags = ['tools'];
handler.command = /^(sticker|s|stiker)$/i;
export default handler;
