'use strict';
import { isSelfModeOn, setSelfMode } from '../../System/selfmode.js';
const handler = async (m, { text }) => {
    const arg = (text || '').trim().toLowerCase();
    if (!arg) {
        const status = isSelfModeOn() ? 'ON' : 'OFF';
        await m.reply(`🔒 Self mode saat ini: *${status}*\n\nPakai: .selfmode on / .selfmode off`);
        return;
    }
    if (['on', '1', 'true', 'aktif'].includes(arg)) {
        setSelfMode(true);
        await m.reply('🔒 Self mode diaktifkan. Cuma main owner & owner yang bisa pakai bot sekarang.');
        return;
    }
    if (['off', '0', 'false', 'nonaktif'].includes(arg)) {
        setSelfMode(false);
        await m.reply('🔓 Self mode dimatikan. Semua orang bisa pakai bot lagi.');
        return;
    }
    await m.reply('Format salah. Pakai: .selfmode on / .selfmode off');
};
handler.help = ['selfmode <on/off>'];
handler.tags = ['owner'];
handler.command = /^(selfmode|self)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
