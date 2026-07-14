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
        await m.reply(' Kasih link YouTube yang valid.\nContoh: .ytmp4 https://youtu.be/xxxxx');
        return;
    }
    await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
    let videoOut;
    try {
        const videoId = extractVideoId(url);
        const thumbUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;
        let title = 'YouTube Video';
        let channel = 'Unknown';
        try {
            const oembed = await axios.get(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
                { timeout: 10000 }
            );
            title = oembed.data.title || title;
            channel = oembed.data.author_name || channel;
        } catch {}
        const res = await axios.get(`${FAA_BASE}/ytmp4`, { params: { url }, timeout: 120000 });
        const data = res.data;
        const dlUrl =
            data?.result?.mp4 ||
            data?.result?.download_url ||
            data?.result?.url ||
            data?.download_url ||
            data?.url ||
            data?.link ||
            data?.video ||
            null;
        if (!dlUrl) throw new Error(`API tidak memberikan link download. Respon: ${JSON.stringify(data).slice(0, 150)}`);
        const tempDir = path.join(process.cwd(), 'media', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const stamp = Date.now();
        videoOut = path.join(tempDir, `${stamp}.mp4`);
        const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
        fs.writeFileSync(videoOut, Buffer.from(videoRes.data));
        const sizeMB = fs.statSync(videoOut).size / 1024 / 1024;
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
        await conn.sendMessage(m.chat, {
            video: fs.readFileSync(videoOut),
            caption: ` *${title}*\n ${channel}\n ${sizeMB.toFixed(2)} MB`,
            thumbnail: thumbUrl ? { url: thumbUrl } : undefined,
        }, { quoted: m.raw });
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    }
    catch (err) {
        console.error('[YTMP4 ERROR]', err);
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } }).catch(() => {});
        await m.reply(' Gagal download video: ' + err.message);
    }
    finally {
        try { if (videoOut && fs.existsSync(videoOut)) fs.unlinkSync(videoOut); } catch {}
    }
};
handler.help = ['ytmp4 <link YouTube>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv|mp4)$/i;
handler.limit = true;
export default handler;