'use strict';
import { checkPremiumUser } from '../../Core/permissions.js';

function unwrapViewOnce(message) {
    return (
        message?.viewOnceMessageV2?.message ||
        message?.viewOnceMessageV2Extension?.message ||
        message?.viewOnceMessage?.message ||
        message?.ephemeralMessage?.message ||
        message
    );
}

const handler = async (m, { conn, isOwner, isAdmin, args }) => {
    // Validasi: Mengecek apakah user mengetik "makasih/mekasih" diikuti kata "sayang"
    const cmd = m.command.toLowerCase();
    if ((cmd === 'makasih' || cmd === 'mekasih') && args[0]?.toLowerCase() !== 'sayang') {
        return; // Abaikan jika user hanya mengetik makasih tanpa kata sayang
    }

    // 1. Validasi apakah pesan di-reply
    if (!m.quoted || !m.quoted.message) return;

    const unwrapped = unwrapViewOnce(m.quoted.message);
    const media = unwrapped?.imageMessage || unwrapped?.videoMessage || unwrapped?.audioMessage || unwrapped?.documentMessage;
    
    // 2. Validasi apakah itu berisi media
    if (!media) return;

    // 3. Cek akses (Owner, Admin, atau Premium)
    const isPremium = checkPremiumUser(m.sender);
    const bisaAkses = isOwner || isPremium || isAdmin;
    if (!bisaAkses) return;

    try {
        // 4. Gunakan objek key bawaan m.quoted agar aman
        const target = {
            key: m.quoted.key,
            message: unwrapped,
        };

        // 5. Download media
        const buffer = await conn.downloadMedia(target);
        if (!buffer || !buffer.length) return;

        const mime = media.mimetype || '';
        let type = 'document';
        if (mime.startsWith('image/')) type = 'image';
        else if (mime.startsWith('video/')) type = 'video';
        else if (mime.startsWith('audio/')) type = 'audio';

        // 6. Ambil info pengirim view-once
        const senderInfo = m.quoted.sender || 'unknown';
        const senderNumber = senderInfo.split('@')[0];
        const caption = `📩 *View-once berhasil dibuka!*\n` +
                        (media.caption ? `📝 Caption asli: ${media.caption}\n` : '') +
                        `👤 Dari: ${senderNumber}\n` +
                        `🕐 ${new Date().toLocaleString()}`;

        // 7. Tentukan nomor tujuan (nomor bot itu sendiri)
        const botJid = conn.user.id || conn.user.jid;
        const botNumber = botJid ? botJid.split(':')[0] : conn.user?.number || '0';
        const botChatId = botNumber + '@s.whatsapp.net';

        // 8. Kirim media tersebut ke chat bot sendiri
        await conn.sendMessage(botChatId, {
            [type]: buffer,
            mimetype: mime,
            caption: caption,
        });
        
        // Hapus notifikasi m.reply, bot akan otomatis diam saja setelah berhasil

    } catch (e) {
        console.error('[RVO]', e);
    }
};

// Menggunakan RegExp yang mendeteksi baik "makasih" maupun "mekasih"
handler.command = /^(makasih|mekasih|makasihsayang|mekasihsayang)$/i;
handler.tags = ['tools'];
handler.help = ['makasih sayang (reply view-once)'];

export default handler;