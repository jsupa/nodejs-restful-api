const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const stringDecoder = require('string_decoder').StringDecoder;
const util = require('util');
const path = require('path');
const config = require('./config.js');
const handlers = require('./handlers.js');
const helpers = require('./helpers.js');

const debug = util.debuglog('server');

//* NODE_DEBUG=server node index.js

const server = {};

server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '/../https/key.pen')),
    cert: fs.readFileSync(path.join(__dirname, '/../https/cart.pen')),
};

server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});

server.unifiedServer = function (req, res) {
    const ParsedUrl = url.parse(req.url, true);
    const Path = ParsedUrl.pathname;
    const TrimmedPath = Path.replace(/^\/+|\/+$/g, '');
    const Method = req.method.toLowerCase();
    const QueryStringObject = ParsedUrl.query;
    const Headers = req.headers;
    const Decoder = new stringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
        buffer += Decoder.write(data);
    });

    req.on('end', () => {
        buffer += Decoder.end();

        let ChoseHandler = typeof (server.router[TrimmedPath]) !== 'undefined' ? server.router[TrimmedPath] : handlers.notFound;

        ChoseHandler = TrimmedPath.indexOf('public/') > -1 ? handlers.public : ChoseHandler;

        const data = {
            TrimmedPath,
            QueryStringObject,
            Method,
            Headers,
            Payload: helpers.parseJsonToObject(buffer),
        };

        ChoseHandler(data, (statusCode, Payload, contentType) => {
            contentType = typeof (contentType) === 'string' ? contentType : 'json';
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;

            let PayloadString = '';
            if (contentType === 'json') {
                res.setHeader('Content-Type', 'application/json');
                Payload = typeof (Payload) === 'object' ? Payload : {};
                PayloadString = JSON.stringify(Payload);
            }
            if (contentType === 'html') {
                res.setHeader('Content-Type', 'text/html');
                PayloadString = typeof (PayloadString) === 'string' ? Payload : {};
            }
            if (contentType === 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                PayloadString = typeof (PayloadString) !== 'undefined' ? Payload : {};
            }
            if (contentType === 'css') {
                res.setHeader('Content-Type', 'text/css');
                PayloadString = typeof (PayloadString) !== 'undefined' ? Payload : {};
            }
            if (contentType === 'png') {
                res.setHeader('Content-Type', 'image/png');
                PayloadString = typeof (PayloadString) !== 'undefined' ? Payload : {};
            }
            if (contentType === 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                PayloadString = typeof (PayloadString) !== 'undefined' ? Payload : {};
            }
            if (contentType === 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                PayloadString = typeof (PayloadString) !== 'undefined' ? Payload : {};
            }

            res.writeHead(statusCode);
            res.end(PayloadString);

            if (statusCode === 200) {
                debug('\x1b[32m%s\x1b[0m', `${Method.toUpperCase()} /${TrimmedPath} ${statusCode}`);
            } else {
                debug('\x1b[31m%s\x1b[0m', `${Method.toUpperCase()} /${TrimmedPath} ${statusCode}`);
            }
        });
    });
};

server.router = {
    '': handlers.index,
    ping: handlers.ping,
    // ? ACCOUNT
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    // ? SESSION
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    // ? CHECKS
    'checks/all': handlers.checksList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    // ? API
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.check,
    // ? dirs
    'favicon.ico': handlers.favicon,
    public: handlers.public,
};

server.init = function () {
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `Server listening on port ${config.httpPort}`);
    });

    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m', `Server listening on port ${config.httpsPort}`);
    });
};

module.exports = server;
