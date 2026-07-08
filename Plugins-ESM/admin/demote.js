'use strict';
import { resolveTarget, findParticipant } from '../../Library/resolve.js';
const handler = async (m, { conn, args, participants }) => {
    let list = participants;
    if (!list) {
        try {
            list = (await conn.groupMetadata(m.chat)).participants;
        }
        catch {
            await m.reply('Gagal ambil data member grup.');
            return;
        }
    }
    const resolved = resolveTarget(m, args, { minDigits: 8 });
    if (!resolved.raw) {
        await m.reply('Reply, tag (@user), atau kasih nomor admin yang mau diturunkan.');
        return;
    }
    const targetP = findParticipant(list, resolved.raw);
    if (!targetP) {
        await m.reply('Member tidak ditemukan di grup ini.');
        return;
    }
    try {
        await conn.groupParticipantsUpdate(m.chat, [targetP.id], 'demote');
        await m.reply({ text: `✅ @${targetP.id.split('@')[0]} diturunkan jadi member biasa.`, mentions: [targetP.id] });
    }
    catch (err) {
        await m.reply(`❌ Gagal demote: ${err?.message || err}`);
    }
};
handler.help = ['demote @user'];
handler.tags = ['admin'];
handler.command = /^(demote|turunkanadmin)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;
export default handler;
