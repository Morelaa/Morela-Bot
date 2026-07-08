# Resolve Name & Mention Name Guide

## Dua Mekanisme Berbeda

Mention hijau: bot mengirim teks `@628xxx` beserta `mentionedJid`. WhatsApp di perangkat penerima yang merender ini menjadi nama hijau, diambil dari kontak masing-masing penerima.

Resolve nama: bot mencari nama dari database lalu menuliskannya sebagai teks biasa. Hasilnya sama untuk semua orang yang melihat pesan tersebut.

## Mention Hijau

```js
await conn.sendMessage(m.chat, {
  text: `Halo @${phoneNum} 👋`,
  mentions: [phoneJid]
});
```

Syarat wajib: `mentions` harus berisi JID dengan akhiran `@s.whatsapp.net`, bukan `@lid`. Jika JID `@lid` masuk ke `mentions`, mention tidak akan tampil hijau.

Jika target JID adalah `@lid`, konversi dulu. Jangan menulis konversi manual, gunakan `getMentionJid` dari `Library/resolve.js`:

```js
import { getMentionJid } from '../../Library/resolve.js';

const mentionJid = getMentionJid(targetP.id);
```

## Normalisasi JID

Jangan menulis regex sendiri di dalam plugin. Gunakan `normNum` dari `Library/resolve.js`:

```js
import { normNum } from '../../Library/resolve.js';

const num = normNum(jid); // bagian nomor, session, dan domain dibuang, hasil hanya digit
```

## Resolve LID ke Phone

```js
import { getPhoneByLid, getLidByPhone } from '../../Database/db.js';

const phone = getPhoneByLid(lidNumber);   // '628xxx' atau null
const lid   = getLidByPhone(phoneNumber); // '151xxx@lid' atau null
```

Atau melalui wrapper di `resolve.js`, yang sudah menangani normalisasi input:

```js
import { resolveLidToPhone, resolvePhoneToLid } from '../../Library/resolve.js';

const phone = resolveLidToPhone(rawLidJidOrNumber);
const lid   = resolvePhoneToLid(rawPhoneJidOrNumber);
```

Pemetaan lid ke phone diperbarui otomatis lewat `autoMapParticipantLids`, dipanggil setiap kali `handler.js` memproses metadata grup (lihat fungsi `handleMessage` di `handler.js`).

## Mencari Participant dari Input Pengguna

Masalah paling umum: `m.mentionedJid[0]` bisa berupa JID `@lid`. Jangan menormalisasi nilai ini sebelum mencari participant, karena normalisasi akan merusak nomor lid menjadi angka yang tidak valid.

```js
// salah, jangan normalisasi mentionedJid terlebih dahulu
const target = normNum(m.mentionedJid[0]) + '@s.whatsapp.net';

// benar, biarkan apa adanya, serahkan ke findParticipant
const rawTarget = m.mentionedJid[0];
```

`findParticipant` sudah tersedia dan sudah menangani semua jalur fallback: exact match pada `p.id`, pencocokan `@lid` lewat `p.lid`, pencocokan `@lid` lewat `getPhoneByLid`, dan nomor biasa. Jangan diimplementasikan ulang, cukup diimpor dari `Library/resolve.js`:

```js
import { findParticipant } from '../../Library/resolve.js';

const targetP = findParticipant(participants, rawTarget);
```

Jika perlu resolve target sekaligus dari pesan yang di-reply, mention, atau argumen teks, tersedia helper `resolveTarget`:

```js
import { resolveTarget, findParticipant } from '../../Library/resolve.js';

const resolved = resolveTarget(m, args, { minDigits: 8 });
if (!resolved.raw) return m.reply('Reply, tag, atau kasih nomor.');

const targetP = findParticipant(participants, resolved.raw);
```

Pola ini persis yang digunakan di `Plugins-ESM/admin/kick.js`, `demote.js`, dan `promote.js`.

## Kick, Demote, dan Promote Participant

Gunakan `targetP.id` asli dari hasil `findParticipant`, bukan JID yang dibuat sendiri. Jika JID dibuat sendiri dan participant yang sebenarnya terdaftar sebagai `@lid`, aksi akan gagal secara diam-diam tanpa error.

