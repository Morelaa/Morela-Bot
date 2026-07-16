'use strict';
import axios from 'axios';
import config from '../../config.js';
import { buildFkontak } from '../../Library/utils.js';
const SF_PHP    = 'https://id.savefrom.net/savefrom.php';
const SF_WORKER = 'https://worker.savefrom.net/api/convert';
const COBALT_API = 'https://api.cobalt.tools/api/json';
const DELINE_API = 'https://api.deline.web.id/downloader/ig';
async function fetchSavefrom(igUrl) {
  const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36';
  let cookieStr = 'vid=300';
  try {
    const page = await axios.get('https://id.savefrom.net/194kC/download-from-instagram', { headers: { 'User-Agent': UA }, timeout: 10000 });
    const setCookies = page.headers['set-cookie'] || [];
    const cookies = setCookies.map(c => c.split(';')[0]).join('; ');
    if (cookies) cookieStr = cookies + '; vid=300';
  } catch {}
  const params = new URLSearchParams({ sf_url: String(igUrl), new: '2', lang: 'id', country: 'ID', os: 'android', browser: 'chrome', channel: 'downloader', app: '' });
  const res = await axios.post(SF_PHP, params.toString(), { headers: { 'User-Agent': UA, 'Referer': 'https://id.savefrom.net/194kC/download-from-instagram', 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 });
  if (!res.data || typeof res.data !== 'object' || res.data.error) throw new Error('Savefrom gagal');
  return parseSavefrom(res.data);
}
async function fetchSavefromWorker(igUrl) {
  const res = await axios.get(SF_WORKER, { params: { url: igUrl, lang: 'id' }, timeout: 25000 });
  if (!res.data?.url?.length) throw new Error('Worker gagal');
  return parseSavefrom(res.data);
}
async function fetchCobalt(igUrl) {
  const res = await axios.post(COBALT_API, { url: igUrl, vCodec: 'h264', vQuality: '720', aFormat: 'mp3', isAudioOnly: false, isNoTTWatermark: true }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
  const d = res.data;
  if (d.status === 'error') throw new Error('Cobalt gagal');
  if (d.status === 'picker') return { title: '', thumb: '', videos: d.picker.filter(p => p.type === 'video').map(p => ({ url: p.url, quality: '' })), images: d.picker.filter(p => p.type === 'photo').map(p => ({ url: p.url, quality: '' })) };
  return { title: '', thumb: '', videos: [{ url: d.url, quality: '720p' }], images: [] };
}
async function fetchDeline(igUrl) {
  const { data } = await axios.get(DELINE_API, { params: { url: igUrl }, timeout: 30000 });
  if (!data?.status || !data?.result) throw new Error('Deline gagal');
  return { title: data.result.title || '', thumb: data.result.thumbnail || '', videos: (data.result.media?.videos || []).map(v => ({ url: v, quality: '' })), images: (data.result.media?.images || []).map(i => ({ url: i, quality: '' })) };
}
function parseSavefrom(data) {
  const result = { title: data.meta?.title || '', thumb: data.meta?.thumb || '', videos: [], images: [] };
  for (const item of (data.url || [])) {
    const url = item.url || '';
    if (!url) continue;
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) result.images.push({ url, quality: item.s || '' });
    else result.videos.push({ url, quality: item.s || '' });
  }
  return result;
}
async function fetchIG(igUrl) {
  const sources = [fetchSavefrom, fetchSavefromWorker, fetchCobalt, fetchDeline];
  for (const fn of sources) {
    try {
      const res = await fn(igUrl);
      if (res && (res.videos.length > 0 || res.images.length > 0)) return res;
    } catch (e) { console.warn(e.message); }
  }
  return null;
}
async function downloadBuf(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return Buffer.from(res.data);
}
const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(
    `ɪɴꜱᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ\n\n` +
    `╭┈┈⬡「 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
    `┃ ✧ ${usedPrefix}${command} <ʟɪɴᴋ>\n` +
    `╰┈┈┈┈┈┈┈┈⬡\n\n` +
    `ᴄᴏɴᴛᴏʜ:\n${usedPrefix}${command} https://instagram.com/p/xxxxx`
  );
  if (conn.reactSafe) await conn.reactSafe(m.chat, m.key, '⏳');
  const result = await fetchIG(text.trim());
  if (!result) {
    if (conn.reactSafe) await conn.reactSafe(m.chat, m.key, '❌');
    return m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴍʙɪʟ ᴍᴇᴅɪᴀ.\n╰┈┈┈┈┈┈┈┈⬡`);
  }
  const total = result.videos.length + result.images.length;
  await m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ _ᴍᴇɴɢᴜɴᴅᴜʜ ${total} ᴍᴇᴅɪᴀ..._\n╰┈┈┈┈┈┈┈┈⬡`);
  for (let i = 0; i < result.images.length; i++) {
    const captionStr = `ɪɴꜱᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ\n\n╭┈┈⬡「 *ʀᴇꜱᴜʟᴛ* 」\n┃ ✧ ᴛɪᴘᴇ : ɢᴀᴍʙᴀʀ\n╰┈┈┈┈┈┈┈┈⬡\n\n_© ${config.botName}_`;
    try {
      const buf = await downloadBuf(result.images[i].url);
      await conn.sendMessage(m.chat, { image: buf, caption: captionStr }, { quoted: await buildFkontak(conn, config) });
    } catch {}
  }
  for (let i = 0; i < result.videos.length; i++) {
    const vid = result.videos[i];
    const captionStr = `ɪɴꜱᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ\n\n╭┈┈⬡「 *ʀᴇꜱᴜʟᴛ* 」\n┃ ✧ ᴛɪᴘᴇ : ᴠɪᴅᴇᴏ\n┃ ✧ ᴋᴜᴀʟɪᴛᴀꜱ : ${vid.quality || 'Auto'}\n╰┈┈┈┈┈┈┈┈⬡\n\n_© ${config.botName}_`;
    try {
      const buf = await downloadBuf(vid.url);
      await conn.sendMessage(m.chat, { video: buf, mimetype: 'video/mp4', caption: captionStr }, { quoted: await buildFkontak(conn, config) });
    } catch {}
  }
  if (conn.reactSafe) await conn.reactSafe(m.chat, m.key, '✅');
};
handler.help = ['ig <url>'];
handler.tags = ['downloader'];
handler.command = /^(ig|instagram|igdl|insta)$/i;
export default handler;