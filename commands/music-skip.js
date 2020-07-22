const DiscordJS = require('discord.js');
const data = require('../package.json');

/**
 * Dieser Befehl überspringt die aktuelle Wiedergabe
 * @param {DiscordJS.Client} bot
 * @param {DiscordJS.Message} msg
 * @param {string[]} args
 */
module.exports.run = async function (bot, msg, args) {

    var s = -1;
    bot.music.server.forEach((c, i) => {
        if (c.id === msg.guild.id) s = i;
    });
    if ((s == -1) || (!bot.music.server[s].dispatcher)) {
        var errVoice = new DiscordJS.MessageEmbed()
            .setAuthor(`${bot.user.username} - Music Player`, bot.user.avatarURL())
            .setTitle(`No playback`)
            .setDescription(`There is no playback active currently.`)
            .setThumbnail(`https://i.imgur.com/L9H79Sj.png`)
            .setColor(0x000000);
        return msg.channel.send(errVoice);
    }

    bot.music.server[s].dispatcher.end();
};

/**
 * Command description
 */
module.exports.help = {
    name: 'skip',
    description: 'Skipps the current playback.',
    args: '',
    hidden: true,
    permissions: [
        "CONNECT"
    ]
};