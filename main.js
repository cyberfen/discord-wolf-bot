const DiscordJS = require('discord.js');
const fs = require('fs');
const {join} = require('path');
const { Console } = require('console');
const { raw } = require('express');
require('dotenv').config();

/**
 * @description Erstellt einen neuen Discord Client
 */
var bot = new DiscordJS.Client();
bot.commands = new DiscordJS.Collection();
bot.data = {};

/**
 * @description Main Function for registering new commands directly from the commands directory.
 * @author Parzival
 */
bot.reagisterCommands = function() {
    // Erhalte eine Liste an Dateien aus dem Ordner './commands/' und verarbeite sie.
    fs.readdir('./commands/', (err, files) => {

        // Fehler: Liste konnte nicht erstellt werden.
        if(err) console.error(err);

        // Versuche nur die .js Dateien zu sammeln.
        let jsfiles = files.filter(f => f.split('.').pop() === 'js');
        if (jsfiles.length <= 0) return console.warn('No .js file in \'commands\' detected! Ignoring...');

        // Registriert die Befehle in die Befehlsliste des Bot Clienten.
        jsfiles.forEach((f, i) => {
            let props = require(`./commands/${f}`);
            bot.commands.set(props.help.name, props);
        });

    });
}

/**
 * @description Funktion zum laden von dynamischen Modulen für den Discord Client.
 * @author Parzival
 */
bot.registerPlugins = function() {
    // Erhalte eine Liste an Dateien aus dem Ordner './plugins/' und verarbeite sie.
    fs.readdir('./plugins/', (err, files) => {

        // Fehler: Liste konnte nicht erstellt werden.
        if(err) console.error(err);
    
        // Versuche nur die .js Dateien zu sammeln.
        let jsfiles = files.filter(f => f.split('.').pop() === 'js');
        if (jsfiles.length <= 0) return console.warn('No .js file in \'plugins\' detected! Ignoring...');

        // Bereite die Plugins für die registrierung vor.
        var plugins = [];
        jsfiles.forEach((f, i) => {
            let script = require(`./plugins/${f}`);
            plugins.push(script);
        });
    
        // Plugins haben eine bestimmte Ladereinfolge (HACK: INKOMPATIBLITÄT)
        var loadOrder = {
            "plugin": [],
            "unknown": [],
            "addon": [],
            "overwrite": []
        }

        // Trage die Plugins in die Ladereinfolge ein um inkompatiblität zu vermeiden.
        plugins.forEach((plugin, i) => {
            switch (plugin.help.pluginType.toUpperCase()) {
                case "PLUGIN":
                    // Einfache Basis-Erweiterungen sollten als erstes geladen werden.
                    loadOrder.plugin.push(plugin);
                    break;
            
                case "ADDON":
                    // Addons stellen Erweiterungen für Plugins dar und sollten darher nach ihnen geladen werden.
                    loadOrder.addon.push(plugin);
                    break;

                case "OVERWRITE":
                    // Overwrite Module sind Plugins die als Fix oder anwendungsweite Veränderung gelten und werden daher als letztes geladen.
                    loadOrder.overwrite.push(plugin);
                    break;

                default:
                    // Plugins die keine der oben stehenden Typen entsprechen werden nach dem Typ Plugin geladen. 
                    // Diese Methode ist rein für Debug-Zwecke gedacht und sollte auf keinen Fall im Endprodukt verwendet werden.
                    loadOrder.unknown.push(plugin);

                    break;
            }
        })

        // Stellt den eigentlichen Plugin-Loader dar.
        function loadPlugin(plugin) {
            // Die Plugins werden abhängig von ihrer Api Version unterschiedlich geladen.
            switch (plugin.help.apiVersion) {
                case 1:
                    // API v1: Es müssen keine gesonderten Argumente übergeben werden. Wird meistens von Overwrites verwendet.    
                    plugin.run();
                    break;
                case 2:
                    // API v2: Übergibt einfache Information wie die Bot-Instanze
                    plugin.run(bot);
                    break;
            
                default:
                    // API v?: Die Api Version ist nicht bekannt. Das Plugin wird nicht geladen!
                    console.error(`Failed to load Plugin '${plugin.help.name}': Unknown Api Version!`)
                    break;
            }
            return;
        }

        // Die Plugins werden in dieser Reihenfolge geladen:
        // PLUGIN => UNKNOWN => ADDON => OVERWRITE
        var pluginCount = loadOrder.plugin.length + loadOrder.unknown.length + loadOrder.addon.length + loadOrder.overwrite.length;
        loadOrder.plugin.forEach((plugin, i) => {
            console.log(`Loading Plugin '${plugin.help.name}' ${i + 1} / ${pluginCount} (API v${plugin.help.apiVersion})...`);
            loadPlugin(plugin);
        });
        loadOrder.unknown.forEach((plugin, i) => {
            console.log(`Loading Plugin '${plugin.help.name}' ${loadOrder.plugin.length + (i + 1)} / ${pluginCount} (API v${plugin.help.apiVersion})...`);
            loadPlugin(plugin);
        });
        loadOrder.addon.forEach((plugin, i) => {
            console.log(`Loading Plugin '${plugin.help.name}' ${loadOrder.plugin.length + loadOrder.unknown.length + (i + 1)} / ${pluginCount} (API v${plugin.help.apiVersion})...`);
            loadPlugin(plugin);
        });
        loadOrder.overwrite.forEach((plugin, i) => {
            console.log(`Loading Plugin '${plugin.help.name}' ${loadOrder.plugin.length + loadOrder.addon.length + (i + 1)} / ${pluginCount} (API v${plugin.help.apiVersion})...`);
            loadPlugin(plugin);
        });
    });
}

