'use strict';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
    // Mode environment. 'development' -> error command ditampilkan detail (stack/pesan asli).
    // 'production' -> error command disamarkan jadi pesan generik ke user.
    env: 'development',
    // true -> aktifkan log [DEBUG] tambahan & log Baileys jadi verbose (abaikan baileysLogLevel).
    // false -> log [DEBUG] disembunyikan, log Baileys pakai level dari baileysLogLevel.
    debug: false,
    // Nama bot yang tampil di menu, kontak (vCard), footer "Powered by", dsb.
    botName: 'Morela',
    // Teks copyright/branding yang tampil di footer game, watermark canvas,
    // dan metadata stiker (mis. "_© Morela Bot_"). Beda dari botName — ganti
    // nilai ini saja, semua fitur yang menampilkan teks copyright otomatis ikut berubah.
    copyrightName: 'Morela Bot',
    // Versi internal bot (ditampilkan lewat botVersion di menu; field ini sendiri belum dipakai di kode).
    version: '0.0.1',
    // Nomor WhatsApp main owner (format angka saja, tanpa +). Selalu dianggap owner
    // tertinggi di semua pengecekan permission, terlepas dari isi owners.
    mainOwner: '',
    // Daftar nomor owner tambahan (selain mainOwner) yang juga lolos pengecekan owner-only.
    // Kosongkan [] kalau tidak ada owner tambahan.
    owners: [],
    // Daftar karakter prefix command yang dikenali (mis. ".menu", "!menu", "#menu", "/menu").
    prefix: ['.', '!', '#', '/'],
    // true -> pesan tanpa prefix sama sekali tetap dianggap command.
    // false -> command wajib pakai salah satu karakter di 'prefix'.
    allowNoPrefix: false,
    // Metode login ke WhatsApp. Saat ini cuma 'pairing' (pairing code) yang didukung/dipakai.
    authMethod: 'pairing',
    // Folder tempat menyimpan file kredensial/sesi WhatsApp (auth state Baileys).
    sessionDir: path.join(__dirname, 'session'),
    // Nomor WhatsApp bot yang dipakai untuk minta pairing code saat login pertama kali.
    pairingNumber: '',
    // Kode custom untuk pairing code (biar gampang diingat/dibaca user saat pairing).
    pairingCustomCode: 'MORELAXZ',
    // URL gambar thumbnail default (dipakai untuk preview link/konten tertentu).
    thumbnail: 'https://cdn.ornzora.eu.cc/b815ef37-1be8-4b37-b522-16c445ef3fbd-upload-1781387499469.jpg',

    // URL gambar header yang tampil di command menu.
    menuImage: 'https://athars.space/uploads/9d7a372f.jpg',
    // Path gambar yang dikirim di gate "belum terdaftar" (saat user belum .daftar/.register).
    registerImage: path.join(__dirname, 'media', 'register.jpg'),
    apiKeys: {
        neoxr: '',
        // Daftar gratis di https://api.imgbb.com/ untuk dapat key ini.
        imgbb: '',
    },
    // Token GitHub untuk fitur backup ke repo (belum dipakai plugin manapun saat ini, isi kalau perlu).
    githubToken: '',
    // Nama repo GitHub tujuan backup (belum dipakai plugin manapun saat ini, isi kalau perlu).
    githubRepo: '',
    // Nama owner yang tampil di menu & info kontak bot.
    ownerName: 'putra',
    // Versi bot yang ditampilkan ke user di command menu (boleh beda format dari 'version').
    botVersion: 'v0.0.1',
    // JID channel/newsletter resmi yang dipakai untuk tampilan "forwarded dari channel".
    channelJid: '',
    // Nama channel yang tampil bareng channelJid di tampilan forwarded.
    channelName: 'Kunjungi Saluran Resmi Kami ✨',
    // true -> balasan teks/media dibungkus tampilan "forwarded/branded" (lihat Core/sockext.js).
    // false -> semua balasan dikirim polos tanpa bungkus branding.
    brandedReplies: true,
    // Path folder root project (otomatis, jangan diubah manual).
    rootDir: __dirname,
    // Path folder data (soal game, database, dll — otomatis, jangan diubah manual).
    dataDir: path.join(__dirname, 'data'),
    // Path folder media (gambar, file sementara, dll — otomatis, jangan diubah manual).
    mediaDir: path.join(__dirname, 'media'),
    // Path file database SQLite utama bot.
    dbFile: path.join(__dirname, 'data', 'morela.db'),
    // Level log dari library Baileys ('silent', 'error', 'warn', 'info', 'debug', dst).
    baileysLogLevel: 'silent',
    // Nilai default self mode kalau belum pernah di-set lewat command toggle.
    // true -> di grup, cuma main owner & owner yang bisa chat/command ke bot.
    // false -> di grup, semua orang + main owner + owner bisa chat/command ke bot.
    defaultSelfMode: true,
    // Nilai default private mode kalau belum pernah di-set lewat command toggle.
    // true -> di chat pribadi (DM), cuma main owner & owner yang bisa chat ke bot.
    // false -> di chat pribadi (DM), semua orang bebas chat ke bot.
    defaultPrivateMode: true,
    // Jumlah pemakaian fitur ber-limit per hari untuk user non-premium.
    defaultUsageLimit: 50,
    // Jumlah maksimal percobaan reconnect ke WhatsApp sebelum bot berhenti total.
    maxReconnectAttempts: 10,
    // Jeda (ms) antar percobaan reconnect, dikalikan jumlah percobaan ke berapa.
    reconnectDelayMs: 3000,
    // true -> perubahan file plugin otomatis di-reload tanpa restart bot.
    // false -> perubahan plugin baru kepakai setelah bot di-restart manual.
    pluginHotReload: true,
    // Daftar nama folder di dalam Plugins-ESM yang di-scan & dimuat sebagai plugin.
    pluginDirs: ['owner', 'tools', 'games', 'admin', 'sticker', 'downloader', 'ai', 'maker', 'info'],
};
export default config;
