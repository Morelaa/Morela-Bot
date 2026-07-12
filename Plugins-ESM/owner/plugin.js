'use strict';
import config from '../../config.js';
import pluginManager from '../_pluginmanager.js';
const VALID_FOLDERS = config.pluginDirs;
const DEFAULT_FOLDER = 'tools';
function usageMessage() {
    return (
        `╭╌╌⬡「 📝 *PLUGIN CREATOR* 」\n` +
        `┃ Format:\n` +
        `┃ .plugin <nama>\n` +
        `┃ <kode plugin di baris berikutnya>\n` +
        `┃\n` +
        `┃ 📌 Tanpa folder (masuk ke "${DEFAULT_FOLDER}"):\n` +
        `┃ .plugin namafile\n` +
        `┃\n` +
        `┃ 📌 Dengan folder:\n` +
        `┃ .plugin owner/namafile\n` +
        `┃\n` +
        `┃ 📂 Folder yang ada:\n` +
        `┃ ${VALID_FOLDERS.map((f) => `\`${f}\``).join(', ')}\n` +
        `┃\n` +
        `┃ Plugin di sini pakai format RegExp buat command, contoh:\n` +
        `┃ handler.command = /^halo$/i;\n` +
        `╰╌╌⬡`
    );
}
const handler = async (m) => {
    const raw = (m.body || '').trim();
    const newlineIdx = raw.indexOf('\n');
    if (newlineIdx === -1) {
        await m.reply(usageMessage());
        return;
    }
    const firstLine = raw.slice(0, newlineIdx).trim();
    const code = raw.slice(newlineIdx + 1);
    const parts = firstLine.split(/\s+/).filter(Boolean);
    const rawName = parts[parts.length - 1];
    if (!rawName || parts.length < 2) {
        await m.reply(usageMessage());
        return;
    }
    if (!/^[a-zA-Z0-9_\-/]+$/.test(rawName)) {
        await m.reply(
            `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
            `┃ ❌ Nama file cuma boleh huruf, angka, "-", "_", dan "/".\n` +
            `╰╌╌⬡`
        );
        return;
    }
    let folder = DEFAULT_FOLDER;
    let filename = rawName;
    if (rawName.includes('/')) {
        const splitParts = rawName.split('/');
        if (splitParts.length > 2) {
            await m.reply(
                `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
                `┃ ❌ Maksimal 1 level folder, contoh: tools/namafile.\n` +
                `╰╌╌⬡`
            );
            return;
        }
        [folder, filename] = splitParts;
        folder = folder.toLowerCase();
        if (!VALID_FOLDERS.includes(folder)) {
            await m.reply(
                `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
                `┃ ❌ Folder "${folder}" gak ada.\n` +
                `┃ Folder yang ada: ${VALID_FOLDERS.map((f) => `\`${f}\``).join(', ')}\n` +
                `╰╌╌⬡`
            );
            return;
        }
    }
    if (!filename || !filename.trim()) {
        await m.reply(
            `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
            `┃ ❌ Nama file kosong.\n` +
            `╰╌╌⬡`
        );
        return;
    }
    if (!code || code.trim().length < 10) {
        await m.reply(
            `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
            `┃ ❌ Kode terlalu pendek/kosong.\n` +
            `╰╌╌⬡`
        );
        return;
    }
    const pluginRelPath = `${folder}/${filename}`;
    const result = await pluginManager.addPlugin(pluginRelPath, code);
    if (result.success) {
        await m.reply(
            `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
            `┃ ✅ Berhasil ditambahkan & langsung aktif.\n` +
            `┃\n` +
            `┃ 📄 ${pluginRelPath}.js\n` +
            `┃ 📂 ${folder}\n` +
            `┃ 🔤 command: ${result.command}\n` +
            `╰╌╌⬡`
        );
    }
    else {
        await m.reply(
            `╭╌╌⬡「 📝 *PLUGIN* 」\n` +
            `┃ ❌ Gagal, plugin lama (kalau ada) dipertahankan.\n` +
            `┃\n` +
            `┃ ${result.error}\n` +
            `╰╌╌⬡`
        );
    }
};
handler.help = ['plugin <folder/nama> (+ kode di baris berikutnya)'];
handler.tags = ['owner'];
handler.command = /^plugin$/i;
handler.mainOwner = true;
handler.ignoreRateLimit = true;
export default handler;