/**
 * @description Bereitet den Bot auf das laden mehrerer Sprachen vor
 * @author Parzival
 */
/*bot.beginnLanguageHandle = function() {
    // Lade alle Language-Dateien
    var langsRaw = fs.readdirSync(join(__dirname, 'lang'));
    let langs = langsRaw.filter(f => f.split('.').pop() === 'json');

    console.log(`Detected ${langs.length} aviable languages.`);
}*/

/**
 * @description Ermöglicht das automatische laden eines Befehls dessen Script bereits registriert wurde.
 * @author Parzival
 */
bot.beginnCommandHandle = function() {
    // Es wird ein Listener für einkommende Nachrichten installiert.
    bot.on('message', (msg) => {

        // Nachrichten über DM und von Bots werden ignoriert.
        if (msg.author.bot) return;
        if (msg.channel.type === 'dm') return;
    
        // Der Prefix wird abhängig von dem Server geladen.
        let prefix = bot.getGuildConfig(msg.guild).options.prefix;
        let altPrefix1 = `<@!${bot.user.id}>`;
        let altPrefix2 = `${bot.user.id.replace("!", "&")}`;
    
        // Die Nachricht wird auf eventuelle Befehle überprüft.
        if (msg.content.toString().split('')[0] === prefix) ExecuteCommand(false);
        else if (msg.content.startsWith(altPrefix1) == true) ExecuteCommand(true);
        else if (msg.content.startsWith(altPrefix2) == true) ExecuteCommand(true);

        // Führt den Befehl aus
        function ExecuteCommand(useAltPrefix) {
            var rawMsg = msg.content.toString();
            if (useAltPrefix) rawMsg = `${prefix}${msg.content.toString().substring(altPrefix1.length + 1)}`;
            let msgArrays = rawMsg.split(' ');
            let cmd = msgArrays[0];
            let args = msgArrays.slice(1);
    
            // Es wird versucht einen Befehl abzurufen, sollte einer vorhanden sein.
            let cmdfile = bot.commands.get(cmd.slice(prefix.length).toLowerCase());
            if (cmdfile) {
                // Die Rechte des Benutzers werden überprüft.
                if (msg.member.permissions.has(cmdfile.help.permissions) != true) {
                    // Die Rechte des Benutzers reichen für diesen Befehl nicht aus.
                    var res = new DiscordJS.MessageEmbed();
                    res.setTitle("Insufficient Permissions");
                    res.setDescription("Your rights are not sufficient to use this command.\nIf you think this is an error, please contact the server team.");
                    res.setThumbnail("https://i.imgur.com/uBRXask.png");
                    res.setColor(0xFF0000);
                    msg.channel.send(res);

                    // Sendet eine Warnung an die Konsole
                    return msg.delete({timeout: 500, reason: "Command failed: Insufficient Permissions."}).then((msg) => {
                        console.warn(`${msg.author.tag} tried to executed command '${prefix}${cmdfile.help.name}' in channel '${msg.channel.name}' on guild '${msg.guild.name}' with following arguments: '${args}'`);
                    });
                }
                
                // Die Nachricht die den Befehl ausgelöst hat wird gelöscht.
                msg.delete({timeout: 500, reason: "Command executed."}).then((msg) => {
                    console.log(`${msg.author.tag} executed command '${prefix}${cmdfile.help.name}' in channel '${msg.channel.name}' on guild '${msg.guild.name}' with following arguments: '${args}'`);
                });
                
                // Führe den Befehl aus.
                cmdfile.run(bot, msg, args).catch(err => {
                    var errMsg = new DiscordJS.MessageEmbed()
                        .setAuthor(`${bot.user.username} - Error`, bot.user.avatarURL())
                        .setTitle("Failed to execute the command")
                        .setDescription(`${err}`)
                        .setThumbnail("https://i.imgur.com/Fk96p9z.png")
                        .setColor(0x000000);
                    msg.channel.send(errMsg);
                    console.error(`Failed to execute command '${cmd}' with arguments '${args}': ${err}`);
                });

            }
        }
    });
}