```js
// salah, JID dibuat sendiri, gagal diam-diam jika participant berupa @lid
await conn.groupParticipantsUpdate(m.chat, ['628xxx@s.whatsapp.net'], 'remove');

// benar, gunakan p.id asli dari hasil findParticipant
const targetP = findParticipant(participants, resolved.raw);
await conn.groupParticipantsUpdate(m.chat, [targetP.id], 'remove');
```

Contoh nyata di `Plugins-ESM/admin/kick.js`:

```js
'use strict';
import { resolveTarget, findParticipant } from '../../Library/resolve.js';

const handler = async (m, { conn, args, participants }) => {
  let list = participants;
  if (!list) {
    list = (await conn.groupMetadata(m.chat)).participants;
  }
  const resolved = resolveTarget(m, args, { minDigits: 8 });
  const targetP = findParticipant(list, resolved.raw);
  if (!targetP) return m.reply('Member tidak ditemukan di grup ini.');

  await conn.groupParticipantsUpdate(m.chat, [targetP.id], 'remove');
  await m.reply({ text: `✅ Berhasil kick @${targetP.id.split('@')[0]}`, mentions: [targetP.id] });
};
handler.command = /^(kick|tendang)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true; // wajib bot admin, dicek otomatis sebelum handler jalan
export default handler;
```

## Memeriksa Status Admin Bot

Ada dua cara, tergantung kebutuhan.

Cara paling umum, set flag pada plugin agar diperiksa otomatis sebelum handler dijalankan (dilakukan oleh `evaluatePluginAccess` di `Core/permissions.js`):

```js
handler.botAdmin = true; // jika bot bukan admin, handler tidak akan dipanggil sama sekali
```

Jika nilainya dibutuhkan di dalam logika handler, destructure `isBotAdmin` dari context. Nilai ini sudah dihitung oleh `handler.js` melalui `checkBotAdmin` dan sudah aman terhadap LID:

```js
const handler = async (m, { conn, isBotAdmin }) => {
  if (!isBotAdmin) return m.reply('Bot bukan admin grup');
};
```

Jika benar-benar perlu dihitung manual di luar context handler, misalnya pada passive listener atau `onText`, gunakan `resolveBotAdmin` atau `findBotParticipant` dari `resolve.js`. Jangan menulis ulang ekstraksi digit secara manual:

```js
import { resolveBotAdmin } from '../../Library/resolve.js';

const botIsAdmin = await resolveBotAdmin(conn, m.chat, participants);
```

## Menghapus Pesan di Grup dengan LID

Jika field `participant` masih berupa `@lid` saat menghapus pesan, WhatsApp akan gagal diam-diam dan pesan tidak terhapus. Gunakan `safeDeleteParticipant` dari `resolve.js`:

```js
import { safeDeleteParticipant } from '../../Library/resolve.js';

const participant = safeDeleteParticipant(senderJid);
await conn.sendMessage(m.chat, {
  delete: { remoteJid: m.chat, fromMe: false, id: msgId, participant }
});
```

## Resolve Nama dari Database

Urutan prioritas dari yang paling akurat:

```
1. store.groupMetadata[chat].participants[].notify   paling akurat jika di dalam grup
2. store.contacts[jid].notify / .name / .verifiedName
3. getPushName(lidNum) / getPushName(phoneNum)        dari database, data/morela.db, via Database/db.js
4. quotedPushName / m.pushName                        hanya jika target adalah pengirim pesan itu sendiri
5. conn.groupMetadata(chat) live fetch                jalur terakhir, lebih lambat
```

Fungsi ini sudah diimplementasikan lengkap sebagai `resolveDisplayName` di `Library/resolve.js`. Jangan ditulis ulang, cukup diimpor dan dipakai:

```js
import { resolveDisplayName } from '../../Library/resolve.js';

const name = await resolveDisplayName(conn, m, targetP.id, {
  participants,
  quotedPushName: m.quoted?.pushName,
});
```

