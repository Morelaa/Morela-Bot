'use strict';
import db from '../../Database/sqlite.js';
import { sleep } from '../../Library/utils.js';
const handler = async (m, { conn, text }) => {
    if (!text) {
        await m.reply('Isi pesan broadcast-nya dong.\nContoh: .broadcast Ada maintenance jam 10 malam ini.');
        return;
    }
    const users = db.prepare('SELECT jid FROM users').all();
    await m.reply(`📢 Mengirim broadcast ke ${users.length} user...`);
    let success = 0;
    for (const { jid } of users) {
        try {
            await conn.sendMessage(jid, { text: `📢 *Broadcast*\n\n${text}` });
            success++;
        }
        catch {
        }
        await sleep(300);
    }
    await m.reply(`✅ Broadcast selesai. Terkirim ke ${success}/${users.length} user.`);
};
handler.help = ['broadcast <pesan>'];
handler.tags = ['owner'];
handler.command = /^(broadcast|bc)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
