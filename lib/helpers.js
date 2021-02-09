var crypto = require('crypto'),
	config = require('./config.js')

helpers = {};

helpers.hash = function(string){
	if(typeof(string) == 'string' && string.length > 0){
		var hash = crypto.createHmac('sha256', config.hashSecret).update(string).digest('hex');
		return hash;
	} else {
		return false;
	}
}

helpers.parseJsonToObject = function(string){
	try{
		var obj = JSON.parse(string);
		return obj;
	} catch(e){
		return {};
	}
}

helpers.createRandomString = function(length){
	length == typeof(length) == 'number' && length > 0 ? length : false;
	if (length) {
		var possibleCharactes = 'abcdefghijklmnopqrstuvwxyz0123456789',
			str = '';
		for (i = 1;i <= length; i++) {
			var randomCharacter = possibleCharactes.charAt(Math.floor(Math.random() * possibleCharactes.length));
			str+=randomCharacter;
		}
		return str;
	} else {
		return false;
	}
}

module.exports = helpers;