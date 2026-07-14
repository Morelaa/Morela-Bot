'use strict';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_SIZE = 300 * 1024 * 1024; // 300MB, sesuaikan sama batas server/hosting kamu

// Terima berbagai format: "owner/repo", "https://github.com/owner/repo", "...repo.git", "...repo/tree/branch"
function parseRepoInput(raw) {
    if (!raw) return null;
    let str = raw.trim().replace(/\.git$/i, '');

    // owner/repo langsung
    if (/^[\w.-]+\/[\w.-]+$/.test(str)) {
        const [owner, repo] = str.split('/');
        return { owner, repo, branch: null };
    }

    try {
        const url = new URL(str);
        if (!/github\.com$/i.test(url.hostname)) return null;
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;
        const [owner, repo] = parts;
        let branch = null;
        // format .../owner/repo/tree/<branch>
        if (parts[2] === 'tree' && parts[3]) {
            branch = parts.slice(3).join('/');
        }
        return { owner, repo: repo.replace(/\.git$/i, ''), branch };
    } catch {
        return null;
    }
}

async function getDefaultBranch(owner, repo) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) throw new Error('Repo tidak ditemukan (private/salah nama?)');
    if (!res.ok) throw new Error(`GitHub API error (HTTP ${res.status})`);
    const j = await res.json();
    return j.default_branch || 'main';
}

async function downloadZip(owner, repo, branch) {
    const url = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Gagal download zip (HTTP ${res.status}). Cek nama branch-nya.`);

    const lenHeader = res.headers.get('content-length');
    if (lenHeader && Number(lenHeader) > MAX_SIZE) {
        throw new Error(`Repo terlalu besar (${(Number(lenHeader) / 1024 / 1024).toFixed(1)}MB). Batas ${MAX_SIZE / 1024 / 1024}MB.`);
    }

    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length > MAX_SIZE) {
        throw new Error(`Repo terlalu besar (${(buf.length / 1024 / 1024).toFixed(1)}MB). Batas ${MAX_SIZE / 1024 / 1024}MB.`);
    }
    return buf;
}

const handler = async (m, { conn, args }) => {
    const input = args[0];
    if (!input) {
        return m.reply(
            `╭──「  *GitClone* 」\n│\n│  .gitclone <owner/repo atau url> [branch]\n│\n│  Contoh:\n│  .gitclone facebook/react\n│  .gitclone https://github.com/facebook/react\n│  .gitclone facebook/react main\n│\n╰─────────────────────`
        );
    }

    const parsed = parseRepoInput(input);
    if (!parsed) {
        return m.reply('Format repo nggak dikenali. Contoh: *.gitclone owner/repo*');
    }

    const branchArg = args[1] || parsed.branch;

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    try {
        const branch = branchArg || (await getDefaultBranch(parsed.owner, parsed.repo));
        const buf = await downloadZip(parsed.owner, parsed.repo, branch);

        await conn.sendMessage(
            m.chat,
            {
                document: buf,
                fileName: `${parsed.repo}-${branch}.zip`,
                mimetype: 'application/zip',
                caption: `📦 *${parsed.owner}/${parsed.repo}* (${branch})\nUkuran: ${(buf.length / 1024 / 1024).toFixed(2)} MB`,
            },
            { quoted: m }
        );

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        await m.reply(`Gagal clone repo:\n${e.message}`);
    }
};

handler.help = ['gitclone <owner/repo|url> [branch]'];
handler.tags = ['tools'];
handler.command = /^gitclone$/i;
handler.limit = true;

export default handler;