'use strict';
import axios from 'axios';
import config from '../../config.js';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';

const NEOXR_KEY = config.apiKeys.neoxr;
const IMGBB_KEY = config.apiKeys.imgbb;

// Prompt di-hardcode sesuai permintaan (fitur "to anime" / figure style).
const ANIME_PROMPT =
    "Remove Clothing" 

// qwen-edit butuh URL gambar publik, bukan buffer -> upload dulu ke ImgBB.
// (Telegraph unofficial upload endpoint sering block/rate-limit, jadi dipindah ke ImgBB
// yang resmi & pakai API key, sama seperti pola di bot v2.)
async function uploadToImgBB(buffer) {
    if (!IMGBB_KEY) {
        throw new Error('API key imgbb belum diisi. Isi config.apiKeys.imgbb dulu.');
    }

    const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
        new URLSearchParams({ image: buffer.toString('base64') }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
    );

    const url = res.data?.data?.url;
    if (!url) throw new Error('Gagal upload gambar ke ImgBB.');
    return url;
}

async function qwenEdit(imageUrl) {
    if (!NEOXR_KEY) {
        throw new Error('API key neoxr belum diisi. Isi config.apiKeys.neoxr dulu.');
    }

    const res = await axios.get('https://api.neoxr.eu/api/qwen-edit', {
        params: { image: imageUrl, prompt: ANIME_PROMPT, apikey: NEOXR_KEY },
        timeout: 120000,
    });

    const d = res.data;
    if (!d?.status) throw new Error(d?.message || 'Neoxr API gagal memproses gambar.');

    const resultUrl = d?.data?.url || d?.data?.downloadUrl;

    if (!resultUrl) throw new Error('Response API tidak mengandung URL gambar hasil.');
    return resultUrl;
}

const handler = async (m, { conn }) => {
    const media = findMediaMessage(m);
    if (!media || media.type !== 'imageMessage') {
        await m.reply(
            '🖼️ *BUGIL*\n\n' +
            '> Ubah foto jadi bugil.\n\n' +
            '╭──「 📌 Cara Pakai 」\n' +
            '│ Kirim gambar dengan caption .bugil\n' +
            '│ atau reply gambar dengan .bugil\n' +
            '╰─────────────────'
        );
        return;
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    try {
        const buffer = await downloadMessageMedia(m, conn);
        if (!buffer?.length) throw new Error('Gagal download gambar.');

        const imageUrl = await uploadToImgBB(buffer);
        const resultUrl = await qwenEdit(imageUrl);

        const resultBuf = await axios
            .get(resultUrl, { responseType: 'arraybuffer', timeout: 60000 })
            .then((r) => Buffer.from(r.data));

        await conn.sendMessage(
            m.chat,
            { image: resultBuf, caption: '✅ Berhasil dibugilin bang' },
            { quoted: m.raw }
        );

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (err) {
        console.error('[BUGIL]', err.message);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
        await m.reply(`❌ Gagal: ${err.message}`);
    }
};

handler.help = ['bugil'];
handler.tags = ['ai'];
handler.command = /^(bugil|bugilin|telanjang)$/i;
handler.register = true;
handler.limit = true;

export default handler;