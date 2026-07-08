'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickRandom } from '../../Library/utils.js';
import config from '../../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOAL_FILE = path.join(__dirname, '..', '..', 'data', 'soal_tebakgambar.json');
const TIMEOUT_MS = 90_000;

function loadSoal() {
    try {
        return JSON.parse(fs.readFileSync(SOAL_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

const activeSessions = new Map();

const handler = async (m, { conn }) => {
    const existing = activeSessions.get(m.chat);
    if (existing && existing.expireAt > Date.now()) {
        await m.reply(`⚠️ *Game Sedang Berlangsung!*\n\nMasih ada game Tebak Gambar di sini.\nSelesaikan dulu atau ketik *nyerah* untuk menyerah.`);
        return;
    }

    const bank = loadSoal();
    const item = pickRandom(bank);
    if (!item) {
        await m.reply('Bank soal kosong. Pastikan data/soal_tebakgambar.json ada.');
        return;
    }

    try {
        const res = await fetch(item.img);
        const imageBuffer = Buffer.from(await res.arrayBuffer());

        activeSessions.set(m.chat, {
            jawaban: item.jawaban.toUpperCase(),
            lastWrong: {},
            expireAt: Date.now() + TIMEOUT_MS,
        });

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption:
`╭──「 🖼️ *Tebak Gambar* 」
│
│  ⏰ *Waktu*  » 90 detik
│
│  Perhatikan gambar di atas!
│  Kira-kira gambar itu apa?
│
│  Ketik jawabanmu di chat!
│  Atau ketik *nyerah* untuk menyerah
│
╰─────────────────────
_© ${config.copyrightName}_`
        }, { quoted: m.raw });

        setTimeout(async () => {
            const s = activeSessions.get(m.chat);
            if (s && s.expireAt <= Date.now()) {
                activeSessions.delete(m.chat);
                try {
                    await conn.sendMessage(m.chat, { text: `⏰ Waktu habis! Jawabannya: *${s.jawaban}*` });
                } catch {}
            }
        }, TIMEOUT_MS + 500);

    } catch (e) {
        await m.reply(`❌ Gagal ambil soal: ${e.message}`);
    }
};

handler.help = ['tebakgambar - tebak nama dari gambar yang dikirim bot'];
handler.tags = ['games'];
handler.command = /^(tebakgambar|tgb)$/i;

handler.onText = async (m) => {
    const session = activeSessions.get(m.chat);
    if (!session) return false;
    if (session.expireAt <= Date.now()) return false;

    const raw = m.body.trim();
    if (raw.startsWith('.') || raw.startsWith('!')) return false;
    const tebakan = raw.toUpperCase();

    if (tebakan === 'NYERAH') {
        activeSessions.delete(m.chat);
        await m.reply(`🏳️ *Menyerah!* Jawabannya: *${session.jawaban}*\n\nKetik *.tebakgambar* untuk soal baru!`);
        return true;
    }

    if (tebakan === session.jawaban) {
        activeSessions.delete(m.chat);
        await m.reply(`🎉 *Benar!* Jawabannya *${session.jawaban}*. Mata kamu jeli sekali!\n\nKetik *.tebakgambar* untuk soal baru!`);
        return true;
    }

    const lastWrong = session.lastWrong[m.sender] || 0;
    if (Date.now() - lastWrong < 5000) return true;
    session.lastWrong[m.sender] = Date.now();

    const sisaDetik = Math.max(0, Math.ceil((session.expireAt - Date.now()) / 1000));
    await m.reply(`❌ *${tebakan}* bukan jawabannya~ (sisa ${sisaDetik} detik)\n\nCoba lagi atau ketik *nyerah* 💪`);
    return true;
};

export default handler;
