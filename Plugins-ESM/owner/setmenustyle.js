'use strict';
import { getMenuStyle, setMenuStyle } from '../../System/menustyle.js';
const handler = async (m, { text }) => {
    const arg = (text || '').trim().toLowerCase();
    if (!arg) {
        const current = getMenuStyle();
        await m.reply(` Menu style saat ini: *${current}*\n\n` +
            `v1 -> menu interaktif single_select (list kategori di body)\n` +
            `v2 -> menu button v2 (pp pengirim/bot + info di footer)\n\n` +
            `Pakai: .setmenustyle v1 / .setmenustyle v2`);
        return;
    }
    if (arg !== 'v1' && arg !== 'v2') {
        await m.reply('Format salah. Pakai: .setmenustyle v1 / .setmenustyle v2');
        return;
    }
    const updated = setMenuStyle(arg);
    await m.reply(` Menu style diganti ke *${updated}*.`);
};
handler.help = ['setmenustyle <v1/v2>'];
handler.tags = ['owner'];
handler.command = /^(setmenustyle|menustyle)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
