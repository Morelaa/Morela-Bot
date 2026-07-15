'use strict';
import db from '../../Database/db.js';
import {
    isLidJid,
    resolveLidToPhone,
    normNum,
    findParticipant,
    safeKickJid,
    safeDeleteParticipant,
    resolveBotAdmin,
    isSenderAdminInGroup,
} from '../../Library/resolve.js';

const _floodMap = new Map();

const CFG = {
    FLOOD_MAX: 5,
    FLOOD_WINDOW: 2000,
    PRODUCT_DESC_MAX: 1000,
    TEXT_MAX: 8000,
    ZALGO_RATIO: 0.40,
    ZALGO_MIN_LEN: 20,
};

setInterval(() => {
    const now = Date.now();
    for (const [k, d] of _floodMap) {
        if (now - (d.lastAt || 0) > 30000) _floodMap.delete(k);
    }
}, 5 * 60 * 1000);

function isProductVirtex(m) {
    const product = m.message?.productMessage?.product;
    if (!product) return false;
    const desc = product.description || '';
    const title = product.title || '';
    return desc.length > CFG.PRODUCT_DESC_MAX || title.length > CFG.PRODUCT_DESC_MAX;
}

function isLongTextVirtex(m) {
    const texts = [
        m.message?.conversation,
        m.message?.extendedTextMessage?.text,
        m.message?.imageMessage?.caption,
        m.message?.videoMessage?.caption,
        m.message?.documentMessage?.caption,
    ].filter(Boolean);
    return texts.some((t) => t.length > CFG.TEXT_MAX);
}

function isZalgoVirtex(m) {
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.body || '';
    if (!text || text.length < CFG.ZALGO_MIN_LEN) return false;
    if (/^[.!/,>$=]/.test(text.trim())) return false;
    let nonAscii = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0);
        if (
            (code >= 0x0300 && code <= 0x036F) ||
            (code >= 0x0483 && code <= 0x0489) ||
            (code >= 0x1DC0 && code <= 0x1DFF) ||
            (code >= 0x20D0 && code <= 0x20FF) ||
            (code >= 0xFE20 && code <= 0xFE2F) ||
            code > 0xFFFF
        ) nonAscii++;
    }
    return nonAscii / text.length > CFG.ZALGO_RATIO;
}

function isDangerousType(m) {
    const DANGEROUS = ['groupInviteMessage', 'contactsArrayMessage'];
    return DANGEROUS.includes(m.type || '');
}

function isCommandMessage(m) {
    const text = m.body || m.text || m.message?.conversation || '';
    return /^[.!/,>$=]/.test(text.trim());
}

async function deleteMsg(sock, m) {
    try {
        const rawPart = m.key.participant || m.key.remoteJid || '';
        const deletePart = safeDeleteParticipant(rawPart);
        await sock.sendMessage(m.chat, {
            delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: deletePart },
        });
    } catch { /* noop */ }
}

function resolveDisplay(m, senderJid) {
    const isLid = isLidJid(senderJid);
    const rawLidNum = senderJid.split('@')[0];
    const resolvedPhone = isLid ? resolveLidToPhone(senderJid) : null;
    const phoneNum = resolvedPhone || normNum(senderJid);
    const mentionJid = resolvedPhone ? `${phoneNum}@s.whatsapp.net` : senderJid;
    const displayName =
        db.getPushName(senderJid) ||
        db.getPushName(rawLidNum) ||
        (resolvedPhone ? db.getPushName(`${phoneNum}@s.whatsapp.net`) : null) ||
        (resolvedPhone ? db.getPushName(phoneNum) : null) ||
        m.pushName ||
        (resolvedPhone ? `+${phoneNum}` : rawLidNum);
    return { phoneNum, mentionJid, displayName };
}

async function kickAndNotify(sock, m, senderJid, reason, botAdmin) {
    const { phoneNum, mentionJid, displayName } = resolveDisplay(m, senderJid);
    await deleteMsg(sock, m);

    await sock.sendMessage(m.chat, {
        text:
            ` *Anti Virtex — Terdeteksi!*\n\n` +
            `@${phoneNum} dikeluarkan dari grup karena:\n` +
            ` *${reason}*\n\n` +
            `Nama: *${displayName}*\n` +
            `_Tindakan: Kick + hapus pesan_`,
        mentions: [mentionJid],
    }, { quoted: m.raw });

    const effectiveBotAdmin = botAdmin || (await resolveBotAdmin(sock, m.chat));
    if (effectiveBotAdmin) {
        try {
            const meta = await sock.groupMetadata(m.chat);
            const target = findParticipant(meta?.participants, senderJid);
            const kickJid = safeKickJid(target) || senderJid;
            await sock.groupParticipantsUpdate(m.chat, [kickJid], 'remove');
        } catch (e) {
            console.error('[ANTI-VIRTEX] kick error:', e?.message);
        }
    }
}

