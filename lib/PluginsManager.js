var path = require('path');
var fs = require('fs');
var logger = require('./logger').get();
var exec = require('./utils').exec;
var PluginInfoProvider = require('cordova-common').PluginInfoProvider;

function PluginsManager(appRoot, storedCWD) {
    this.appRoot = appRoot;
    this.storedCWD = storedCWD;
}

PluginsManager.prototype.installPlugins = function(plugins) {
    for(var n = 0; n < plugins.length; n++) {
        var plugin = plugins[n];
        this.installSinglePlugin(plugin);
    }
};

PluginsManager.prototype.installTestsForExistingPlugins = function() {
    var installedPlugins = new PluginInfoProvider().getAllWithinSearchPath(path.join(this.appRoot, 'plugins'));
    var me = this;
    installedPlugins.forEach(function(plugin) {
        // there is test plugin available
        if (fs.existsSync(path.join(plugin.dir, 'tests', 'plugin.xml'))) {
            me.installSinglePlugin(path.join(plugin.dir, 'tests'));
        }
    });
    this.showPluginsVersions();
};

PluginsManager.prototype.installSinglePlugin = function(plugin) {
    if (fs.existsSync(path.resolve(this.storedCWD, plugin))) {
        plugin = path.resolve(this.storedCWD, plugin);
    }

    logger.normal("cordova-paramedic: installing " + plugin);
    // var pluginPath = path.resolve(this.storedCWD, plugin);

    var plugAddCmd = exec('cordova plugin add ' + plugin);
    if(plugAddCmd.code !== 0) {
        logger.error('Failed to install plugin : ' + plugin);
        throw new Error('Failed to install plugin : ' + plugin);
    }
};

PluginsManager.prototype.showPluginsVersions = function() {
    logger.normal("cordova-paramedic: versions of installed plugins: ");
    exec('cordova plugins');
};

module.exports = PluginsManager;
