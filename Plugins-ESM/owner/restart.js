'use strict';
const handler = async (m) => {
    await m.reply(' Merestart bot...');
    setTimeout(() => process.exit(0), 500);
};
handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = /^(restart|reboot)$/i;
handler.owner = true;
handler.ignoreRateLimit = true;
export default handler;
