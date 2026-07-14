'use strict';
import config from '../config.js';
function getContentType(message) {
    if (!message)
        return null;
    return Object.keys(message).find((k) => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage') || null;
}
function extractText(message, type) {
    if (!message || !type)
        return '';
    const node = message[type];
    if (typeof node === 'string')
        return node;
    if (type === 'interactiveResponseMessage') {
        const nativeFlow = node?.nativeFlowResponseMessage;
        if (nativeFlow?.paramsJson) {
            try {
                const parsed = JSON.parse(nativeFlow.paramsJson);
                return parsed.id || parsed.display_text || node?.body?.text || '';
            } catch {
                return node?.body?.text || '';
            }
        }
        return node?.body?.text || '';
    }
    return node?.text || node?.caption || node?.selectedButtonId || node?.selectedRowId || node?.selectedId || '';
}
function extractQuoted(message, type) {
    const ctx = message?.[type]?.contextInfo;
    if (!ctx?.quotedMessage)
        return null;
    const quotedType = getContentType(ctx.quotedMessage);
    return {
        key: {
            remoteJid: ctx.remoteJid,
            id: ctx.stanzaId,
            participant: ctx.participant,
            fromMe: false,
        },
        sender: ctx.participant,
        message: ctx.quotedMessage,
        type: quotedType,
        text: extractText(ctx.quotedMessage, quotedType),
    };
}
export function serializeMessage(raw, sock) {
    if (!raw?.message)
        return null;
    const type = getContentType(raw.message);
    const chat = raw.key.remoteJid;
    const isGroup = chat?.endsWith('@g.us');
    const sender = isGroup ? raw.key.participant || raw.participant : chat;
    const fromMe = !!raw.key.fromMe;
    const text = extractText(raw.message, type);
    const contextInfo = raw.message?.[type]?.contextInfo || {};
    const mentionedJid = contextInfo.mentionedJid || [];
    const quoted = extractQuoted(raw.message, type);
    const body = text.trim();
    const prefixUsed = config.prefix.find((p) => body.startsWith(p));
    const isCommand = !!prefixUsed || (config.allowNoPrefix && body.length > 0);
    const withoutPrefix = prefixUsed ? body.slice(prefixUsed.length) : body;
    const [commandRaw, ...args] = withoutPrefix.trim().split(/\s+/);
    const command = (commandRaw || '').toLowerCase();
    return {
        raw,
        key: raw.key,
        id: raw.key.id,
        chat,
        isGroup,
        sender,
        fromMe,
        pushName: raw.pushName || '',
        message: raw.message,
        type,
        text,
        body,
        isCommand,
        prefixUsed: prefixUsed || '',
        command,
        args,
        argsText: args.join(' '),
        mentionedJid,
        quoted,
        timestamp: Number(raw.messageTimestamp) || Math.floor(Date.now() / 1000),
        reply: (content, options = {}) => {
            const payload = typeof content === 'string' ? { text: content } : content;
            return sock.sendMessage(chat, payload, { quoted: raw, ...options });
        },
    };
}
export default { serializeMessage };
