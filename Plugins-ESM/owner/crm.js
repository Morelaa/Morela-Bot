'use strict';
import { get as kvGet } from '../../Database/kvstore.js';
import store from '../../Core/store.js';

const handler = async (m, { conn, command, args }) => {
    if (!m.quoted) {
        return m.reply(
            `❌ *Harus reply pesan dulu!*\n\n` +
            `Cara pakai:\n` +
            `• Reply pesan → ketik *.crm*\n` +
            `• Reply pesan → ketik *.crm <jid>* (kirim ke chat lain)\n` +
            `• Reply pesan → ketik *.rawjson* (lihat raw JSON)\n\n` +
            `_Mendukung: button, media, sticker, text, dll_`
        );
    }

    const quotedId = m.quoted?.key?.id;
    const quotedChat = m.quoted?.key?.remoteJid || m.chat;

    // Lapis 1: cache internal untuk carousel/button yang dikirim MessageBuilder
    // sendiri (kvSet di Carousel.send()/AIRich.send()), karena pesan itu dikirim
    // lewat relayMessage() langsung jadi gak lewat messages.upsert biasa.
    let rawQuotedMessage = null;
    if (quotedId) {
        try {
            rawQuotedMessage = kvGet(`crm_cache:${quotedId}`, null);
        }
        catch (_) { /* ignore, lanjut ke lapis berikutnya */ }
    }

    // Lapis 2: message store mentah (menangkap SEMUA pesan lewat messages.upsert,
    // termasuk carousel/interactive dari bot lain di grup). Ini yang bikin cards
    // tetap lengkap, beda dengan contextInfo.quotedMessage yang WA potong.
    if (!rawQuotedMessage && quotedId) {
        try {
            const cached = store.getMessage(quotedChat, quotedId);
            if (cached?.message && Object.keys(cached.message).length) {
                rawQuotedMessage = cached.message;
            }
        }
        catch (_) { /* ignore, lanjut ke fallback */ }
    }

    // Lapis 3 (fallback terakhir): contextInfo.quotedMessage bawaan WA — bisa
    // kepotong untuk carouselMessage/tipe interaktif tertentu.
    if (!rawQuotedMessage) {
        rawQuotedMessage = m.quoted.message;
    }

    if (!rawQuotedMessage) {
        return m.reply(
            `❌ Tidak dapat mengambil raw message.\n` +
            `Coba gunakan *.rawjson* untuk melihat struktur quoted.`
        );
    }

    if (command === 'rawjson' || command === 'rawijson') {
        const json = JSON.stringify(rawQuotedMessage, null, 2);
        if (json.length > 3500) {
            await conn.sendMessage(m.chat, {
                document: Buffer.from(json),
                mimetype: 'application/json',
                fileName: `${Date.now()}.json`,
                caption: `📄 *Raw Quoted Message JSON*\n\nmtype: \`${m.quoted?.type ?? 'unknown'}\`\nsize: ${json.length} chars`,
            }, { quoted: m.raw });
        }
        else {
            await m.reply(
                `📄 *Raw Quoted Message*\n` +
                `mtype: \`${m.quoted?.type ?? 'unknown'}\`\n\n` +
                `\`\`\`json\n${json}\n\`\`\``
            );
        }
        return;
    }

    let targetJid = m.chat;
    if (args[0]) {
        const argJid = args[0].trim();
        if (/^\d+$/.test(argJid)) {
            targetJid = `${argJid}@s.whatsapp.net`;
        }
        else if (/^\d+@/.test(argJid) || argJid.includes('@g.us') || argJid.includes('@newsletter')) {
            targetJid = argJid;
        }
        else {
            return m.reply(`❌ JID tidak valid: \`${argJid}\`\n\nContoh:\n• \`628xxx\` → nomor WA\n• \`120363xxx@g.us\` → grup`);
        }
    }

    // interactiveMessage (button/list/carousel) wajib disertai stanza
    // biz > interactive > native_flow, kalau tidak WA tidak akan merender-nya
    // di sisi penerima — khusus carouselMessage ini strict, beda dengan
    // buttonsMessage biasa yang masih ditoleransi tanpa node ini.
    const isInteractive = !!rawQuotedMessage?.interactiveMessage;
    const interactiveNodes = [
        {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                },
            ],
        },
    ];

    try {
        const { generateWAMessageFromContent } = await import('@itsliaaa/baileys');
        const generatedMsg = generateWAMessageFromContent(targetJid, rawQuotedMessage, { userJid: conn.user?.id ?? '' });
        const relayOptions = { messageId: generatedMsg.key.id };
        if (isInteractive)
            relayOptions.additionalNodes = interactiveNodes;
        await conn.relayMessage(targetJid, generatedMsg.message, relayOptions);
        if (targetJid !== m.chat) {
            await m.reply(
                `✅ *Berhasil relay pesan!*\n\n` +
                `📨 Tipe: \`${m.quoted?.type ?? 'unknown'}\`\n` +
                `📍 Tujuan: \`${targetJid}\``
            );
        }
    }
    catch (_err1) {
        try {
            const fallbackOptions = isInteractive ? { additionalNodes: interactiveNodes } : {};
            await conn.relayMessage(targetJid, rawQuotedMessage, fallbackOptions);
            if (targetJid !== m.chat) {
                await m.reply(`✅ Relay berhasil\n📍 Tujuan: \`${targetJid}\``);
            }
        }
        catch (err2) {
            await m.reply(
                `❌ *Relay gagal!*\n\n` +
                `Error: ${err2?.message || err2}\n\n` +
                `💡 Coba *.rawjson* untuk lihat struktur pesan,\n` +
                `lalu relay manual via \`>\` eval.`
            );
            return;
        }
    }

    try {
        const json = JSON.stringify(rawQuotedMessage, null, 2);
        const mtype = m.quoted?.type ?? 'unknown';
        await conn.sendMessage(m.chat, {
            document: Buffer.from(json),
            mimetype: 'application/json',
            fileName: `${mtype}.json`,
        }, { quoted: m.raw });
    }
    catch (jsonErr) {
        await m.reply(`⚠️ Relay sukses tapi gagal kirim JSON:\n${jsonErr?.message || jsonErr}`);
    }
};
handler.command = /^(crm|rawjson|rawijson)$/i;
handler.tags = ['owner'];
handler.mainOwner = true;
handler.ignoreRateLimit = true;
handler.help = [
    'crm          — relay exact pesan yang di-reply + kirim file JSON',
    'crm <jid>    — relay ke JID/grup tertentu',
    'rawjson      — lihat raw JSON dari quoted message',
];
export default handler;
