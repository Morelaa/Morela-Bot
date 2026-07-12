'use strict';
import * as kv from '../Database/kvstore.js';
import config from '../config.js';
const KEY = 'selfmode:enabled';
export function isSelfModeOn() {
    const val = kv.get(KEY);
    return val === undefined ? config.defaultSelfMode : val === true || val === 'true';
}
export function setSelfMode(enabled) {
    kv.set(KEY, !!enabled);
    return isSelfModeOn();
}
export function toggleSelfMode() {
    return setSelfMode(!isSelfModeOn());
}
export function shouldBlockNonOwner(isOwnerSender) {
    return isSelfModeOn() && !isOwnerSender;
}
export default { isSelfModeOn, setSelfMode, toggleSelfMode, shouldBlockNonOwner };
