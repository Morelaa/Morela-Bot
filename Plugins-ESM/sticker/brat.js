'use strict';
import config from '../../config.js';
import { ButtonV2 } from '../../Library/MessageBuilder.js';
import { toPhoneJid } from '../../Library/resolve.js';
import { buildFkontak } from '../../Library/utils.js';
import bratoriginalHandler from './bratoriginal.js';
import bratruromiyaHandler from './bratruromiya.js';
import bratvidHandler from './bratvid.js';

const footer = `© ${config.copyrightName || config.botName}`;

// Sesi sementara: nyimpen teks brat yg diketik user, dipakai lagi waktu user
// pencet salah satu tombol style di menu ButtonV2.
const bratSessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 1000;

// Ambil foto profil orang yang ngetik .brat. Kalau nggak ada (private/kosong),
// fallback ke foto profil bot sendiri.
async function resolveSenderThumb(sock, senderJid) {
    try {
        const jid = toPhoneJid(senderJid) || senderJid;
        const url = await sock.profilePictureUrl(jid, 'image');
        if (url) return url;
    } catch {}
    try {
        const botJid = (sock.user?.id?.split(':')[0] || '') + '@s.whatsapp.net';
        const botUrl = await sock.profilePictureUrl(botJid, 'image');
        if (botUrl) return botUrl;
    } catch {}
    return null;
}

async function sendBratMenu(m, conn, text) {
    const thumb = await resolveSenderThumb(conn, m.sender);

    const btn = new ButtonV2(conn)
        .setTitle(' Brat Sticker')
        .setSubtitle(`Teks: ${text}`)
        .setBody(`Pilih style\n\n` + `◦  Original\n` + `◦  Ruromiya\n` + `◦  Vid`)
        .setFooter(footer);

    if (thumb) btn.setThumbnail(thumb);

    // Maksimal 3 button
    btn.addButton(' Original', '.brat_orig');
    btn.addButton(' Ruromiya', '.brat_ruromiya');
    btn.addButton(' Vid', '.brat_vid');

    const built = await btn.build(m.chat, { quoted: (await buildFkontak(conn, config).catch(() => null)) || m.raw });
    await conn.relayMessage(m.chat, built.message, { messageId: built.key.id });
}

const BUTTON_CMDS = new Set(['brat_orig', 'brat_ruromiya', 'brat_vid']);
const CMD_MAP = {
    brat_orig: { plugin: bratoriginalHandler, command: 'bratoriginal' },
    brat_ruromiya: { plugin: bratruromiyaHandler, command: 'bratruromiya' },
    brat_vid: { plugin: bratvidHandler, command: 'bratvid' },
};

const handler = async (m, { conn, text, command, usedPrefix }) => {
    // Handler tombol yang dipilih dari menu ButtonV2
    if (BUTTON_CMDS.has(command)) {
        const session = bratSessions.get(m.sender);
        if (!session) return m.reply('ketik ulang brat lagi ');
        bratSessions.delete(m.sender);

        const target = CMD_MAP[command];
        if (!target) return m.reply(' Plugin tidak ditemukan!');

        return target.plugin(m, {
            conn,
            text: session.text,
            args: session.text.split(' '),
            usedPrefix: usedPrefix || '.',
            command: target.command,
        });
    }

    // Pesan panduan jika tidak ada teks
    if (!text?.trim())
        return m.reply(
            `╭╌「  *Brat Sticker* 」\n` +
            `┃ Contoh: *${usedPrefix}brat haloii*\n` +
            `┃\n` +
            `┃ Style dengan button:\n` +
            `┃ ◦  Original\n` +
            `┃ ◦  Ruromiya\n` +
            `┃ ◦  Vid\n` +
            `┃\n` +
            `┃ Style ketik langsung:\n` +
            `┃ ◦ ${usedPrefix}bratv2 <teks>\n` +
            `┃ ◦ ${usedPrefix}bratgura <teks>\n` +
            `┃ ◦ ${usedPrefix}bratspongebob <teks>\n` +
            `┃ ◦ ${usedPrefix}brattren <teks>\n` +
            `╰╌\n\n${footer}`
        );

    // Simpan sesi dan kirim menu ButtonV2
    bratSessions.set(m.sender, { text: text.trim() });
    setTimeout(() => bratSessions.delete(m.sender), SESSION_TTL_MS);

    await sendBratMenu(m, conn, text.trim());
};

handler.command = /^(brat|brat_orig|brat_ruromiya|brat_vid)$/i;
handler.tags = ['sticker'];
handler.help = ['brat <teks>'];

export default handler;