async function handleFlood(sock, m, senderJid, botAdmin) {
    const { phoneNum, mentionJid, displayName } = resolveDisplay(m, senderJid);
    await deleteMsg(sock, m);

    const grp = db.getGroup(m.chat);
    const warns = grp?.settings?.warns || {};
    if (!warns[senderJid]) warns[senderJid] = { count: 0 };
    warns[senderJid].count++;
    warns[senderJid].updatedAt = Date.now();
    db.updateGroup(m.chat, { warns });
    const count = warns[senderJid].count;

    await sock.sendMessage(m.chat, {
        text:
            ` *Anti Virtex — Flood Terdeteksi!*\n\n` +
            `@${phoneNum} mengirim pesan terlalu cepat!\n` +
            `Nama: *${displayName}*\n` +
            ` Semua pesan dihapus\n` +
            ` Peringatan: *${count}/3*\n\n` +
            (count >= 3 ? ' Batas penuh  kick!' : 'Ulangi lagi  akan dikick.'),
        mentions: [mentionJid],
    }, { quoted: m.raw });

    if (count >= 3 && botAdmin) {
        try {
            const meta = await sock.groupMetadata(m.chat);
            const target = findParticipant(meta?.participants, senderJid);
            const kickJid = safeKickJid(target) || senderJid;
            await sock.groupParticipantsUpdate(m.chat, [kickJid], 'remove');
            warns[senderJid].count = 0;
            db.updateGroup(m.chat, { warns });
        } catch (e) {
            console.error('[ANTI-VIRTEX] kick error:', e?.message);
        }
    }
}

