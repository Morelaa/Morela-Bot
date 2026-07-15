'use strict';
import { get as kvGet } from '../../Database/kvstore.js';
import store from '../../Core/store.js';
const handler = async (m, { conn, command, args }) => {
    if (!m.quoted) {
        return m.reply(`╭┈┈⬡「 *ʜᴀʀᴜꜱ ʀᴇᴘʟʏ ᴘᴇꜱᴀɴ ᴅᴜʟᴜ!* 」\n┃\n┃ ✧ ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:\n┃ ✧ ʀᴇᴘʟʏ ᴘᴇꜱᴀɴ  ᴋᴇᴛɪᴋ *.ᴄʀᴍ*\n┃ ✧ ʀᴇᴘʟʏ ᴘᴇꜱᴀɴ  ᴋᴇᴛɪᴋ *.ᴄʀᴍ <ᴊɪᴅ>* (ᴋɪʀɪᴍ ᴋᴇ ᴄʜᴀᴛ ʟᴀɪɴ)\n┃ ✧ ʀᴇᴘʟʏ ᴘᴇꜱᴀɴ  ᴋᴇᴛɪᴋ *.ʀᴀᴡᴊꜱᴏɴ* (ʟɪʜᴀᴛ ʀᴀᴡ ᴊꜱᴏɴ)\n┃\n┃ ✧ _ᴍᴇɴᴅᴜᴋᴜɴɢ: ʙᴜᴛᴛᴏɴ, ᴍᴇᴅɪᴀ, ꜱᴛɪᴄᴋᴇʀ, ᴛᴇxᴛ, ᴅʟʟ_\n╰┈┈┈┈┈┈┈┈⬡`);
    }
    const quotedId = m.quoted?.key?.id;
    const quotedChat = m.quoted?.key?.remoteJid || m.chat;
    let rawQuotedMessage = null;
    if (quotedId) {
        try {
            rawQuotedMessage = kvGet(`crm_cache:${quotedId}`, null);
        }
        catch (_) {  }
    }
    if (!rawQuotedMessage && quotedId) {
        try {
            const cached = store.getMessage(quotedChat, quotedId);
            if (cached?.message && Object.keys(cached.message).length) {
                rawQuotedMessage = cached.message;
            }
        }
        catch (_) {  }
    }
    if (!rawQuotedMessage) {
        rawQuotedMessage = m.quoted.message;
    }
    if (!rawQuotedMessage) {
        return m.reply(`╭┈┈⬡「 *ᴛɪᴅᴀᴋ ᴅᴀᴘᴀᴛ ᴍᴇɴɢᴀᴍʙɪʟ ʀᴀᴡ ᴍᴇꜱꜱᴀɢᴇ.* 」\n┃ ✧ ᴄᴏʙᴀ ɢᴜɴᴀᴋᴀɴ *.ʀᴀᴡᴊꜱᴏɴ* ᴜɴᴛᴜᴋ ᴍᴇʟɪʜᴀᴛ ꜱᴛʀᴜᴋᴛᴜʀ ǫᴜᴏᴛᴇᴅ.\n╰┈┈┈┈┈┈┈┈⬡`);
    }
    if (command === 'rawjson' || command === 'rawijson') {
        const json = JSON.stringify(rawQuotedMessage, null, 2);
        if (json.length > 3500) {
            await conn.sendMessage(m.chat, {
                document: Buffer.from(json),
                mimetype: 'application/json',
                fileName: `${Date.now()}.json`,
                caption: ` *Raw Quoted Message JSON*\n\nmtype: \`${m.quoted?.type ?? 'unknown'}\`\nsize: ${json.length} chars`,
            }, { quoted: m.raw });
        }
        else {
            await m.reply(`╭┈┈⬡「 *ʀᴀᴡ ǫᴜᴏᴛᴇᴅ ᴍᴇꜱꜱᴀɢᴇ* 」\n┃ ✧ ᴍᴛʏᴘᴇ: \`${m.quoted?.type ?? 'unknown'}\`\n╰┈┈┈┈┈┈┈┈⬡\n\n\`\`\`json\n${json}\n\`\`\``);
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
            return m.reply(`╭┈┈⬡「 *ᴊɪᴅ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ: \`${argJid}\`* 」\n┃\n┃ ✧ ᴄᴏɴᴛᴏʜ:\n┃ ✧ \`628xxx\`  ɴᴏᴍᴏʀ ᴡᴀ\n┃ ✧ \`120363xxx@ɢ.ᴜꜱ\`  ɢʀᴜᴘ\n╰┈┈┈┈┈┈┈┈⬡`);
        }
    }
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
            await m.reply(`╭┈┈⬡「 *ʙᴇʀʜᴀꜱɪʟ ʀᴇʟᴀʏ ᴘᴇꜱᴀɴ!* 」\n┃\n┃ ✧ ᴛɪᴘᴇ: \`${m.quoted?.type ?? 'unknown'}\`\n┃ ✧ ᴛᴜᴊᴜᴀɴ: \`${targetJid}\`\n╰┈┈┈┈┈┈┈┈⬡`);
        }
    }
    catch (_err1) {
        try {
            const fallbackOptions = isInteractive ? { additionalNodes: interactiveNodes } : {};
            await conn.relayMessage(targetJid, rawQuotedMessage, fallbackOptions);
            if (targetJid !== m.chat) {
                await m.reply(`╭┈┈⬡「 *ʀᴇʟᴀʏ ʙᴇʀʜᴀꜱɪʟ* 」\n┃ ✧ ᴛᴜᴊᴜᴀɴ: \`${targetJid}\`\n╰┈┈┈┈┈┈┈┈⬡`);
            }
        }
        catch (err2) {
            await m.reply(`╭┈┈⬡「 *ʀᴇʟᴀʏ ɢᴀɢᴀʟ!* 」\n┃\n┃ ✧ ᴇʀʀᴏʀ: ${err2?.message || err2}\n┃\n┃ ✧ ᴄᴏʙᴀ *.ʀᴀᴡᴊꜱᴏɴ* ᴜɴᴛᴜᴋ ʟɪʜᴀᴛ ꜱᴛʀᴜᴋᴛᴜʀ ᴘᴇꜱᴀɴ,\n┃ ✧ ʟᴀʟᴜ ʀᴇʟᴀʏ ᴍᴀɴᴜᴀʟ ᴠɪᴀ \`>\` ᴇᴠᴀʟ.\n╰┈┈┈┈┈┈┈┈⬡`);
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
        await m.reply(`╭┈┈⬡「 *ʀᴇʟᴀʏ ꜱᴜᴋꜱᴇꜱ ᴛᴀᴘɪ ɢᴀɢᴀʟ ᴋɪʀɪᴍ ᴊꜱᴏɴ:* 」\n┃ ✧ ${jsonErr?.message || jsonErr}\n╰┈┈┈┈┈┈┈┈⬡`);
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
