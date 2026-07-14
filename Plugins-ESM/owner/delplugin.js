'use strict';
import pluginManager from '../_pluginmanager.js';

const handler = async (m, { text }) => {
    const name = (text || '').trim();
    if (!name) {
        await m.reply(
            `╭╌╌⬡「  *ᴅᴇʟ ᴘʟᴜɢɪɴ* 」\n┃\n` +
            `┃ ◦ Format : *.delplugin <nama>*\n` +
            `┃ ◦ Contoh : *.delplugin backup*\n` +
            `┃ ◦ Contoh : *.delplugin owner/backup*\n┃\n` +
            `╰╌╌⬡`
        );
        return;
    }
    const result = pluginManager.deletePlugin(name);
    if (!result.success) {
        await m.reply(`╭╌╌⬡「  *ᴅᴇʟ ᴘʟᴜɢɪɴ* 」\n┃\n┃  ${result.error}\n┃\n╰╌╌⬡`);
        return;
    }
    await m.reply(
        `╭╌╌⬡「  *ᴅᴇʟ ᴘʟᴜɢɪɴ* 」\n┃\n` +
        `┃  Berhasil dihapus & langsung nonaktif.\n┃\n` +
        `┃  ${result.rel}.js\n┃\n` +
        `╰╌╌⬡`
    );
};
handler.help = ['delplugin <nama>'];
handler.tags = ['owner'];
handler.command = /^(delplugin|deleteplugin)$/i;
handler.mainOwner = true;
handler.ignoreRateLimit = true;
export default handler;