/**
 * @description Stellt ein Handler für serverabhängige Einstellung.
 * @author Parzival
 */
bot.initGuildHandler = function() {
    // Um Ladezeit zu verringern wird die Konfiguration nur einmal beim starten des Bot Clienten ausgelesen.
    // Änderungen die während der Laufzeit gespeichert werden müssen, werden in die Datei geschrieben, aber nicht wieder neu eingelesen.

    // Erstellt ein Objekt welches als Speicher für die Guild Konfiguratuin gelten soll.
    bot.data.guilds = require('./data/guilds.json');

    // Erstellt eine Funtkion um die guild Konfiguration im Notfall neu zu laden.
    bot.reloadGuildHandler = function() {
        bot.data.guilds = require('./data/guilds.json');
        return bot.data.guilds;
    }

    // Erstellt eine Funtkion um die guild Konfiguration zu speichern.
    bot.writeGuildHandler = function() {
        var text = JSON.stringify(bot.data.guilds);
        fs.writeFileSync(join(__dirname, 'data', 'guilds.json'), text);
        bot.reloadGuildHandler();
        return text;
    }

    // Erstellt eine Funtkion um eine guild Konfiguration anhand einer Beispiel Konfiguration zu erstellen.
    bot.createGuildConfig = function(guild) {
        var template = bot.getGuildConfig({id: "0"});
        bot.data.guilds.push({
            id: guild.id,
            name: guild.name,
            options: template.options
        });
        bot.writeGuildHandler();
        return bot.data.guilds.find(g => g.id === guild.id);
    }

    /**
     * @description Funktion zum abfragen einer Konfiguration die explizit für einen Discord Server ist.
     * @author Parzival
     * @param {DiscordJS.Guild} guild Stellt den Ziel Discord Server dar
     */
    bot.getGuildConfig = function(guild) {
        var data = bot.data.guilds.find(g => g.id === guild.id);

        // Sollte die Guild nicht verfügbar sein wird eine Template kopiert.
        if (data == undefined) {
            data = bot.createGuildConfig(guild);
        }

        return data;
    }

    /**
     * @description Funktion zum speichern einer Konfiguration die explizit für einen Discord Server ist.
     * @author Parzival
     * @param {DiscordJS.Guild} guild Stellt den Ziel Discord Server dar
     * @param {object} config Stellt die neuen Einstellungen für den Server dar
     */
    bot.setGuildConfig = function(guild, config) {
        var dataOld = bot.data.guilds;
        var dataNew = [];

        dataOld.forEach((cfg) => {
            if (cfg.id === guild.id) {
                dataNew.push(config);
            } else {
                dataNew.push(cfg);
            }
        })

        bot.data.guilds = dataNew;

        // Speichert die änderung in die Datei.
        bot.writeGuildHandler();

        return bot.data.guilds;
    }

    /**
     * @description Überprüft ob eine Konfiguration für den angegebennen Discord verfügbar ist.
     * @param {DiscordJS.Guild} guild
     * @returns {boolean}
     */
    bot.hasGuildConfig = function(guild) {
        // Versucht eine Konfiguration zu finden
        var config = bot.data.guilds.find(g => g.id === guild.id);

        // Wenn keine gefunden wurde, ist config = undefined
        if (config == undefined) return false;
        return true;
    }

    /**
     * @description Setzt eine Server-Konfiguration wieder auf die standartwerte zurück.
     * @param {DiscordJS.Guild} guild
     */
    bot.resetGuildConfig = function(guild) {
        // Erst muss überprüft werden ob überhaupt eine Server-Konfiguration vorhanden ist
        if (bot.hasGuildConfig(guild)) {
            // Es wurde eine Server-Konfiguration gefunden.
            
            // Es wird die aktuelle Konfiguration gesucht.
            var oldConfig = bot.getGuildConfig(guild);
            var template = bot.getGuildConfig({id: "0"});

            // Aktualisiere die Basis-Informationen
            oldConfig.id = guild.id;
            oldConfig.name = guild.name;

            // Lösche alle Server-Einstellung
            oldConfig.options = template.options;

            // Speichere die neuen Einstellung
            bot.setGuildConfig(guild, oldConfig);
        } else {
            // Es wurde kein Eintrag für diesen Server gefunden.

            // Erstelle einen  neuen Eintrag für diesen Server
            bot.setGuildConfig(guild, bot.getGuildConfig({id: "0"}));
        }
    }
}


