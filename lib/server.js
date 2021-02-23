var http = require('http'),
    https = require('https'),
    url = require('url'),
    fs = require('fs'),
    stringDecoder = require('string_decoder').StringDecoder,
    config = require('./config.js'),
    handlers = require('./handlers.js'),
    helpers = require('./helpers.js'),
    util = require('util'),
    debug = util.debuglog('server'),
    path = require('path');

    //* NODE_DEBUG=server node index.js

var server = {};

server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pen')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cart.pen'))
};

server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res,) {
    server.unifiedServer(req, res);
});

server.unifiedServer = function (req, res) {
    var ParsedUrl = url.parse(req.url, true),
        Path = ParsedUrl.pathname,
        TrimmedPath = Path.replace(/^\/+|\/+$/g, ''),
        Method = req.method.toLowerCase(),
        QueryStringObject = ParsedUrl.query,
        Headers = req.headers,
        Decoder = new stringDecoder('utf-8'),
        buffer = '';

    req.on('data', function (data) {

        buffer += Decoder.write(data);

    });

    req.on('end', function () {

        buffer += Decoder.end();

        var ChoseHandler = typeof (server.router[TrimmedPath]) != 'undefined' ? server.router[TrimmedPath] : handlers.notFound;

        var data = {
            'TrimmedPath': TrimmedPath,
            'QueryStringObject': QueryStringObject,
            'Method': Method,
            'Headers': Headers,
            'Payload': helpers.parseJsonToObject(buffer)
        }

        ChoseHandler(data, function (statusCode, Payload) {

            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            Payload = typeof (Payload) == 'object' ? Payload : { 'error': 404, 'message': 'Not Found' };
            var PayloadString = JSON.stringify(Payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(PayloadString);

            if (statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m',Method.toUpperCase()+' /'+TrimmedPath+' '+statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m',Method.toUpperCase()+' /'+TrimmedPath+' '+statusCode);
            }

        })
    })
}

server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'check': handlers.check
};

server.init = function () {

    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[36m%s\x1b[0m', 'Server listening on port ' + config.httpPort);
    });

    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[35m%s\x1b[0m', 'Server listening on port ' + config.httpsPort);
    });
}

module.exports = server;