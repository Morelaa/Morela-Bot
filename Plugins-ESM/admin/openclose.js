'use strict';

const handler = async (m, { conn, command }) => {
    const from = m.chat;
    if (!from || !from.endsWith('@g.us')) {
        return m.reply(' Command ini hanya bisa digunakan di dalam grup.');
    }

    if (command === 'open') {
        try {
            await conn.groupSettingUpdate(from, 'not_announcement');
            return m.reply(' *Grup Dibuka*\n\n Semua anggota kini dapat mengirim pesan.');
        } catch {
            return m.reply(' *Grup Dibuka*\n\n Gagal membuka grup!\nPastikan bot memiliki hak admin.');
        }
    }

    if (command === 'close') {
        try {
            await conn.groupSettingUpdate(from, 'announcement');
            return m.reply(' *Grup Ditutup*\n\n Hanya admin yang dapat mengirim pesan sekarang.');
        } catch {
            return m.reply(' *Grup Ditutup*\n\n Gagal menutup grup!\nPastikan bot memiliki hak admin.');
        }
    }
};
handler.help = ['open', 'close'];
handler.tags = ['group'];
handler.command = /^(open|close)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
