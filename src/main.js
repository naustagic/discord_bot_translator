// src/main.js
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const config = require('../config/config.json');
const commands = require('../commands/commands.json');
const connection = require('./database');
const translateText = require('./translate');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let mainChannel = '';
let secondaryChannels = {};

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(config.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');

        // Carregar configuração dos canais do banco de dados
        await loadConfigurations();
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'setprincipal') {
        mainChannel = options.getChannel('channel').id;
        await saveMainChannel();
        await interaction.reply(`Main channel set to <#${mainChannel}>`);
    } else if (commandName === 'addsecondary') {
        const channel = options.getChannel('channel').id;
        const language = options.getString('language');

        secondaryChannels[channel] = language;
        await saveSecondaryChannel(channel, language);
        await interaction.reply(`Secondary channel <#${channel}> configured to receive translations in ${language}`);
    } else if (commandName === 'listchannels') {
        const channelsList = await listChannels();
        await interaction.reply(channelsList);
    } else if (commandName === 'removechannel') {
        const channel = options.getChannel('channel').id;
        await removeSecondaryChannel(channel);
        await interaction.reply(`Secondary channel <#${channel}> removed`);
    } else if (commandName === 'modifychannel') {
        const channel = options.getChannel('channel').id;
        const language = options.getString('language');
        await updateSecondaryChannel(channel, language);
        await interaction.reply(`Secondary channel <#${channel}> updated to receive translations in ${language}`);
    }
});

client.on('messageCreate', async message => {
    if (message.channel.id === mainChannel && !message.author.bot) {
        for (const [channelId, language] of Object.entries(secondaryChannels)) {
            const translatedMessage = await translateText(message.content, language);
            const targetChannel = message.guild.channels.cache.get(channelId);
            if (targetChannel) {
                // Obter o nickname ou tag do autor
                const member = message.guild.members.cache.get(message.author.id);
                const nickname = member ? member.nickname || message.author.tag : message.author.tag;

                // Formatar o timestamp de forma amigável
                const timestamp = `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`;

                // Criar a mensagem formatada
                const formattedMessage = `${timestamp} \`\`${nickname}\`\`: ${translatedMessage}`;

                await targetChannel.send(formattedMessage);
            }
        }
    }
});

async function loadConfigurations() {
    try {
        const [rows] = await connection.query('SELECT * FROM channels');
        rows.forEach(row => {
            if (row.type === 'main') {
                mainChannel = row.channel_id;
            } else if (row.type === 'secondary') {
                secondaryChannels[row.channel_id] = row.language;
            }
        });
    } catch (error) {
        console.error('Error loading configurations:', error);
    }
}

async function saveMainChannel() {
    try {
        await connection.query('REPLACE INTO channels (type, channel_id) VALUES (?, ?)', ['main', mainChannel]);
    } catch (error) {
        console.error('Error saving main channel to database:', error);
    }
}

async function saveSecondaryChannel(channelId, language) {
    try {
        await connection.query('REPLACE INTO channels (type, channel_id, language) VALUES (?, ?, ?)', ['secondary', channelId, language]);
    } catch (error) {
        console.error('Error saving secondary channel to database:', error);
    }
}

async function listChannels() {
    try {
        const [rows] = await connection.query('SELECT * FROM channels');
        if (rows.length === 0) return 'No channels configured.';
        return rows.map(row => {
            return row.type === 'main'
                ? `Main Channel: <#${row.channel_id}>`
                : `Secondary Channel: <#${row.channel_id}> | Language: ${row.language}`;
        }).join('\n');
    } catch (error) {
        console.error('Error listing channels:', error);
        return 'Error listing channels.';
    }
}

async function removeSecondaryChannel(channelId) {
    try {
        await connection.query('DELETE FROM channels WHERE type = ? AND channel_id = ?', ['secondary', channelId]);
        delete secondaryChannels[channelId];
    } catch (error) {
        console.error('Error removing secondary channel:', error);
    }
}

async function updateSecondaryChannel(channelId, language) {
    try {
        await connection.query('UPDATE channels SET language = ? WHERE type = ? AND channel_id = ?', [language, 'secondary', channelId]);
        secondaryChannels[channelId] = language;
    } catch (error) {
        console.error('Error updating secondary channel:', error);
    }
}

client.login(config.TOKEN);
