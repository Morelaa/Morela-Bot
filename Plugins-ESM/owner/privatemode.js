'use strict';
import { isPrivateModeOn, setPrivateMode } from '../../System/privatemode.js';
const handler = async (m, { text }) => {
    const arg = (text || '').trim().toLowerCase();
    if (!arg) {
        const status = isPrivateModeOn() ? 'ON' : 'OFF';
        await m.reply(` Private mode saat ini: *${status}*\n\nPakai: .privatemode on / .privatemode off`);
        return;
    }
    if (['on', '1', 'true', 'aktif'].includes(arg)) {
        setPrivateMode(true);
        await m.reply(' Private mode diaktifkan. Cuma main owner & owner yang bisa chat ke bot lewat DM sekarang.');
        return;
    }
    if (['off', '0', 'false', 'nonaktif'].includes(arg)) {
        setPrivateMode(false);
        await m.reply(' Private mode dimatikan. Semua orang bisa chat ke bot lewat DM lagi.');
        return;
    }
    await m.reply('Format salah. Pakai: .privatemode on / .privatemode off');
};
handler.help = ['privatemode <on/off>'];
handler.tags = ['owner'];
handler.command = /^(privatemode|pmode)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
