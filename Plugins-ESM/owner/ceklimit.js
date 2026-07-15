'use strict';
import config from '../../config.js';
import db from '../../Database/db.js';
import usagelimit from '../../Database/usagelimit.js';

const handler = async (m, { text }) => {
    const botName = config.botName;
    const arg = (text || '').trim().toLowerCase();
    if (arg !== 'all') {
        await m.reply(
            `╭┈┈⬡「 *ᴄᴀʀᴀ ᴄᴇᴋʟɪᴍɪᴛ* 」\n┃\n` +
            `┃ ✧ ꜰᴏʀᴍᴀᴛ : *.ᴄᴇᴋʟɪᴍɪᴛ ᴀʟʟ*\n┃\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n꒰ © ${botName} ꒱`
        );
        return;
    }
    const limit = config.defaultUsageLimit;
    const allUsers = db.getUsers();
    const usageMap = {};
    for (const row of usagelimit.getAllUsageToday())
        usageMap[row.jid] = row.used;
    const jids = new Set([...Object.keys(allUsers), ...Object.keys(usageMap)]);
    if (jids.size === 0) {
        await m.reply(`╭┈┈⬡「 *ᴄᴇᴋ ʟɪᴍɪᴛ ᴀʟʟ* 」\n┃\n┃ ✧ ʙᴇʟᴜᴍ ᴀᴅᴀ ᴅᴀᴛᴀ ʟɪᴍɪᴛ ᴜꜱᴇʀ\n┃\n╰┈┈┈┈┈┈┈┈⬡\n\n꒰ © ${botName} ꒱`);
        return;
    }
    let txt = `╭┈┈⬡「 *ᴄᴇᴋ ʟɪᴍɪᴛ ꜱᴇᴍᴜᴀ ᴜꜱᴇʀ* 」\n┃\n┃ ✧ ᴛᴏᴛᴀʟ : *${jids.size} ᴜꜱᴇʀ*\n┃\n`;
    let i = 1;
    for (const jid of jids) {
        const u = allUsers[jid];
        const isPrem = !!u?.premium;
        const used = usageMap[jid] || 0;
        const nomor = jid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        const nama = u?.name || nomor;
        const pemakaian = isPrem ? ` Unlimited` : `${used}/${limit}`;
        txt += `┃ ✧ *${i}.* ${nama}\n┃ ✧ +${nomor}\n┃ ✧ ${pemakaian}\n┃\n`;
        i++;
    }
    txt += `╰┈┈┈┈┈┈┈┈⬡\n\n꒰ © ${botName} ꒱`;
    await m.reply(txt);
};
handler.help = ['ceklimit all'];
handler.tags = ['owner'];
handler.noLimit = true;
handler.command = /^(ceklimit)$/i;
handler.owner = true;
export default handler;
