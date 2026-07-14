'use strict';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
const FAA_BASE = 'https://api-faa.my.id/faa';
function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}
const handler = async (m, { conn, args }) => {
    const url = args[0];
    if (!url || !/(youtube\.com|youtu\.be)/.test(url)) {
        await m.reply(' Kasih link YouTube yang valid.\nContoh: .ytmp3 https://youtu.be/xxxxx');
        return;
    }
    await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
    let audioOut;
    try {
        const videoId = extractVideoId(url);
        const thumbUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;
        let title = 'YouTube Audio';
        let channel = 'Unknown';
        try {
            const oembed = await axios.get(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
                { timeout: 10000 }
            );
            title = oembed.data.title || title;
            channel = oembed.data.author_name || channel;
        } catch { }
        const res = await axios.get(`${FAA_BASE}/ytmp3`, { params: { url }, timeout: 120000 });
        const data = res.data;
        const dlUrl =
            data?.result?.mp3 ||
            data?.result?.download_url ||
            data?.result?.url ||
            data?.download_url ||
            data?.url ||
            data?.link ||
            data?.audio ||
            null;
        if (!dlUrl) throw new Error(`API tidak memberikan link download. Respon: ${JSON.stringify(data).slice(0, 150)}`);
        const tempDir = path.join(process.cwd(), 'media', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const stamp = Date.now();
        audioOut = path.join(tempDir, `${stamp}.mp3`);
        const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
        fs.writeFileSync(audioOut, Buffer.from(audioRes.data));
        const sizeMB = fs.statSync(audioOut).size / 1024 / 1024;
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
        await conn.sendMessage(m.chat, {
            image: { url: thumbUrl || 'https://i.ytimg.com/vi/default/maxresdefault.jpg' },
            caption: ` *${title}*\n ${channel}\n ${sizeMB.toFixed(2)} MB`,
        }, { quoted: m.raw });
        await conn.sendMessage(m.chat, {
            audio: fs.readFileSync(audioOut),
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
        }, { quoted: m.raw });
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    }
    catch (err) {
        console.error('[YTMP3 ERROR]', err);
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } }).catch(() => { });
        await m.reply(' Gagal download audio: ' + err.message);
    }
    finally {
        try { if (audioOut && fs.existsSync(audioOut)) fs.unlinkSync(audioOut); } catch { }
    }
};
handler.help = ['ytmp3 <link YouTube>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp3|yta|mp3)$/i;
handler.limit = true;
export default handler;