/**
 * @description Verbindet den Bot Clienten mit Discord
 * @author Parzival
 */
bot.login(process.env.TOKEN).then(() => {
    // Lösche die Konsole um mehr platz zu schaffen.
    console.clear();
    console.log("                                                                                                                                \n"+
                "       :::::::::      :::      ::::::::   ::::::::   ::::::::   ::::::::  ::::    :::          :::::::::   :::::::: ::::::::::: \n"+
                "      :+:    :+:   :+: :+:   :+:    :+: :+:    :+: :+:    :+: :+:    :+: :+:+:   :+:          :+:    :+: :+:    :+:    :+:      \n"+
                "     +:+    +:+  +:+   +:+  +:+        +:+        +:+    +:+ +:+    +:+ :+:+:+  +:+          +:+    +:+ +:+    +:+    +:+       \n"+
                "    +#++:++#:  +#++:++#++: +#+        +#+        +#+    +:+ +#+    +:+ +#+ +:+ +#+          +#++:++#+  +#+    +:+    +#+        \n"+
                "   +#+    +#+ +#+     +#+ +#+        +#+        +#+    +#+ +#+    +#+ +#+  +#+#+#          +#+    +#+ +#+    +#+    +#+         \n"+
                "  #+#    #+# #+#     #+# #+#    #+# #+#    #+# #+#    #+# #+#    #+# #+#   #+#+#          #+#    #+# #+#    #+#    #+#          \n"+
                " ###    ### ###     ###  ########   ########   ########   ########  ###    ####          #########   ########     ###           \n"+
                `                                                     Raccoon Bot v${require('./package.json').version}`);

    // Der Bot ist mit Discord Verbunden. Zeit für ein paar Post-Startup-Skripte
    bot.reagisterCommands();
    bot.initGuildHandler();
    bot.registerPlugins();
    //bot.beginnLanguageHandle();

    // Nachdem der Bot mit seinem Post-Startup-Gedöns fertig ist kann er endlich anfangen Befehle anzunehmen.
    bot.beginnCommandHandle();

});

// Wenn der Bot mit allen Post-Startup-Skripten fertig ist beginnt die eigentliche Arbeit.
bot.once('ready', () => {
    console.log(`${bot.user.tag} successfully connected.`);
    bot.user.setActivity("§help", {
        type: "LISTENING", 
        url: "https://open.spotify.com/track/6xbwZag48lCcSQtF377VXf"
    });
})