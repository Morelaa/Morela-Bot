'use strict';
import axios from 'axios';
import config from '../../config.js';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';
import { AIRich, Toolkit } from '../../Library/MessageBuilder.js';
import { buildFkontak } from '../../Library/utils.js';

const OWNER_WA = `https://wa.me/${config.mainOwner}`;
const NEOXR_KEY = config.apiKeys?.neoxr;

function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

async function uploadImage(buffer, conn) {
    try {
        const url = await Toolkit.toUrl(conn, buffer, 'image');
        if (url) return url;
        throw new Error('CDN WA tidak mengembalikan URL');
    } catch {
        const form = new FormData();
        form.append('file', bufferToBlob(buffer, 'image/jpeg'), 'image.jpg');
        const res = await fetch('https://cdn.ornzora.eu.cc/upload', { method: 'POST', body: form });
        const data = await res.json().catch(() => null);
        const url = data?.url || data?.data?.url || data?.link || data?.data?.link ||
            (typeof data === 'string' && data.startsWith('https://') ? data.trim() : null);
        if (url) return url;
        throw new Error('Upload gagal (CDN WA & Ornzora)');
    }
}

const handler = async (m, { conn, usedPrefix, command }) => {
    const media = findMediaMessage(m);

    if (!media || media.type !== 'imageMessage') {
        return m.reply(
            `╭┈┈⬡「 *ʀᴇᴍᴏᴠᴇ ᴡᴀᴛᴇʀᴍᴀʀᴋ* 」\n┃\n` +
            `┃ ✧ ᴋɪʀɪᴍ ᴀᴛᴀᴜ ʀᴇᴘʟʏ ꜰᴏᴛᴏ ʟᴀʟᴜ ᴋᴇᴛɪᴋ:\n` +
            `┃ ✧ *${usedPrefix}${command}*\n┃\n` +
            `┃ ✧ ᴄᴀᴛᴀᴛᴀɴ:\n` +
            `┃ ✧ ᴍᴀᴋꜱ ᴜᴋᴜʀᴀɴ ɢᴀᴍʙᴀʀ: 20 ᴍʙ\n` +
            `┃ ✧ ᴘʀᴏꜱᴇꜱ 15–30 ᴅᴇᴛɪᴋ\n┃\n` +
            `╰┈┈┈┈┈┈┈┈⬡`
        );
    }

    const img = media.message;
    if ((img.fileLength || 0) > 20 * 1024 * 1024) {
        return m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ɢᴀᴍʙᴀʀ ᴛᴇʀʟᴀʟᴜ ʙᴇꜱᴀʀ, ᴍᴀᴋꜱɪᴍᴀʟ *20 ᴍʙ*\n╰┈┈┈┈┈┈┈┈⬡`);
    }

    if (!NEOXR_KEY) {
        return m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ᴀᴘɪ ᴋᴇʏ ɴᴇᴏxʀ ʙᴇʟᴜᴍ ᴅɪᴀᴛᴜʀ ᴅɪ ᴄᴏɴꜰɪɢ.ᴊꜱ (ᴀᴘɪᴋᴇʏꜱ.ɴᴇᴏxʀ)\n╰┈┈┈┈┈┈┈┈⬡`);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    let buffer;
    try {
        buffer = await downloadMessageMedia(m, conn);
        if (!buffer?.length) throw new Error('Buffer kosong');
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return m.reply(`╭┈┈⬡「 *ɢᴀɢᴀʟ ᴅᴏᴡɴʟᴏᴀᴅ ɢᴀᴍʙᴀʀ* 」\n┃\n┃ ✧ ${e.message}\n╰┈┈┈┈┈┈┈┈⬡`);
    }

    await conn.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } });

    try {
        const [imageUrl, ppUrl, fk] = await Promise.all([
            uploadImage(buffer, conn),
            conn.profilePictureUrl(conn.user.id, 'image').catch(() => config.thumbnail),
            buildFkontak(conn, config),
        ]);

        const response = await axios.get('https://api.neoxr.eu/api/nowm', {
            params: { image: imageUrl, apikey: NEOXR_KEY },
            timeout: 120000,
        });

        if (!response.data?.status || !response.data?.data?.url) {
            throw new Error(response.data?.message || 'Gagal mendapatkan hasil dari API');
        }

        const resultUrl = response.data.data.url;

        await new AIRich(conn)
            .setTitle('Ai Assistant')
            .addProduct({
                title: '',
                brand: config.botName,
                price: ' Remove Watermark',
                sale_price: '',
                product_url: OWNER_WA,
                icon_url: ppUrl,
                image_url: ppUrl,
            })
            .addTip(' ')
            .addImage(resultUrl, { mimeType: 'image/jpeg' })
            .addSource([
                ['https://www.google.com/s2/favicons?domain=google.com&sz=16', 'https://google.com', 'Google'],
                ['https://www.google.com/s2/favicons?domain=whatsapp.com&sz=16', OWNER_WA, config.botName],
            ])
            .send(m.chat, { quoted: fk });

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return m.reply(`╭┈┈⬡「 *ᴘʀᴏꜱᴇꜱ ʀᴇᴍᴏᴠᴇ ᴡᴀᴛᴇʀᴍᴀʀᴋ ɢᴀɢᴀʟ* 」\n┃\n┃ ✧ ${e.message}\n╰┈┈┈┈┈┈┈┈⬡`);
    }
};

handler.help = ['removewm <reply foto>'];
handler.tags = ['tools', 'ai'];
handler.command = /^(removewm|nowm|hapuswm)$/i;
handler.limit = true;

export default handler;
