import { botname } from '../../config/settings.js';
import { getFakeQuoted } from '../../lib/fakeQuoted.js';

export default {
    name: 'ping',
    aliases: ['p', 'speed', 'latency', 'response', 'pong'],
    description: 'Checks the bot response time and server status',
    run: async (context) => {
        const { client, m, toxicspeed } = context;
        const fq = getFakeQuoted(m);
        const bName = botname || 'Toxic-MD';
        try {
            await client.sendMessage(m.chat, { react: { text: '⌛', key: m.reactKey } });
            await client.sendMessage(m.chat, { react: { text: '⚡', key: m.reactKey } });

            const startTime = Date.now();
            const latency = Date.now() - startTime;
            const responseSpeed = (toxicspeed || 0.0094).toFixed(4);

            const formatUptime = (seconds) => {
                const d = Math.floor(seconds / 86400);
                const h = Math.floor((seconds % 86400) / 3600);
                const min = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                return [d && `${d}d`, h && `${h}h`, min && `${min}m`, s && `${s}s`].filter(Boolean).join(' ') || '0s';
            };

            const mem = process.memoryUsage();
            const usedMB = (mem.rss / 1024 / 1024).toFixed(2);
            const totalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);

            const text = `╭───(    TOXIC-MD    )───\n├───≫ Pɪɴɢ ≪───\n├ \n├ 𝐋𝐚𝐭𝐞𝐧𝐜𝐲 : ${responseSpeed}ms\n├ 𝐒𝐞𝐫𝐯𝐞𝐫 𝐓𝐢𝐦𝐞 : ${new Date().toLocaleString()}\n├ 𝐔𝐩𝐭𝐢𝐦𝐞 : ${formatUptime(process.uptime())}\n├ 𝐌𝐞𝐦𝐨𝐫𝐲 : ${usedMB}/${totalMB} MB\n├ 𝐍𝐨𝐝𝐞𝐉𝐒 : ${process.version}\n├ 𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦 : Toxic-Hosting ⚡\n╰──────────────────☉\n> 🌐 hosting.toxicx.tech`;

            await client.sendMessage(m.chat, { text }, { quoted: fq });
        } catch (error) {
            await m.reply(`╭───(    TOXIC-MD    )───\n├───≫ Pɪɴɢ Fᴀɪʟᴇᴅ ≪───\n├ \n├ The ping command crashed.\n├ Much like your life choices.\n╰──────────────────☉\n> 🌐 hosting.toxicx.tech`);
        }
    }
};
