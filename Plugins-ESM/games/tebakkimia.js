'use strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pickRandom } from '../../Library/utils.js';
import config from '../../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOAL_FILE = path.join(__dirname, '..', '..', 'data', 'soal_tebakkimia.json');
const TIMEOUT_MS = 45_000;

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
        await m.reply(`⚠️ *Game Sedang Berlangsung!*\n\nMasih ada game Tebak Kimia di sini.\nSelesaikan dulu atau ketik *nyerah* untuk menyerah.`);
        return;
    }

    const bank = loadSoal();
    const item = pickRandom(bank);
    if (!item) {
        await m.reply('Bank soal kosong. Pastikan data/soal_tebakkimia.json ada.');
        return;
    }

    activeSessions.set(m.chat, {
        soal: item.soal,
        jawaban: item.jawaban,
        lastWrong: {},
        expireAt: Date.now() + TIMEOUT_MS,
    });

    await conn.sendMessage(m.chat, {
        text:
`╭──「 ⚗️ *Tebak Kimia* 」
│
│  ⏰ *Waktu*  » 45 detik
│
├──「 🧪 *Nama Unsur* 」
│
│  ✦  ${item.soal}  ✦
│
│  Ketik *simbol/lambang* unsur tersebut!
│  💡 Contoh: H, He, Li, Na, Ca...
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
                await conn.sendMessage(m.chat, {
                    text: `⏰ Waktu habis! Unsur: ${s.soal}\nSimbolnya: *${s.jawaban}*`
                });
            } catch {}
        }
    }, TIMEOUT_MS + 500);
};

handler.help = ['tebakkimia - tebak simbol unsur kimia dari namanya'];
handler.tags = ['games'];
handler.command = /^(tebakkimia|kimia)$/i;

handler.onText = async (m) => {
    const session = activeSessions.get(m.chat);
    if (!session) return false;
    if (session.expireAt <= Date.now()) return false;

    const raw = m.body.trim();
    if (raw.startsWith('.') || raw.startsWith('!')) return false;

    if (raw.toLowerCase() === 'nyerah') {
        activeSessions.delete(m.chat);
        await m.reply(`🏳️ *Menyerah!* Simbolnya: *${session.jawaban}*\n\nKetik *.tebakkimia* untuk soal baru!`);
        return true;
    }

    if (raw === session.jawaban) {
        activeSessions.delete(m.chat);
        await m.reply(`🎉 *Benar!* Simbolnya *${session.jawaban}*. Ahli kimia sejati!\n\nKetik *.tebakkimia* untuk soal baru!`);
        return true;
    }

    const lastWrong = session.lastWrong[m.sender] || 0;
    if (Date.now() - lastWrong < 5000) return true;
    session.lastWrong[m.sender] = Date.now();

    const sisaDetik = Math.max(0, Math.ceil((session.expireAt - Date.now()) / 1000));
    await m.reply(`❌ *${raw}* bukan simbolnya~ (sisa ${sisaDetik} detik)\n\nCoba lagi atau ketik *nyerah* 💪`);
    return true;
};

export default handler;
