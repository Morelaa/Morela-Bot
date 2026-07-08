'use strict';
import db from './sqlite.js';
import config from '../config.js';
const stmtGet = db.prepare('SELECT used FROM usage_limit WHERE jid = ? AND date = ?');
const stmtIncrementBy = db.prepare(`
	INSERT INTO usage_limit (jid, date, used) VALUES (?, ?, ?)
	ON CONFLICT(jid, date) DO UPDATE SET used = used + ?
`);
function today() {
    return new Date().toISOString().slice(0, 10);
}
export function getUsedToday(jid) {
    return stmtGet.get(jid, today())?.used || 0;
}
export function incrementUsage(jid, cost = 1) {
    stmtIncrementBy.run(jid, today(), cost, cost);
}
export function checkAndConsume(jid, { isPremium = false, limit = config.defaultUsageLimit, cost = 1 } = {}) {
    if (isPremium)
        return { allowed: true, used: 0, limit: Infinity };
    const used = getUsedToday(jid);
    if (used + cost > limit)
        return { allowed: false, used, limit };
    incrementUsage(jid, cost);
    return { allowed: true, used: used + cost, limit };
}
export default { getUsedToday, incrementUsage, checkAndConsume };
