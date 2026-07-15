'use strict';
import { resolveTarget, findParticipant } from '../../Library/resolve.js';
const handler = async (m, { conn, args, participants }) => {
    let list = participants;
    if (!list) {
        try {
            list = (await conn.groupMetadata(m.chat)).participants;
        }
        catch {
            await m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ɢᴀɢᴀʟ ᴀᴍʙɪʟ ᴅᴀᴛᴀ ᴍᴇᴍʙᴇʀ ɢʀᴜᴘ.\n╰┈┈┈┈┈┈┈┈⬡`);
            return;
        }
    }
    const resolved = resolveTarget(m, args, { minDigits: 8 });
    if (!resolved.raw) {
        await m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ʀᴇᴘʟʏ, ᴛᴀɢ (@ᴜꜱᴇʀ), ᴀᴛᴀᴜ ᴋᴀꜱɪʜ ɴᴏᴍᴏʀ ᴍᴇᴍʙᴇʀ ʏᴀɴɢ ᴍᴀᴜ ᴅɪ-ᴋɪᴄᴋ.\n╰┈┈┈┈┈┈┈┈⬡`);
        return;
    }
    let targetP = findParticipant(list, resolved.raw);
    if (!targetP) {
        // List yang di-cache mungkin belum sinkron (misal member baru saja
        // join). Coba ambil ulang data grup langsung dari WhatsApp sebelum
        // benar-benar menyerah.
        try {
            const freshList = (await conn.groupMetadata(m.chat)).participants;
            targetP = findParticipant(freshList, resolved.raw);
        }
        catch { }
    }
    if (!targetP) {
        await m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ᴍᴇᴍʙᴇʀ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ɢʀᴜᴘ ɪɴɪ.\n╰┈┈┈┈┈┈┈┈⬡`);
        return;
    }
    try {
        await conn.groupParticipantsUpdate(m.chat, [targetP.id], 'remove');
        await m.reply({ text: ` Berhasil kick @${targetP.id.split('@')[0]}`, mentions: [targetP.id] });
    }
    catch (err) {
        await m.reply(`╭┈┈⬡「 *ɪɴꜰᴏ* 」\n┃ ✧ ɢᴀɢᴀʟ ᴋɪᴄᴋ: ${err?.message || err}\n╰┈┈┈┈┈┈┈┈⬡`);
    }
};
handler.help = ['kick @user'];
handler.tags = ['admin'];
handler.command = /^(kick|tendang)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;
export default handler;