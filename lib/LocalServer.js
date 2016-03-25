var Q = require('q');
var io = require('socket.io');

var logger = require('./logger').get();

var specReporters = require('./specReporters');


function LocalServer(port, externalServerUrl, tunneledUrl) {
    this.port = port;
    this.tunneledUrl = tunneledUrl;
    this.externalServerUrl = externalServerUrl;
    this.onTestsResults = null;
}

LocalServer.startServer = function(port, externalServerUrl, tunneledUrl) {
    var localServer = new LocalServer(port, externalServerUrl, tunneledUrl);
    localServer.createSocketListener();
    return Q.resolve(localServer);
};

LocalServer.prototype.createSocketListener = function() {
    var listener = io.listen(this.port, {
        pingTimeout: 60000, // how many ms without a pong packet to consider the connection closed
        pingInterval: 25000 // how many ms before sending a new ping packet
    });

    var me  = this;

    var routes = {
        'log': me.onDeviceLog.bind(me),
        'disconnect': me.onTestsCompletedOrDisconnected.bind(me),
        'deviceInfo': me.onDeviceInfo.bind(me),
        'jasmineStarted': specReporters.jasmineStarted.bind(specReporters),
        'specStarted': specReporters.specStarted.bind(specReporters),
        'specDone': specReporters.specDone.bind(specReporters),
        'suiteStarted': specReporters.suiteStarted.bind(specReporters),
        'suiteDone': specReporters.suiteDone.bind(specReporters),
        'jasmineDone': me.onJasmineDone.bind(me)
    };

    listener.on('connection', function(socket) {
        logger.info('local-server: new socket connection');
        me.connection = socket;

        for (var routeType in routes) {
            socket.on(routeType, routes[routeType]);
        }
    });
};

LocalServer.prototype.haveConnectionUrl = function() {
    return !!(this.tunneledUrl || this.externalServerUrl);
};

LocalServer.prototype.getConnectionUrl = function() {
    return this.tunneledUrl || this.externalServerUrl + ":" + this.port;
};

LocalServer.prototype.reset = function() {
    this.onTestsResults = null;
    if (this.connection) {
        this.connection.disconnect();
        this.connection = null;
    }

    specReporters.reset();
};

LocalServer.prototype.onDeviceLog = function(data) {
    logger.verbose('device|console.'+data.type + ': '  + data.msg[0]);
};

LocalServer.prototype.onDeviceInfo = function(data) {
    logger.info('cordova-paramedic: Device info: ' + JSON.stringify(data));
};

LocalServer.prototype.onTestsCompleted = function(msg) {
    logger.normal('local-server: tests completed');
    this.lastMobileSpecResults = specReporters.getResults();
};

LocalServer.prototype.onJasmineDone = function(data) {
    specReporters.jasmineDone(data);
    // save results to report them later
    this.onTestsCompleted();
    // disconnect because all tests have been completed
    this.connection.disconnect();
};

LocalServer.prototype.onTestsCompletedOrDisconnected = function() {
    logger.info('local-server: tests have been completed or test device has disconnected');
    if (this.onTestsResults) {
        this.onTestsResults(this.lastMobileSpecResults);
    }
    this.lastMobileSpecResults = null;
};

module.exports = LocalServer;
