'use strict';
import db from '../../Database/db.js';
import { resolveTarget, normNum } from '../../Library/resolve.js';

const handler = async (m, { command, args }) => {
    if (command === 'banlist') {
        const usersRaw = db.getAllUsersRaw();
        const banned = Object.values(usersRaw).filter((u) => u.banned === 1);
        if (!banned.length) {
            return m.reply(' *BAN LIST*\n\n Tidak ada user yang di-ban saat ini.');
        }
        const list = banned.map((u, i) => {
            const num = u.phone || u.jid?.replace('@s.whatsapp.net', '') || '???';
            const nama = u.name || db.getPushName(num) || db.getPushName(u.jid || '') || 'User';
            return `│ ${i + 1}. +${num} — ${nama}`;
        }).join('\n');
        return m.reply(
            ` *BAN LIST*\n\n╭─────────────────────\n${list}\n╰─────────────────────\n\n` +
            ` Total banned: *${banned.length} user*`
        );
    }

    const resolved = resolveTarget(m, args, { minDigits: 10 });
    const targetJid = resolved.jid;

    if (!targetJid) {
        const isBan = command === 'ban';
        return m.reply(
            `${isBan ? '' : ''} *${isBan ? 'Ban' : 'Unban'} User*\n\n` +
            ` *Cara pakai:*\n╭─────────────────────\n` +
            `│ .${command} 628xxx\n│ .${command} @mention\n│ Reply pesan + .${command}\n╰─────────────────────`
        );
    }

    const targetNum = normNum(targetJid);
    if (m.sender && targetJid === m.sender) {
        return m.reply(' Tidak bisa ban diri sendiri!');
    }

    const userData = db.getUser(targetJid);
    const namaTarget = userData?.name || db.getPushName(targetNum) || db.getPushName(targetJid) || 'User';
    const sudahBanned = userData?.banned === 1;

    if (command === 'ban') {
        if (sudahBanned) {
            return m.reply(
                ` *Sudah Di-ban!*\n\n Nomor : +${targetNum}\n Nama  : ${namaTarget}\n\n` +
                `User ini sudah di-ban sebelumnya.\nGunakan *.unban* untuk mencabut ban.`
            );
        }
        db.setBanned(targetJid, true);
        return m.reply(
            ` *User Di-ban!*\n\n╭─────────────────────\n│  Nomor  : +${targetNum}\n│  Nama   : ${namaTarget}\n│  Status : Banned\n╰─────────────────────\n\n` +
            `User tidak bisa menggunakan bot lagi.\nGunakan *.unban* untuk mencabut.`
        );
    }

    if (command === 'unban') {
        if (!sudahBanned) {
            return m.reply(` *Tidak Di-ban!*\n\n Nomor : +${targetNum}\n Nama  : ${namaTarget}\n\nUser ini tidak sedang di-ban.`);
        }
        db.setBanned(targetJid, false);
        return m.reply(
            ` *User Di-unban!*\n\n╭─────────────────────\n│  Nomor  : +${targetNum}\n│  Nama   : ${namaTarget}\n│  Status : Aktif kembali\n╰─────────────────────\n\n` +
            `User sudah bisa menggunakan bot lagi.`
        );
    }
};
handler.help = ['ban <nomor/reply/mention>', 'unban <nomor/reply/mention>', 'banlist'];
handler.tags = ['owner'];
handler.command = /^(ban|unban|banlist)$/i;
handler.owner = true;

export default handler;
