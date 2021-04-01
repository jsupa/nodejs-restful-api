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

helpers.getTemplate = function (templateName, data, callback) {
	templateName = typeof (templateName) === 'string' && templateName.length > 0 ? templateName : false;
	data = typeof (data) === 'object' && data !== null ? data : {};
	if (templateName) {
		const templateDir = path.join(__dirname, '/../templates/');
		fs.readFile(`${templateDir + templateName}.html`, 'utf8', (err, str) => {
			if (!err && str && str.length > 0) {
				const finalString = helpers.interpolate(str, data);
				callback(false, finalString);
			} else {
				callback('No template could be found');
			}
		});
	} else {
		callback('A valid template name was not specified');
	}
};

helpers.addUniversalTemplates = function (str, data, callback) {
	str = typeof (str) === 'string' && str.length > 0 ? str : '';
	data = typeof (data) === 'object' && data !== null ? data : {};
	helpers.getTemplate('_header', data, (err, headerString) => {
		if (!err && headerString) {
			helpers.getTemplate('_footer', data, (err, footerString) => {
				if (!err && footerString) {
					const fullString = headerString + str + footerString;
					callback(false, fullString);
				} else {
					callback('Could not find the footer template');
				}
			});
		} else {
			callback('Could not find the header template');
		}
	});
};

helpers.interpolate = function (str, data) {
	str = typeof (str) === 'string' && str.length > 0 ? str : '';
	data = typeof (data) === 'object' && data !== null ? data : {};
	// eslint-disable-next-line no-restricted-syntax
	for (const keyName in config.templateGlobals) {
		// eslint-disable-next-line no-prototype-builtins
		if (config.templateGlobals.hasOwnProperty(keyName)) {
			data[`global.${keyName}`] = config.templateGlobals[keyName];
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	for (const key in data) {
		// eslint-disable-next-line no-prototype-builtins
		if (data.hasOwnProperty(key) && typeof (data[key]) === 'string') {
			const replace = data[key];
			const find = `{${key}}`;
			str = str.replace(find, replace);
		}
	}
	return str;
};

helpers.getStaticAsset = function (fileName, callback) {
	fileName = typeof (fileName) === 'string' && fileName.length > 0 ? fileName : false;
	if (fileName) {
		const publicDir = path.join(__dirname, '/../public/');
		fs.readFile(publicDir + fileName, (err, data) => {
			if (!err && data) {
				callback(false, data);
			} else {
				callback('No file could be found');
			}
		});
	} else {
		callback('A valid file name was not specified');
	}
};

module.exports = helpers;
