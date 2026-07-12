'use strict';
const handler = async (m, { text }) => {
    await m.reply(`✅ Test plugin bekerja!\n\nText: ${text || 'kosong'}`);
};
handler.command = /^(test|tes)$/i;
handler.tags = ['info'];
handler.help = ['test — cek apakah command & branded reply jalan normal'];
export default handler;
