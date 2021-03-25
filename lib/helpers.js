const crypto = require('crypto');
const config = require('./config.js');

const helpers = {};

helpers.hash = function (string) {
	if (typeof (string) === 'string' && string.length > 0) {
		const hash = crypto.createHmac('sha256', config.hashSecret).update(string).digest('hex');
		return hash;
	} else {
		return false;
	}
};

helpers.parseJsonToObject = function (string) {
	try {
		const obj = JSON.parse(string);
		return obj;
	} catch (e) {
		return {};
	}
};

helpers.createRandomString = function (length) {
	length = typeof (length) === 'number' && length > 0 ? length : false;
	if (length) {
		const possibleCharactes = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let str = '';
		for (let i = 1; i <= length; i++) {
			const randomCharacter = possibleCharactes.charAt(Math.floor(Math.random() * possibleCharactes.length));
			str += randomCharacter;
		}
		return str;
	} else {
		return false;
	}
};

module.exports = helpers;
