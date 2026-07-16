'use strict';
import { findMediaMessage, downloadMessageMedia } from '../../Library/handle.js';
const BASE = 'https://selfit-camera-omni-image-editor.hf.space';
const API_PREFIX = '/gradio_api';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function uploadToGradio(buffer, filename, mimetype) {
    const form = new FormData();
    form.append('files', new Blob([buffer], { type: mimetype }), filename);
    const res = await fetch(`${BASE}${API_PREFIX}/upload`, {
        method: 'POST',
        headers: { 'User-Agent': UA },
        body: form,
    });
    if (!res.ok) throw new Error(`Upload gagal (HTTP ${res.status})`);
    const paths = await res.json();
    if (!Array.isArray(paths) || !paths[0]) throw new Error('Upload tidak mengembalikan path');
    return paths[0];
}
function toFileData(path, filename, mimetype) {
    return {
        path,
        orig_name: filename,
        mime_type: mimetype,
        meta: { _type: 'gradio.FileData' },
    };
}
async function submitCall(apiName, dataArray) {
    const res = await fetch(`${BASE}${API_PREFIX}/call/${apiName}`, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataArray }),
    });
    if (!res.ok) throw new Error(`Submit gagal (HTTP ${res.status})`);
    const j = await res.json();
    if (!j.event_id) throw new Error('Tidak dapat event_id dari server');
    return j.event_id;
}
function parseSSE(text) {
    const events = [];
    for (const block of text.split('\n\n')) {
        let event = 'message';
        let dataStr = '';
        for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) dataStr += line.slice(5).trim();
        }
        if (dataStr) {
            try { events.push({ event, data: JSON.parse(dataStr) }); } catch {  }
        }
    }
    return events;
}
async function pollResult(apiName, eventId, timeoutMs = 90000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${BASE}${API_PREFIX}/call/${apiName}/${eventId}`, {
            headers: { 'User-Agent': UA },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Polling gagal (HTTP ${res.status})`);
        const text = await res.text();
        const events = parseSSE(text);
        const errEvent = events.find((e) => e.event === 'error');
        if (errEvent) throw new Error(`Server error: ${JSON.stringify(errEvent.data)}`);
        const completeEvents = events.filter((e) => e.event === 'complete');
        if (!completeEvents.length) throw new Error('Tidak ada event "complete" (mungkin timeout/space cold-start)');
        return completeEvents[completeEvents.length - 1].data;
    } finally {
        clearTimeout(timer);
    }
}
function extractImageUrlFromHtml(html) {
    if (!html || typeof html !== 'string') return null;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (!match) return null;
    let url = match[1];
    if (url.startsWith('/')) url = BASE + url;
    return url;
}
async function downloadResultImage(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Gagal download hasil (HTTP ${res.status})`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}
async function editImageWithPrompt(buffer, prompt) {
    const uploadedPath = await uploadToGradio(buffer, 'image.jpg', 'image/jpeg');
    const fileData = toFileData(uploadedPath, 'image.jpg', 'image/jpeg');
    const eventId = await submitCall('edit_image_interface', [fileData, prompt]);
    const result = await pollResult('edit_image_interface', eventId);
    const htmlOutput = result?.[0];
    let status = result?.[2];
    if (status) {
        status = status
            .split('\n')
            .filter((line) => !/omnieditor\.net|visit\s+https?:\/\//i.test(line))
            .join('\n')
            .trim();
    }
    const imgUrl = extractImageUrlFromHtml(htmlOutput);
    if (!imgUrl) {
        throw new Error(`Tidak menemukan gambar hasil di response.\nStatus: ${status || '(kosong)'}`);
    }
    const resultBuffer = await downloadResultImage(imgUrl);
    return { buffer: resultBuffer, status };
}
const handler = async (m, { conn }) => {
    const media = findMediaMessage(m);
    if (!media || media.type !== 'imageMessage') {
        return m.reply(
            `╭┈┈⬡「 *ᴀɪ ᴇᴅɪᴛ* 」\n┃\n┃ ✧ ᴋɪʀɪᴍ/ʀᴇᴘʟʏ ꜰᴏᴛᴏ ᴅᴇɴɢᴀɴ\n┃ ✧ ᴄᴀᴘᴛɪᴏɴ *.ᴀɪᴇᴅɪᴛ <ᴘʀᴏᴍᴘᴛ>*\n┃\n┃ ✧ ᴄᴏɴᴛᴏʜ:\n┃ ✧ .ᴀɪᴇᴅɪᴛ ᴜʙᴀʜ ᴊᴀᴅɪ ɢᴀʏᴀ ᴀɴɪᴍᴇ\n┃\n╰┈┈┈┈┈┈┈┈⬡`
        );
    }
    const prompt = m.argsText?.trim();
    if (!prompt) {
        return m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ᴘʀᴏᴍᴘᴛ ᴋᴏꜱᴏɴɢ. ᴄᴏɴᴛᴏʜ: *.ᴀɪᴇᴅɪᴛ ᴜʙᴀʜ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ᴊᴀᴅɪ ᴘᴀɴᴛᴀɪ*\n╰┈┈┈┈┈┈┈┈⬡`);
    }
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    try {
        const buffer = await downloadMessageMedia(m, conn);
        if (!buffer || !buffer.length) throw new Error('Gagal download gambar dari WA');
        const { buffer: resultBuffer, status } = await editImageWithPrompt(buffer, prompt);
        await conn.sendMessage(
            m.chat,
            {
                image: resultBuffer,
                caption: `✅ *AI Edit*\n\nPrompt: ${prompt}${status ? `\nStatus: ${status}` : ''}`,
            },
            { quoted: m }
        );
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        await m.reply(`╭┈┈⬡「 *ɢᴀɢᴀʟ ᴇᴅɪᴛ ɢᴀᴍʙᴀʀ:* 」\n┃ ✧ ${e.message}\n╰┈┈┈┈┈┈┈┈⬡`);
    }
};
handler.help = ['aiedit <prompt> (reply foto)'];
handler.tags = ['ai'];
handler.command = /^aiedit$/i;
handler.limit = true;
handler.premium = true;
export { editImageWithPrompt };
export default handler;