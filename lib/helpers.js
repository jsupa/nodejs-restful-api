const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

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

helpers.getTemplate = function (templateName, callback) {
	templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : false;
	if (templateName) {
		const templateDir = path.join(__dirname, '/../templates/');
		fs.readFile(`${templateDir + templateName}.html`, 'utf8', (err, str) => {
			if (!err && str && str.length > 0) {
				callback(false, str);
			} else {
				callback('No template could be found');
			}
		});
	} else {
		callback('A valid template name was not specified');
	}
};

module.exports = helpers;
