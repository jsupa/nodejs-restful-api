const https = require('https');
const http = require('http');
const util = require('util');
const url = require('url');

const _data = require('./data');
const _logs = require('./logs');

const debug = util.debuglog('workers');

//* NODE_DEBUG=workers node index.js

const workers = {};

workers.gatherAllChecks = function () {
    _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.forEach((check) => {
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        debug('Error reading one of the checks data');
                    }
                });
            });
        } else {
            debug('Error: Could not find any checks to process');
        }
    });
};

workers.validateCheckData = function (originalCheckData) {
    originalCheckData = typeof (originalCheckData) === 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof (originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    originalCheckData.state = typeof (originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.timeoutSeconds : false;

    if (originalCheckData.id
        && originalCheckData.userPhone
        && originalCheckData.protocol
        && originalCheckData.url
        && originalCheckData.method
        && originalCheckData.successCodes
        && originalCheckData.timeoutSeconds) {
        workers.preformCheck(originalCheckData);
    } else {
        debug('Error: One of the checks is not properly formatted. Skipping it.');
    }
};

workers.preformCheck = function (originalCheckData) {
    const checkOutcome = {
        error: false,
        responseCode: false,
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    const hostName = parsedUrl.hostname;
    const { path } = parsedUrl;

    const requestDetails = {
        protocol: `${originalCheckData.protocol}:`,
        hostname: hostName,
        method: originalCheckData.method.toUpperCase(),
        path,
        tiemout: originalCheckData.timeoutSeconds * 1000,
    };

    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
        const status = res.statusCode;

        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', (e) => {
        checkOutcome.error = {
            error: true,
            value: e,
        };
        if (!outcomeSent) {
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', (e) => {
        checkOutcome.error = {
            error: true,
            value: e,
        };
        if (!outcomeSent) {
            workers.procesCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

workers.procesCheckOutcome = function (originalCheckData, checkOutcome) {
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    const alertWarramted = !!(originalCheckData.lastChecked && originalCheckData.state !== state);
    const newCheckData = originalCheckData;

    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarramted, timeOfCheck);

    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            if (alertWarramted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug('Check outcome has not checkged, no alert needed');
            }
        } else {
            debug('Error trying to save updates to one of the checks');
        }
    });
};

workers.alertUserToStatusChange = function (newCheckData) {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    debug(`---------\nphone: ${newCheckData.userPhone}\nmessage: ${msg}\n---------`);
};

workers.log = function (originalCheckData, checkOutcome, state, alertWarramted, timeOfCheck) {
    const logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state,
        alert: alertWarramted,
        time: timeOfCheck,
    };

    const logString = JSON.stringify(logData);
    const logFileName = originalCheckData.id;

    _logs.append(logFileName, logString, (err) => {
        if (!err) {
            debug('Loggin to file succeeded');
        } else {
            debug('login to file failed');
        }
    });
};

workers.loop = function () {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

workers.rotateLogs = function () {
    _logs.list(false, (err, logs) => {
        if (!err && logs && logs.length > 0) {
            logs.forEach((logName) => {
                const logId = logName.replace('.log', '');
                const newFileId = `${logId}-${Date.now()}`;
                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                debug('Success truncationg logFile');
                            } else {
                                debug('Error truncationg logFile');
                            }
                        });
                    } else {
                        debug('Error compressing one of the log files', err);
                    }
                });
            });
        } else {
            debug('Error: could not find any logs to rotate');
        }
    });
};

workers.logRotationloop = function () {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

workers.init = function () {
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    workers.gatherAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotationloop();
};

module.exports = workers;
