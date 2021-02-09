var http = require('http'),
	https = require('https'),
	url = require('url'),
	fs = require('fs'),
	stringDecoder = require('string_decoder').StringDecoder,
	config = require('./lib/config.js'),
	handlers = require('./lib/handlers.js'),
	helpers = require('./lib/helpers.js');

var httpServer = http.createServer(function(req,res){
	unifiedServer(req,res);
});

httpServer.listen(config.httpPort, function(){
	console.log('Server listening on port '+config.httpPort);
});

var httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pen'),
	'cert' : fs.readFileSync('./https/cart.pen')
};

var httpsServer = https.createServer(httpsServerOptions, function(req,res,){
	unifiedServer(req,res);
});

httpsServer.listen(config.httpsPort, function(){
	console.log('Server listening on port '+config.httpsPort);
});

var unifiedServer = function(req,res){
	var ParsedUrl = url.parse(req.url,true),
		Path = ParsedUrl.pathname,
		TrimmedPath = Path.replace(/^\/+|\/+$/g,''),
		Method = req.method.toLowerCase(),
		QueryStringObject = ParsedUrl.query,
		Headers = req.headers,
		Decoder = new stringDecoder('utf-8'),
		buffer = '';

	req.on('data',function(data){

		buffer += Decoder.write(data);

	});

	req.on('end',function(){

		buffer += Decoder.end();

		var ChoseHandler = typeof(router[TrimmedPath]) != 'undefined' ? router[TrimmedPath] : handlers.notFound;

		var data = {
			'TrimmedPath': TrimmedPath,
			'QueryStringObject': QueryStringObject,
			'Method': Method,
			'Headers': Headers,
			'Payload': helpers.parseJsonToObject(buffer)
		}
		
		ChoseHandler(data, function(statusCode, Payload){

			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
			Payload = typeof(Payload) == 'object' ? Payload : {'error':404,'message':'Not Found'};
			var PayloadString = JSON.stringify(Payload);

			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			res.end(PayloadString);

		})
	})
}

var router = {
	'ping': handlers.ping,
	'users': handlers.users,
	'tokens': handlers.tokens
};