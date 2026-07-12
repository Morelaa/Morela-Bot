'use strict';
import axios from 'axios';
import fs from 'fs';
import config from '../../config.js';
import { sendStickerPack } from '../../Library/stickerPackHelper.js';

const MAX_STICKERS = 30;

class StickerAPI {
    async search(query, page = 1) {
        const res = await axios.post(
            'https://getstickerpack.com/api/v1/stickerdb/search',
            { query, page },
            { timeout: 10000 }
        );
        return (res.data.data || []).map((v) => ({
            name: v.title,
            slug: v.slug,
            download: v.download_counter,
        }));
    }

    async detail(slug) {
        const res = await axios.get(
            `https://getstickerpack.com/api/v1/stickerdb/stickers/${slug}`,
            { timeout: 10000 }
        );
        const d = res.data.data;
        return {
            title: d.title,
            stickers: (d.images || []).map((v) => ({
                image: `https://s3.getstickerpack.com/${v.url}`,
                animated: v.is_animated !== 0,
            })),
        };
    }
}

const api = new StickerAPI();

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return Buffer.from(res.data);
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (command === 'stickersearch_pick') {
        const slug = text?.trim();
        if (!slug) { await m.reply('❌ Slug tidak valid'); return; }

        await m.reply('⏳ Memproses...');

        try {
            const detail = await api.detail(slug);
            if (!detail.stickers.length) { await m.reply('❌ Pack ini kosong'); return; }

            const packname = config.stickerPackName || detail.title || config.botName;
            const hasStatic = detail.stickers.some(s => !s.animated);
            const pool = (hasStatic ? detail.stickers.filter(s => !s.animated) : detail.stickers)
                .slice(0, MAX_STICKERS);

            await m.reply(`⏳ Mengunduh *${packname}*...\n📦 ${pool.length} stiker\n_Mohon tunggu sebentar_`);

            const stickerBuffers = [];
            for (const s of pool) {
                try {
                    stickerBuffers.push(await downloadBuffer(s.image));
                } catch {}
                await new Promise(r => setTimeout(r, 200));
            }

            if (!stickerBuffers.length) { await m.reply('❌ Gagal mengunduh stiker'); return; }

            await sendStickerPack(
                conn, m.chat,
                stickerBuffers.map(buf => ({ buffer: buf, ext: 'webp', mimetype: 'image/webp', emojis: ['❤'] })),
                { name: packname, publisher: config.botName, description: `Sticker pack: ${packname}`, quoted: m.raw }
            );

        } catch (e) {
            await m.reply(`❌ Gagal: ${e.message}`);
        }
        return;
    }

    if (!text) {
        await m.reply(
            `╭──「 🎴 *Sticker Pack Search* 」\n` +
            `│\n` +
            `│  Cari & kirim sticker pack!\n` +
            `│\n` +
            `│  📌 *Contoh:*\n` +
            `│  ${usedPrefix}${command} anime\n` +
            `│  ${usedPrefix}${command} blue archive\n` +
            `│  ${usedPrefix}${command} cat meme\n` +
            `│\n` +
            `│  ✨ Dikirim sebagai pack WA asli!\n` +
            `╰─────────────────────`
        );
        return;
    }

    try {
        const packs = await api.search(text);

        if (!packs.length) { await m.reply(`❌ Sticker pack *"${text}"* tidak ditemukan`); return; }

        const rows = packs.slice(0, 10).map((p) => ({
            title: p.name.length > 40 ? p.name.slice(0, 37) + '...' : p.name,
            description: `📥 ${Number(p.download).toLocaleString('id-ID')}x download`,
            id: `.stickersearch_pick ${p.slug}`,
        }));

        const menuBuf = fs.existsSync(config.menuImage) ? fs.readFileSync(config.menuImage) : null;
        const q = text.charAt(0).toUpperCase() + text.slice(1);

        const footer =
            `╭──「 🎴 *Sticker Pack* 」\n` +
            `│\n` +
            `│  🔍 Query » *${q}*\n` +
            `│  📦 Ketemu » *${packs.length} pack*\n` +
            `│\n` +
            `│  ✨ Pilih → auto kirim sebagai pack!\n` +
            `╰─────────────────────\n` +
            `_Pilih pack di bawah ini_ 👇\n` +
            `© ${config.botName}`;

        const { Button } = await import('../../Library/MessageBuilder.js');
        const spBtn = new Button(conn);
        if (menuBuf) spBtn.setImage(menuBuf);
        spBtn.setBody(footer);
        spBtn.setFooter('© ' + config.botName);
        spBtn.addSelection('🎴 Pilih Sticker Pack');
        spBtn.makeSection(`Hasil: ${text.length > 22 ? text.slice(0, 20) + '..' : text}`);
        rows.forEach((r) => spBtn.makeRow('', r.title, r.description, r.id));
        await spBtn.send(m.chat, { quoted: m.raw });

    } catch (e) {
        await m.reply(`❌ Error: ${e.message}`);
    }
};

handler.help = ['stickersearch <query>', 'ssearch <query>'];
handler.tags = ['sticker'];
handler.command = /^(stickersearch|ssearch|stickersearch_pick)$/i;

export default handler;