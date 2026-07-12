'use strict';
import { getReplyStyle, setReplyStyle } from '../../System/replystyle.js';
const handler = async (m, { text }) => {
    const arg = (text || '').trim().toLowerCase();
    if (!arg) {
        const current = getReplyStyle();
        await m.reply(`🎨 Reply style saat ini: *${current}*\n\n` +
            `v1 -> extendedTextMessage (link preview card, gaya lama)\n` +
            `v2 -> interactiveMessage (viewOnceMessage, gaya button/card baru)\n\n` +
            `Pakai: .setreplystyle v1 / .setreplystyle v2`);
        return;
    }
    if (arg !== 'v1' && arg !== 'v2') {
        await m.reply('Format salah. Pakai: .setreplystyle v1 / .setreplystyle v2');
        return;
    }
    const updated = setReplyStyle(arg);
    await m.reply(`✅ Reply style diganti ke *${updated}*.`);
};
handler.help = ['setreplystyle <v1/v2>'];
handler.tags = ['owner'];
handler.command = /^(setreplystyle|setreply)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
