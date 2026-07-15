'use strict';
const handler = async (m, { text }) => {
    await m.reply(
        `╭┈┈⬡「 *ᴛᴇꜱᴛ ᴘʟᴜɢɪɴ ʙᴇᴋᴇʀᴊᴀ!* 」\n` +
        `┃ ✧ ᴛᴇxᴛ : ${text || 'ᴋᴏꜱᴏɴɢ'}\n` +
        `╰┈┈┈┈┈┈┈┈⬡`
    );
};
handler.command = /^(test|tes)$/i;
handler.tags = ['info'];
handler.help = ['test — cek apakah command & branded reply jalan normal'];
export default handler;
