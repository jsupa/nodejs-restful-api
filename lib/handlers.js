const handlers = {};

const _data = require('./data');
const helpers = require('./helpers.js');
const config = require('./config.js');

handlers.index = function (data, callback) {
	if (data.Method === 'get') {
		const templateData = {
			'head.title': 'This is the title',
			'head.description': 'This is the meta desc',
			'body.title': 'Hello template',
			'body.class': 'Index',
		};
		helpers.getTemplate('index', templateData, (err, str) => {
			if (!err && str) {
				helpers.addUniversalTemplates(str, templateData, (err, str) => {
					if (!err && str) {
						callback(200, str, 'html');
					} else {
						callback(500, undefined, 'html');
					}
				});
			} else {
				callback(500, undefined, 'html');
			}
		});
	} else {
		callback(400, undefined, 'html');
	}
};

handlers.users = function (data, callback) {
	const acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._users[data.Method](data, callback);
	} else {
		callback(405);
	}
};

handlers._users = {};
handlers._users.post = function (data, callback) {
	const firstName = typeof (data.Payload.firstName) === 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	const lastName = typeof (data.Payload.lastName) === 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	const phone = typeof (data.Payload.phone) === 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	const password = typeof (data.Payload.password) === 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	const tosAgreement = !!(typeof (data.Payload.tosAgreement) === 'boolean' && data.Payload.tosAgreement === true);
	if (firstName && lastName && phone && password && tosAgreement) {
		_data.read('users', phone, (err) => {
			if (err) {
				const hashedPassword = helpers.hash(password);
				if (hashedPassword) {
					const userObject = {
						firstName,
						lastName,
						phone,
						hashedPassword,
						tosAgreement,
					};
					_data.create('users', phone, userObject, (err) => {
						if (!err) {
							callback(200, { Status: 'User Created' });
						} else {
							callback(500, { Error: 'Could not create new user' });
						}
					});
				} else {
					callback(500, { Error: 'Could not hash the user\'s password' });
				}
			} else {
				callback(400, { Error: 'A user with that phone number already exists' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required fields' });
	}
};

handlers._users.get = function (data, callback) {
	const phone = typeof (data.QueryStringObject.phone) === 'string' && data.QueryStringObject.phone.trim().length === 10 ? data.QueryStringObject.phone.trim() : false;
	if (phone) {
		const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
			if (tokenIsValid) {
				_data.read('users', phone, (err, data) => {
					if (!err && data) {
						delete data.hashedPassword;
						callback(200, data);
					} else {
						callback(404);
					}
				});
			} else {
				callback(403, { Error: 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._users.put = function (data, callback) {
	const phone = typeof (data.Payload.phone) === 'string' && data.Payload.phone.trim().length === 10 ? data.Payload.phone.trim() : false;

	const firstName = typeof (data.Payload.firstName) === 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	const lastName = typeof (data.Payload.lastName) === 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	const password = typeof (data.Payload.password) === 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;

	if (phone) {
		if (firstName || lastName || password) {
			const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
			handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
				if (tokenIsValid) {
					_data.read('users', phone, (err, userData) => {
						if (!err && userData) {
							if (firstName) {
								userData.firstName = firstName;
							}
							if (lastName) {
								userData.lastName = lastName;
							}
							if (password) {
								userData.hashedPassword = helpers.hash(password);
							}
							_data.update('users', phone, userData, (err) => {
								if (!err) {
									callback(200, { Status: 'User updated' });
								} else {
									console.log(err);
									callback(500, { Error: 'Could not update the user' });
								}
							});
						} else {
							callback(400, { Error: 'The specified user does not exist' });
						}
					});
				} else {
					callback(403, { Error: 'Missing required token in header, or token is invalid' });
				}
			});
		} else {
			callback(400, { Error: 'Missing field to update' });
		}
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._users.delete = function (data, callback) {
	const phone = typeof (data.QueryStringObject.phone) === 'string' && data.QueryStringObject.phone.trim().length === 10 ? data.QueryStringObject.phone.trim() : false;
	if (phone) {
		const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
			if (tokenIsValid) {
				_data.read('users', phone, (err, data) => {
					if (!err && data) {
						_data.delete('users', phone, (err) => {
							if (!err) {
								const userChecks = typeof (data.checks) === 'object' && data.checks instanceof Array ? data.checks : [];
								const checkToDelete = userChecks.length;
								if (checkToDelete > 0) {
									let checksDeleted = 0;
									let deletionErrors = false;
									userChecks.forEach((checkId) => {
										_data.delete('checks', checkId, (err) => {
											if (err) {
												deletionErrors = true;
											}
											checksDeleted++;
											if (checksDeleted === checkToDelete) {
												if (!deletionErrors) {
													callback(200, { Status: 'User deleted' });
												} else {
													callback(500, { Error: 'Errors encountered while attempting to delete all of the users checks. All checks may not have been deleted from the system successfuly' });
												}
											}
										});
									});
								} else {
									callback(200, { Status: 'User deleted' });
								}
							} else {
								callback(500, { Error: 'Could not delete the specified user' });
							}
						});
					} else {
						callback(404, { Error: 'Could not find the specified user' });
					}
				});
			} else {
				callback(403, { Error: 'Missing required token in header, or token is invalid' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers.tokens = function (data, callback) {
	const acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._tokens[data.Method](data, callback);
	} else {
		callback(405);
	}
};

handlers._tokens = {};
handlers._tokens.post = function (data, callback) {
	const phone = typeof (data.Payload.phone) === 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	const password = typeof (data.Payload.password) === 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	if (phone && password) {
		_data.read('users', phone, (err, userData) => {
			if (!err && userData) {
				const hashedPassword = helpers.hash(password);
				if (hashedPassword === userData.hashedPassword) {
					const tokenID = helpers.createRandomString(20);
					const expires = Date.now() + 1000 * 60 * 60;
					const tokenObject = {
						phone,
						id: tokenID,
						expires,
					};
					_data.create('tokens', tokenID, tokenObject, (err) => {
						if (!err) {
							callback(200, tokenObject);
						} else {
							callback(500, { Error: 'Could not create the new token' });
						}
					});
				} else {
					callback(400, { Error: 'Password did not match' });
				}
			} else {
				callback(400, { Error: 'Could not find the specified user' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required fields' });
	}
};

handlers._tokens.get = function (data, callback) {
	const id = typeof (data.QueryStringObject.id) === 'string' && data.QueryStringObject.id.trim().length === 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('tokens', id, (err, tokenData) => {
			if (!err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(404, { Error: 'Could not find specified id' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._tokens.put = function (data, callback) {
	const id = typeof (data.Payload.id) === 'string' && data.Payload.id.trim().length >= 20 ? data.Payload.id.trim() : false;
	const extend = !!(typeof (data.Payload.extend) === 'boolean' && data.Payload.extend === true);
	if (id && extend) {
		_data.read('tokens', id, (err, tokenData) => {
			if (!err && tokenData) {
				if (tokenData.expires > Date.now()) {
					tokenData.expires = Date.now() + 1000 * 60 * 60;
					_data.update('tokens', id, tokenData, (err) => {
						if (!err) {
							callback(200, { Status: 'Token updated' });
						} else {
							callback(400, { Error: 'Could not update the token expiration' });
						}
					});
				} else {
					callback(400, { Error: 'The token has already expired, and cannot be extended' });
				}
			} else {
				callback(400, { Error: 'Specified token dos not exist' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field or field are invalid' });
	}
};

handlers._tokens.delete = function (data, callback) {
	const id = typeof (data.QueryStringObject.id) === 'string' && data.QueryStringObject.id.trim().length === 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('tokens', id, (err, data) => {
			if (!err && data) {
				_data.delete('tokens', id, (err) => {
					if (!err) {
						callback(200, { Status: 'Token deleted' });
					} else {
						callback(500, { Error: 'Could not delete the specified token' });
					}
				});
			} else {
				callback(404, { Error: 'Could not find the specified token' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._tokens.verifyToken = function (id, phone, callback) {
	_data.read('tokens', id, (err, tokenData) => {
		if (!err && tokenData) {
			if (tokenData.phone === phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};

handlers.check = function (data, callback) {
	const acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._check[data.Method](data, callback);
	} else {
		callback(405);
	}
};

handlers._check = {};

handlers._check.post = function (data, callback) {
	const protocol = typeof (data.Payload.protocol) === 'string' && ['https', 'http'].indexOf(data.Payload.protocol) > -1 ? data.Payload.protocol : false;
	const url = typeof (data.Payload.url) === 'string' && data.Payload.url.trim().length > 0 ? data.Payload.url.trim() : false;
	const method = typeof (data.Payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.Payload.method) > -1 ? data.Payload.method : false;
	const successCodes = typeof (data.Payload.successCodes) === 'object' && data.Payload.successCodes instanceof Array && data.Payload.successCodes.length > 0 ? data.Payload.successCodes : false;
	const timeoutSeconds = typeof (data.Payload.timeoutSeconds) === 'number' && data.Payload.timeoutSeconds % 1 === 0 && data.Payload.timeoutSeconds >= 1 && data.Payload.timeoutSeconds <= 5 ? data.Payload.timeoutSeconds : false;
	if (protocol && url && method && successCodes && timeoutSeconds) {
		const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
		_data.read('tokens', token, (err, tokenData) => {
			if (!err && tokenData) {
				const userPhone = tokenData.phone;
				_data.read('users', userPhone, (err, userData) => {
					if (!err && userData) {
						const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
						if (userChecks.length < config.maxChecks) {
							const checkId = helpers.createRandomString(20);
							const checkObject = {
								id: checkId,
								userPhone,
								protocol,
								url,
								method,
								successCodes,
								timeoutSeconds,
							};
							_data.create('checks', checkId, checkObject, (err) => {
								if (!err) {
									userData.checks = userChecks;
									userData.checks.push(checkId);
									_data.update('users', userPhone, userData, (err) => {
										if (!err) {
											callback(200, checkObject);
										} else {
											callback(500, { Error: 'Could not update the user with the new check' });
										}
									});
								} else {
									callback(500, { Error: 'Could not create new check' });
								}
							});
						} else {
							callback(400, { Error: `The user already has the maximum number of checks (${config.maxChecks})` });
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403, { Error: 'Missing required field' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required inputs, or inputs are invalid' });
	}
};

handlers._check.get = function (data, callback) {
	const id = typeof (data.QueryStringObject.id) === 'string' && data.QueryStringObject.id.trim().length === 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
				handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
					if (tokenIsValid) {
						callback(200, checkData);
					} else {
						callback(403, { Error: 'Missing required token in header, or token is invalid' });
					}
				});
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._check.put = function (data, callback) {
	const id = typeof (data.Payload.id) === 'string' && data.Payload.id.trim().length === 20 ? data.Payload.id.trim() : false;
	const protocol = typeof (data.Payload.protocol) === 'string' && ['https', 'http'].indexOf(data.Payload.protocol) > -1 ? data.Payload.protocol : false;
	const url = typeof (data.Payload.url) === 'string' && data.Payload.url.trim().length > 0 ? data.Payload.url.trim() : false;
	const method = typeof (data.Payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.Payload.method) > -1 ? data.Payload.method : false;
	const successCodes = typeof (data.Payload.successCodes) === 'object' && data.Payload.successCodes instanceof Array && data.Payload.successCodes.length > 0 ? data.Payload.successCodes : false;
	const timeoutSeconds = typeof (data.Payload.timeoutSeconds) === 'number' && data.Payload.timeoutSeconds % 1 === 0 && data.Payload.timeoutSeconds >= 1 && data.Payload.timeoutSeconds <= 5 ? data.Payload.timeoutSeconds : false;

	if (id) {
		if (protocol || url || method || successCodes || timeoutSeconds) {
			_data.read('checks', id, (err, checkData) => {
				if (!err && checkData) {
					const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
					handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
						if (tokenIsValid) {
							if (protocol) {
								checkData.protocol = protocol;
							}
							if (url) {
								checkData.url = url;
							}
							if (method) {
								checkData.method = method;
							}
							if (successCodes) {
								checkData.successCodes = successCodes;
							}
							if (timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds;
							}
							_data.update('checks', id, checkData, (err) => {
								if (!err) {
									callback(200, { Status: 'Chech updated' });
								} else {
									callback(500, { Error: 'Could not update the check' });
								}
							});
						} else {
							callback(403);
						}
					});
				} else {
					callback(400, { Error: 'Check ID did not exist' });
				}
			});
		} else {
			callback(400, { Error: 'Missing fields to update' });
		}
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers._check.delete = function (data, callback) {
	const id = typeof (data.QueryStringObject.id) === 'string' && data.QueryStringObject.id.trim().length === 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				const token = typeof (data.Headers.token) === 'string' ? data.Headers.token : false;
				handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
					if (tokenIsValid) {
						_data.delete('checks', id, (err) => {
							if (!err) {
								_data.read('users', checkData.userPhone, (err, userData) => {
									if (!err && userData) {
										const userChecks = typeof (userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
										const checkPostition = userChecks.indexOf(id);
										if (checkPostition > -1) {
											userChecks.splice(checkPostition, 1);
											_data.update('users', checkData.userPhone, userData, (err) => {
												if (!err) {
													callback(200, { Status: 'User Updated' });
												} else {
													callback(500, { Error: 'Could not update the specified user' });
												}
											});
										} else {
											callback(500, { Error: 'Could not find the check on the users object, so could not remove it' });
										}
									} else {
										callback(500, { Error: 'Could not find the user who created the check, so could not remove the check from the list of checks on the user object' });
									}
								});
							} else {
								callback(500, { Error: 'Could not delete the check data' });
							}
						});
					} else {
						callback(403, { Error: 'Missing required token in header, or token is invalid' });
					}
				});
			} else {
				callback(400, { Error: 'The specified check ID does not exist' });
			}
		});
	} else {
		callback(400, { Error: 'Missing required field' });
	}
};

handlers.ping = function (data, callback) {
	callback(200);
};

handlers.notFound = function (data, callback) {
	callback(404);
};

module.exports = handlers;
