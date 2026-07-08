'use strict';
import axios from 'axios';
import config from '../../config.js';

const TT_URL_REGEX =
    /https?:\/\/(?:www\.|m\.|vm\.|vt\.|v\.)?tiktok\.com(?:\/[^\s]*)?|https?:\/\/(?:vm|vt)\.tiktok\.com\/[^\s]*/i;

function numFmt(n) {
    const num = parseInt(n) || 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return String(num);
}

function fmtDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

async function fetchNeoxr(url) {
    const apikey = config.apiKeys.neoxr;
    if (!apikey) {
        throw new Error('API key neoxr belum diisi. Isi config.apiKeys.neoxr dulu.');
    }
    const res = await axios.get('https://api.neoxr.eu/api/tiktok', {
        params: { url, apikey },
        timeout: 30000,
    });
    const d = res.data;
    if (!d?.status || !d?.data) throw new Error(d?.message || 'Neoxr API gagal');
    const data = d.data;
    if (!data.video) throw new Error('URL video tidak ditemukan');
    return {
        playUrl: data.video,
        coverUrl: data.author?.avatar_thumb?.url_list?.[0] || '',
        desc: data.caption || '',
        author: data.author?.nickname || 'unknown',
        uniqueId: data.author?.unique_id || '',
        duration: data.music?.duration || 0,
        views: data.statistic?.views || 0,
        likes: data.statistic?.likes || 0,
        comments: data.statistic?.comments || 0,
        music: data.music?.title || '',
    };
}

async function downloadVideo(videoUrl) {
    const res = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.tiktok.com/',
        },
        timeout: 90000,
        maxRedirects: 10,
    });
    return Buffer.from(res.data);
}

const handler = async (m, { conn, args }) => {
    const url = args[0];

    if (!url || !TT_URL_REGEX.test(url)) {
        await m.reply(
            '❌ Kasih link TikTok yang valid.\n' +
            'Contoh:\n' +
            '• .tiktok https://vt.tiktok.com/xxx\n' +
            '• .tiktok https://vm.tiktok.com/xxx\n' +
            '• .tiktok https://www.tiktok.com/@user/video/xxx'
        );
        return;
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    try {
        const data = await fetchNeoxr(url);

        await conn.sendMessage(m.chat, { react: { text: '📥', key: m.key } });
        const videoBuf = await downloadVideo(data.playUrl);
        const sizeMB = (videoBuf.length / 1024 / 1024).toFixed(2);

        const caption =
            `🎵 *TikTok*\n` +
            `${data.author}${data.uniqueId ? ` (@${data.uniqueId})` : ''}\n` +
            `${data.desc.slice(0, 80)}${data.desc.length > 80 ? '...' : ''}\n` +
            `👁️ ${numFmt(data.views)}  ❤️ ${numFmt(data.likes)}  💬 ${numFmt(data.comments)}\n` +
            `⏱️ ${fmtDuration(data.duration)}  📦 ${sizeMB} MB` +
            (data.music ? `\n🎵 ${data.music.slice(0, 50)}${data.music.length > 50 ? '...' : ''}` : '');

        await conn.sendMessage(m.chat, {
            video: videoBuf,
            caption,
            ...(data.coverUrl ? { jpegThumbnail: undefined } : {}),
        }, { quoted: m.raw });

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    }
    catch (err) {
        console.error('[TT]', err.message);
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => { });
        await m.reply(`❌ Gagal download: ${err.message}`);
    }
};

handler.help = ['tiktok <link tiktok>'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|tt)$/i;
handler.register = true;
handler.limit = true;
export default handler;
