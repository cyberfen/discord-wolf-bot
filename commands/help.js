const DiscordJS = require('discord.js');

/**
 * @description Ein Befehl welcher automatisch eine Hilfe-Seite aller Befehle erzeugt.
 * @author Parzival
 * @param {DiscordJS.Client} bot
 * @param {DiscordJS.Message} msg
 * @param {string[]} args
 */
module.exports.run = async function (bot, msg, args) {

    // Ruft den aktuellen Seiten-Index ab.
    var si = 0;
    if (args[0]) {
        si = (Number(args[0]) || 1) - 1;
    }
    var commandsPerSite = 10;

    // Registriere neue Seiten
    var sites = [
        []
    ];
    var i = 0;
    var c = 0;
    var cc = 0;
    bot.commands.forEach((command) => {
        // Befehle werden zum Menu hinzugefügt.
        if (!command.help.hidden) {
            c++;
            cc++;
            sites[i].push({
                name: command.help.name,
                description: command.help.description,
                args: command.help.args,
                alias: command.help.alias
            });
        }
        if (c >= commandsPerSite) {
            i++;
            c = 0;
            sites[i] = [];
        }
    });

    // Überprüft ob der aktuelle Index höher als der maximale Index ist.
    if (si > sites.length - 1) return message.channel.send(`You can only select page 1 to ${sites.length}`).then(msg => msg.delete(5000));

    // Die Hilfe-Seite wird generiert.
    var prefix = bot.getGuildConfig(msg.guild).options.prefix;
    var embed = new DiscordJS.MessageEmbed()
        .setAuthor(`${bot.user.username} - Help`, bot.user.avatarURL())
        .setTitle(`Use _${prefix}${module.exports.help.name} [1-${sites.length}]_  to change the current site.`)
        .setColor(0x000000)
        .setFooter(`Site ${(si + 1)} of ${sites.length} | ${cc} registered commands | ${commandsPerSite} commands per site`);
    sites[si].forEach((command) => {
        var description = `${command.description}`;
        if (command.alias.length != 0) description = `${description}\n**Aliases:** _${command.alias.toString().replace(",", ", ")}_`
        embed.addField(`${prefix}${command.name} ${command.args}`, `${description}`, false);
    });

    // Sendet die Nachricht an den Server
    return msg.channel.send(embed);

};

/**
 * @description Stellt wichtige initialisierungs Informationen für die einbindung des Befehls bereit. 
 */
module.exports.help = {
    name: 'help',
    alias: [],
    description: 'Shows this help page.',
    args: '[number]',
    requireAlpha: false,
    requireBeta: false,
    requireDev: false,
    disabled: false,
    hidden: false,
    permissions: [

    ]
};