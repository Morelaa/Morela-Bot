# Morela Bot v0.0.1

WhatsApp bot base berbasis [`@itsliaaa/baileys`](https://www.npmjs.com/package/@itsliaaa/baileys), plugin hot-reload, database SQLite, sistem izin berlapis (owner/admin/premium).

## Instalasi

```bash
npm install
# edit config.js langsung (semua konfigurasi ada di sana, bukan .env)
npm start
```

Login pakai **pairing code** (bukan QR): bot minta nomor WhatsApp lalu tampilkan kode di terminal → WhatsApp HP → **Perangkat Tertaut** → **Tautkan dengan nomor telepon**.

| Command | Kegunaan |
|---|---|
| `npm start` | Jalankan lewat `launcher.js` (auto-restart kalau proses crash) |
| `npm run start:direct` | Jalankan `utama.js` langsung, tanpa supervisor `launcher.js` |
| `npm run dev` | Alias, isinya sama persis dengan `start:direct` (`node utama.js`) |

Catatan: project ini plain JavaScript, tidak ada langkah compile/build (bukan TypeScript). Jadi tidak ada `npm run build`, dan `dev` bukan mode watch/nodemon, cuma nama lain untuk `node utama.js`, dipisah dari `start:direct` sekadar biar familiar buat yang terbiasa `npm run dev`. Kalau mau auto-restart pas develop, tetap pakai `npm start` (lewat `launcher.js`).

## Struktur Project

```
utama.js      → entry point: socket, auth, reconnect, wiring event
launcher.js   → supervisor proses (auto-restart)
handler.js    → router pesan + middleware + pengecekan izin otomatis
config.js     → semua konfigurasi bot (nama, owner, prefix, API key, dll)

Core/         → event bus, store (cache + tulis DB tiap event grup), permission, logging
System/       → self mode, private mode, pengecekan owner
Library/      → resolve LID/JID, MessageBuilder, sticker, canvas, util lain
Database/     → SQLite (better-sqlite3): users, groups, group_members, dll
Plugins-ESM/  → semua command, per folder kategori (owner/admin/tools/games/dst)
data/         → file database SQLite + soal game JSON
media/        → aset gambar (register.jpg disertakan, tambahkan sendiri kalau perlu)
session/      → kredensial login WhatsApp (auto-generate, path diatur lewat config.sessionDir)
```

## Menulis Plugin Baru

Buat file `.js` di `Plugins-ESM/<kategori>/`:

```js
const handler = async (m, { conn, text, args, isOwner, isAdmin }) => {
  await m.reply('Halo juga!');
};

handler.command = /^(halo|hi)$/i; // wajib, dicocokkan ke command yang diketik
handler.help = ['halo'];
handler.tags = ['tools']; // harus sama dengan nama folder

// Flag akses opsional (default false):
handler.owner = false;
handler.admin = false;
handler.botAdmin = false;
handler.group = false;
handler.private = false;
handler.premium = false;   // butuh akun premium
handler.register = false;  // wajib .daftar dulu
handler.limit = false;

export default handler;
```

Pengecekan akses & pesan penolakan sudah dihandle otomatis oleh `handler.js`, plugin tinggal pasang flag. File otomatis ke-reload saat disave (`pluginHotReload: true`).

Plugin juga bisa punya `handler.onText(m, { conn })` untuk menangkap pesan tanpa prefix (return `true` kalau sudah ditangani).

## Pelacakan Event Grup

`Core/store.js` otomatis nulis ke database setiap ada perubahan di grup:
- Member join/keluar/promote/demote → tabel `group_members` (`Database/groupMembers.js`)
- Kalau bot sendiri yang dikick/keluar/dipromote/didemote → status `botInGroup`/`isBotAdmin` tersimpan di tabel `groups`

## Konfigurasi Tambahan

- **`.ytmp3` / `.ytmp4` / `.tiktok`**: isi `apiKeys.neoxr` (daftar di https://api.neoxr.eu).
- **`media/menu.jpg`**: belum disertakan, tambahkan sendiri kalau mau menu bergambar.
- **`githubToken` / `githubRepo`**: belum dipakai plugin manapun saat ini.

⚠️ Semua nilai sensitif (nomor owner, API key) ada langsung di `config.js`. Kalau mau push ke repo publik, kosongkan dulu atau masukkan `config.js` ke `.gitignore`.

## Tampilan Balasan (Branded Replies)

Balasan teks otomatis dibungkus tampilan "forwarded dari channel" lewat `Core/sockext.js`. Atur lewat `config.js`: `ownerName`, `channelJid`, `channelName`, `thumbnail`. Matikan dengan `brandedReplies: false`.

## Lisensi

MIT
