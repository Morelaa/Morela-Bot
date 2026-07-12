'use strict';
import { getOwnerStyle, setOwnerStyle } from '../../System/ownerstyle.js';
const handler = async (m, { text }) => {
    const arg = (text || '').trim().toLowerCase();
    if (!arg) {
        const current = getOwnerStyle();
        await m.reply(`🎨 Owner style saat ini: *${current}*\n\n` +
            `v1 -> contact card (vCard), gaya kartu kontak simpel\n` +
            `v2 -> interactive booking card (tombol/native flow), gaya kartu profile\n\n` +
            `Pakai: .setownerstyle v1 / .setownerstyle v2`);
        return;
    }
    if (arg !== 'v1' && arg !== 'v2') {
        await m.reply('Format salah. Pakai: .setownerstyle v1 / .setownerstyle v2');
        return;
    }
    const updated = setOwnerStyle(arg);
    await m.reply(`✅ Owner style diganti ke *${updated}*.`);
};
handler.help = ['setownerstyle <v1/v2>'];
handler.tags = ['owner'];
handler.command = /^(setownerstyle|ownerstyle)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;