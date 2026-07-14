'use strict';
import config from '../../config.js';
import db from '../../Database/db.js';
import usagelimit from '../../Database/usagelimit.js';

const handler = async (m, { conn, text }) => {
    const botName = config.botName;
    const arg = (text || '').trim().toLowerCase();
    if (arg === 'all') {
        const changed = usagelimit.resetAllUsage();
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
        await m.reply(
            `╭╌╌⬡「  *ʀᴇꜱᴇᴛ ʟɪᴍɪᴛ ᴀʟʟ* 」\n┃\n` +
            `┃ ◦  Berhasil reset limit *${changed}* data user\n┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        );
        return;
    }
    if (arg === 'reply') {
        if (!m.quoted) {
            await m.reply(
                `╭╌╌⬡「  *ᴄᴀʀᴀ ʀᴇꜱᴇᴛʟɪᴍɪᴛ* 」\n┃\n` +
                `┃ ◦ Reply pesan user yang mau direset\n` +
                `┃ ◦ lalu ketik *.resetlimit reply*\n┃\n` +
                `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
            );
            return;
        }
        const targetJid = m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid;
        if (!targetJid) {
            await m.reply(' Gagal mendapatkan target dari pesan yang direply.');
            return;
        }
        const ok = usagelimit.resetUsage(targetJid);
        const nomor = targetJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        const nama = db.getUser(targetJid)?.name || nomor;
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
        await m.reply(
            `╭╌╌⬡「  *ʀᴇꜱᴇᴛ ʟɪᴍɪᴛ* 」\n┃\n` +
            `┃ ◦ ${ok ? ' Berhasil reset' : ' Belum ada data'} limit *${nama}*\n┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        );
        return;
    }
    await m.reply(
        `╭╌╌⬡「  *ᴄᴀʀᴀ ʀᴇꜱᴇᴛʟɪᴍɪᴛ* 」\n┃\n` +
        `┃ ◦ *.resetlimit reply* — reply pesan user\n` +
        `┃ ◦ *.resetlimit all* — reset semua user\n┃\n` +
        `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
    );
};
handler.help = ['resetlimit reply', 'resetlimit all'];
handler.tags = ['owner'];
handler.noLimit = true;
handler.command = /^(resetlimit)$/i;
handler.owner = true;
export default handler;