// ── Command: .antivirtex on/off/status ────────────────────────────
const handler = async (m, { args }) => {
    const from = m.chat;
    const mode = (args[0] || '').toLowerCase();
    const grp = db.getGroup(from);
    const current = grp?.settings?.antivirtex || false;

    if (!mode || mode === 'status' || mode === 'cek') {
        return m.reply(
            `╭┈┈⬡「 *ᴀɴᴛɪ ᴠɪʀᴛᴇx* 」\n┃\n` +
            `┃ ✧ ꜱᴛᴀᴛᴜꜱ: ${current ? ' AKTIF' : ' NONAKTIF'}\n┃\n` +
            `┃ ✧ ᴘʀᴏᴅᴜᴄᴛᴍᴇꜱꜱᴀɢᴇ ᴘᴀɴᴊᴀɴɢ  ᴋɪᴄᴋ\n` +
            `┃ ✧ ᴛᴇᴋꜱ >8000 ᴋᴀʀᴀᴋᴛᴇʀ  ᴋɪᴄᴋ\n` +
            `┃ ✧ ᴋᴀʀᴀᴋᴛᴇʀ ᴢᴀʟɢᴏ/ᴜɴɪᴄᴏᴅᴇ ᴀɴᴇʜ  ᴋɪᴄᴋ\n` +
            `┃ ✧ ꜰʟᴏᴏᴅ 5 ᴘᴇꜱᴀɴ/2 ᴅᴇᴛɪᴋ  ᴡᴀʀɴ & ᴋɪᴄᴋ\n` +
            `┃ ✧ ꜱᴇᴍᴜᴀ ᴘᴇꜱᴀɴ ꜱᴇɴᴅᴇʀ ᴅɪʜᴀᴘᴜꜱ ᴏᴛᴏᴍᴀᴛɪꜱ\n┃\n` +
            `┃ ✧ *.ᴀɴᴛɪᴠɪʀᴛᴇx ᴏɴ*  — ᴀᴋᴛɪꜰᴋᴀɴ\n` +
            `┃ ✧ *.ᴀɴᴛɪᴠɪʀᴛᴇx ᴏꜰꜰ* — ɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ\n╰┈┈┈┈┈┈┈┈⬡`
        );
    }
    if (mode === 'on' || mode === 'aktif') {
        if (current) return m.reply('╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ᴀɴᴛɪ ᴠɪʀᴛᴇx ꜱᴜᴅᴀʜ ᴀᴋᴛɪꜰ!\n╰┈┈┈┈┈┈┈┈⬡');
        db.updateGroup(from, { antivirtex: true });
        return m.reply('╭┈┈⬡「 *ᴀɴᴛɪ ᴠɪʀᴛᴇx ᴀᴋᴛɪꜰ* 」\n┃ ✧ ʙᴇʀʜᴀꜱɪʟ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ!\n┃ ✧ _ᴘᴀꜱᴛɪᴋᴀɴ ʙᴏᴛ ꜱᴜᴅᴀʜ ᴊᴀᴅɪ ᴀᴅᴍɪɴ!_\n╰┈┈┈┈┈┈┈┈⬡');
    }
    if (mode === 'off' || mode === 'nonaktif') {
        if (!current) return m.reply('╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ᴀɴᴛɪ ᴠɪʀᴛᴇx ᴍᴇᴍᴀɴɢ ꜱᴜᴅᴀʜ ɴᴏɴᴀᴋᴛɪꜰ!\n╰┈┈┈┈┈┈┈┈⬡');
        db.updateGroup(from, { antivirtex: false });
        return m.reply('╭┈┈⬡「 *ʙᴇʀʜᴀꜱɪʟ* 」\n┃ ✧ ᴀɴᴛɪ ᴠɪʀᴛᴇx ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ!\n╰┈┈┈┈┈┈┈┈⬡');
    }
    return m.reply('╭┈┈⬡「 *ᴇʀʀᴏʀ* 」\n┃ ✧ ɢᴜɴᴀᴋᴀɴ: *.ᴀɴᴛɪᴠɪʀᴛᴇx ᴏɴ/ᴏꜰꜰ/ꜱᴛᴀᴛᴜꜱ*\n╰┈┈┈┈┈┈┈┈⬡');
};
handler.help = ['antivirtex on', 'antivirtex off', 'antivirtex status'];
handler.tags = ['group', 'anti'];
handler.command = /^antivirtex$/i;
handler.group = true;
handler.admin = true;

// ── Passive: scan tiap pesan grup ─────────────────────────────────
handler.onText = async (m, { conn }) => {
    if (!m.isGroup) return false;
    if (!m.message) return false;
    if (m.fromMe) return false;
    if (m.message?.reactionMessage) return false;
    if (m.message?.protocolMessage) return false;
    if (m.chat === 'status@broadcast') return false;

    const grp = db.getGroup(m.chat);
    if (!grp?.settings?.antivirtex) return false;

    const senderJid = m.sender || m.key?.participant || m.key?.remoteJid || '';
    if (!senderJid) return false;

    if (await isSenderAdminInGroup(conn, m.chat, senderJid)) return false;

    const botAdmin = await resolveBotAdmin(conn, m.chat);

    if (isProductVirtex(m)) { await kickAndNotify(conn, m, senderJid, 'Product Message Virtex (deskripsi panjang)', botAdmin); return false; }
    if (isLongTextVirtex(m)) { await kickAndNotify(conn, m, senderJid, 'Teks ekstrem panjang (>8000 karakter)', botAdmin); return false; }
    if (isZalgoVirtex(m)) { await kickAndNotify(conn, m, senderJid, 'Karakter unicode/zalgo berlebihan', botAdmin); return false; }
    if (isDangerousType(m)) { await kickAndNotify(conn, m, senderJid, `Tipe pesan berbahaya: ${m.type}`, botAdmin); return false; }

    if (isCommandMessage(m)) return false;

    const key = `${m.chat}:${senderJid}`;
    const now = Date.now();
    if (!_floodMap.has(key)) _floodMap.set(key, { timestamps: [], lastAt: now });
    const data = _floodMap.get(key);
    data.lastAt = now;
    data.timestamps = data.timestamps.filter((t) => now - t < CFG.FLOOD_WINDOW);
    data.timestamps.push(now);

    if (data.timestamps.length >= CFG.FLOOD_MAX) {
        data.timestamps = [];
        await handleFlood(conn, m, senderJid, botAdmin);
    }
    return false;
};

export default handler;
