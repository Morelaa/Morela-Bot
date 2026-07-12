'use strict';
import * as baileys from '@itsliaaa/baileys';
import config from '../../config.js';
import pluginManager from '../_pluginmanager.js';
import { loadConfigImage, buildFkontak, buildForwardContext } from '../../Library/utils.js';
import { getProcessUptime } from '../../Library/system.js';
import { isSelfModeOn } from '../../System/selfmode.js';
import { checkPremiumUser } from '../../Core/permissions.js';
import db from '../../Database/db.js';
const OWNER_WA = `https://wa.me/${config.mainOwner}`;
const OWNER_CALL_NUMBER = `+${config.pairingNumber || config.mainOwner}`;
const CATEGORY_META = {
    ai: { emoji: '🤖', title: 'AI MENU' },
    downloader: { emoji: '📥', title: 'DOWNLOADER' },
    sticker: { emoji: '✨', title: 'STICKER' },
    maker: { emoji: '🎨', title: 'MAKER' },
    tools: { emoji: '🛠️', title: 'TOOLS' },
    games: { emoji: '🎮', title: 'GAME & RPG' },
    info: { emoji: 'ℹ️', title: 'INFO' },
    admin: { emoji: '🔰', title: 'ADMIN' },
    owner: { emoji: '👑', title: 'OWNER' },
};
const CATEGORY_ORDER = ['ai', 'downloader', 'sticker', 'maker', 'tools', 'games', 'info', 'admin', 'owner'];
function slugCat(tag) {
    return String(tag || 'lainnya').toLowerCase();
}
function buildMenuLists() {
    const grouped = {};
    for (const plugin of pluginManager.getAllPlugins()) {
        const cat = slugCat(plugin.tags?.[0]);
        grouped[cat] ??= [];
        const usage = plugin.help?.[0] || plugin.command?.toString() || '(tanpa usage)';
        grouped[cat].push(usage);
    }
    const lists = {};
    const orderedKeys = [...CATEGORY_ORDER, ...Object.keys(grouped).filter((k) => !CATEGORY_ORDER.includes(k))];
    for (const key of orderedKeys) {
        if (!grouped[key]) continue;
        const meta = CATEGORY_META[key] || { emoji: '🔖', title: key.toUpperCase() };
        lists[key] = { emoji: meta.emoji, title: meta.title, commands: grouped[key].sort() };
    }
    return lists;
}
function getGreeting() {
    const h = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false });
    const hour = parseInt(h, 10);
    if (hour < 5) return '🌙 Selamat Malam';
    if (hour < 11) return '🌅 Selamat Pagi';
    if (hour < 15) return '☀️ Selamat Siang';
    if (hour < 18) return '🌤️ Selamat Sore';
    return '🌙 Selamat Malam';
}
function buildMenuBody(menuLists) {
    return Object.values(menuLists).map((d) => `🔖 ⌞ ${d.title.toLowerCase()} ⌝`).join('\n');
}
function buildCategoryBody(data) {
    let txt = `🔖 ⌞ ${data.emoji} ${data.title} ⌝\n\n`;
    for (const cmd of data.commands) txt += `🔖 ⌞ ${cmd} ⌝\n`;
    return txt;
}
function buildFullMenuBody(menuLists, pushname, senderJid, isOwn, isPrem) {
    const uptime = getProcessUptime();
    const mode = isSelfModeOn() ? 'Self' : 'Public';
    let totalCommands = 0;
    Object.values(menuLists).forEach((d) => (totalCommands += d.commands.length));
    let akses = '👤 User';
    let limit = '-';
    let daftar = '❌ Belum';
    try {
        const ud = db.getUser(senderJid);
        const isReg = db.isRegistered(senderJid);
        if (isOwn) {
            akses = '👑 Owner';
            limit = '9.000.000.000.000';
            daftar = isReg ? '✅ Sudah' : '❌ Belum';
        } else if (isReg) {
            akses = isPrem ? '💎 Premium' : '👤 User';
            limit = isPrem ? '∞' : `${config.defaultUsageLimit}/hari`;
            daftar = '✅ Sudah';
        }
    } catch {  }
    let txt = `${getGreeting()}, *${pushname}!* ✨\n\n`;
    txt += `🔖 ⌞ INFO BOT ⌝\n`;
    txt += `🔖 ⌞ Name     : ${config.botName} ⌝\n`;
    txt += `🔖 ⌞ Version  : ${config.botVersion} ⌝\n`;
    txt += `🔖 ⌞ Uptime   : ${uptime} ⌝\n`;
    txt += `🔖 ⌞ Owner    : ${config.ownerName} ⌝\n`;
    txt += `🔖 ⌞ Mode     : ${mode} ⌝\n`;
    txt += `🔖 ⌞ Commands : ${totalCommands} ⌝\n\n`;
    txt += `🔖 ⌞ INFO USER ⌝\n`;
    txt += `🔖 ⌞ Nama   : ${pushname} ⌝\n`;
    txt += `🔖 ⌞ Akses  : ${akses} ⌝\n`;
    txt += `🔖 ⌞ Limit  : ${limit} ⌝\n`;
    txt += `🔖 ⌞ Daftar : ${daftar} ⌝\n\n`;
    for (const data of Object.values(menuLists)) {
        txt += `🔖 ⌞ ${data.emoji} ${data.title} ⌝\n`;
        for (const cmd of data.commands) txt += `🔖 ⌞ ${cmd} ⌝\n`;
        txt += '\n';
    }
    return txt.trim();
}
function buildSectionsV3(menuLists) {
    return [
        {
            title: 'KATEGORI UTAMA',
            rows: Object.entries(menuLists).map(([key, data]) => ({
                title: `${data.emoji} ${data.title}`,
                id: `.menu_${key}`,
            })),
        },
    ];
}
async function sendMenuV3(conn, jid, imgBuf, bodyText, fkontak, ctx, menuLists) {
    const media = await baileys.prepareWAMessageMedia({ image: imgBuf }, { upload: conn.waUploadToServer });
    const imgMsg = media?.imageMessage;
    await conn.relayMessage(
        jid,
        {
            interactiveMessage: {
                header: { hasMediaAttachment: true, imageMessage: imgMsg },
                body: { text: bodyText },
                footer: { text: `Powered by ${config.botName} ✨` },
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: ctx?.forwardedNewsletterMessageInfo,
                    forwardedAiBotMessageInfo: { botName: 'Meta AI', botJid: '13135550002@bot' },
                    participant: '0@s.whatsapp.net',
                    remoteJid: 'status@broadcast',
                    quotedMessage: fkontak?.message,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({ title: 'PILIH MENU', sections: buildSectionsV3(menuLists) }),
                        },
                        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Beli Sekarang', id: '.sc' }) },
                        { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: 'Telepon Sekarang', phone_number: OWNER_CALL_NUMBER }) },
                        { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Owner', url: OWNER_WA, merchant_url: OWNER_WA }) },
                    ],
                },
            },
        },
        { messageId: conn.generateMessageTag() }
    );
}
const handler = async (m, { conn, command, isOwner }) => {
    try {
        const menuLists = buildMenuLists();
        const pushname = String(m.pushName || 'User');
        const senderJid = m.sender;
        const isOwn = !!isOwner;
        const isPrem = checkPremiumUser(senderJid);
        const imgBuf = await loadConfigImage(config.menuImage);
        const fkontak = await buildFkontak(conn, config);
        const ctx = buildForwardContext(config);
        if (command.startsWith('menu_')) {
            const cat = command.replace('menu_', '');
            const data = menuLists[cat];
            if (!data) return m.reply('❌ Kategori tidak ditemukan');
            const body = buildCategoryBody(data);
            return sendMenuV3(conn, m.chat, imgBuf, body, fkontak, ctx, menuLists);
        }
        const body = buildFullMenuBody(menuLists, pushname, senderJid, isOwn, isPrem);
        await sendMenuV3(conn, m.chat, imgBuf, body, fkontak, ctx, menuLists);
    } catch (e) {
        console.error('[MENU ERROR]', e);
        await m.reply(`❌ Error: ${e.message}`);
    }
};
handler.help = ['menu'];
handler.tags = ['info'];
handler.noLimit = true;
handler.command = /^(menu|help|menu_ai|menu_downloader|menu_sticker|menu_maker|menu_tools|menu_games|menu_info|menu_admin|menu_owner)$/i;
export default handler;