Untuk resolve nama singkat langsung dari objek participant, misalnya saat melakukan iterasi anggota grup untuk hidetag atau daftar member, gunakan `resolveNameFromParticipant`:

```js
import { resolveNameFromParticipant } from '../../Library/resolve.js';

const displayName = resolveNameFromParticipant(targetP, targetP.notify);
```

## Masalah dan Solusinya

**Mention menampilkan angka aneh, misalnya `+27 647xxx`, padahal bukan nomor tersebut.**
Penyebab: `mentionedJid[0]` yang berupa `@lid` dinormalisasi menjadi angka yang tidak valid sebelum pencarian participant dilakukan.
Solusi: biarkan `mentionedJid[0]` apa adanya, gunakan `findParticipant` dari `Library/resolve.js`.

**Kick, demote, atau promote gagal tanpa pesan error.**
Penyebab: JID yang dikirim ke `groupParticipantsUpdate` dibuat sendiri, misalnya `628xxx@s.whatsapp.net`, padahal participant sebenarnya terdaftar sebagai `@lid`.
Solusi: selalu gunakan `targetP.id` asli dari hasil `findParticipant`.

**Pesan tidak terhapus.**
Penyebab: field `participant` pada perintah delete masih berupa `@lid`.
Solusi: gunakan `safeDeleteParticipant(senderJid)` sebelum mengirim perintah delete.

**Bot selalu dianggap bukan admin padahal sudah admin.**
Penyebab: perbandingan `p.id === botJid` dilakukan secara langsung, padahal format JID pada grup dengan LID berbeda.
Solusi: set `handler.botAdmin = true` untuk pengecekan otomatis, atau destructure `isBotAdmin` dari context. Jika perlu perhitungan manual, gunakan `resolveBotAdmin`.

**`m.pushName` mengembalikan nama pengirim, bukan nama target.**
Penyebab: `m.pushName` adalah nama orang yang mengirim pesan, bukan target yang di-mention atau di-reply.
Solusi: gunakan `resolveDisplayName(conn, m, targetJid, opts)`.

**`getPushName(fullJid)` mengembalikan `null` untuk pengguna LID.**
Penyebab: key pada database pushname adalah nomor LID saja, bukan JID lengkap.
Solusi: gunakan `getPushName(lidNum)`, bukan `getPushName(lidNum + '@lid')`.

## Perbandingan Implementasi

| File | Mention hijau | Resolve nama | Catatan |
|---|---|---|---|
| `Plugins-ESM/admin/kick.js` | ya | tidak, hanya tag | Pakai `resolveTarget` + `findParticipant`, kick memakai `targetP.id` asli. |
| `Plugins-ESM/admin/demote.js` | ya | tidak | Pola sama persis dengan `kick.js`. |
| `Plugins-ESM/admin/promote.js` | ya | tidak | Pola sama persis dengan `kick.js`. |
| `Plugins-ESM/admin/hidetag.js` | ya, mention semua member | tidak | `mentions` diisi langsung dari `p.id` hasil `groupMetadata`. |
| `handler.js`, gate `plugin.register` | ya | tidak | LID diresolve ke phone dulu lewat helper di `resolve.js` sebelum di-mention. Kalau resolve gagal, mention tidak dilakukan sama sekali. |

Fitur welcome dan goodbye message sengaja belum diimplementasikan di build ini. Kalau nanti dibuat plugin yang mem-mention member baru atau member yang keluar, ikuti pola resolve LID ke phone di atas.

Seluruh helper resolve dan mention yang dijelaskan di guide ini sudah tersedia langsung di `Library/resolve.js`. Plugin baru yang butuh mention atau resolve nama cukup import dari sana, jangan diimplementasikan ulang dengan ekstraksi digit manual dari JID mentah, itu penyebab bug "angka aneh" yang dijelaskan di atas.

```js
import {
  getMentionJid, resolveLidToPhone, resolvePhoneToLid, normNum,
  mapSenderLid, resolveSenderLidLive, findParticipant, findBotParticipant,
  resolveBotAdmin, resolveTarget, resolveDisplayName, resolveNameFromParticipant,
  safeDeleteParticipant,
} from '../../Library/resolve.js';
```
