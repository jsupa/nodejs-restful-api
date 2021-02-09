var handlers = {},
	_data = require('./data'),
	helpers = require('./helpers.js'),
	config = require('./config.js');

handlers.users = function (data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._users[data.Method](data, callback);
	} else {
		callback(405);
	}
}

handlers._users = {}
handlers._users.post = function (data, callback) {
	var firstName = typeof (data.Payload.firstName) == 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	var lastName = typeof (data.Payload.lastName) == 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	var phone = typeof (data.Payload.phone) == 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	var password = typeof (data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	var tosAgreement = typeof (data.Payload.tosAgreement) == 'boolean' && data.Payload.tosAgreement == true ? true : false;
	if (firstName && lastName && phone && password && tosAgreement) {
		_data.read('users', phone, function (err, data) {
			if (err) {
				var hashedPassword = helpers.hash(password);
				if (hashedPassword) {
					var userObject = {
						firstName,
						lastName,
						phone,
						hashedPassword,
						tosAgreement
					};
					_data.create('users', phone, userObject, function (err) {
						if (!err) {
							callback(200, { 'Status': 'User Created' });
						} else {
							callback(500, { 'Error': 'Could not create new user' });
						}
					});
				} else {
					callback(500, { 'Error': 'Could not hash the user\'s password' });
				}
			} else {
				callback(400, { 'Error': 'A user with that phone number already exists' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required fields' })
	}
}

handlers._users.get = function (data, callback) {
	var phone = typeof (data.QueryStringObject.phone) == 'string' && data.QueryStringObject.phone.trim().length == 10 ? data.QueryStringObject.phone.trim() : false;
	if (phone) {
		var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
			if (tokenIsValid) {
				_data.read('users', phone, function (err, data) {
					if (!err && data) {
						delete data.hashedPassword;
						callback(200, data);
					} else {
						callback(404);
					}
				})
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._users.put = function (data, callback) {
	var phone = typeof (data.Payload.phone) == 'string' && data.Payload.phone.trim().length == 10 ? data.Payload.phone.trim() : false;

	var firstName = typeof (data.Payload.firstName) == 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	var lastName = typeof (data.Payload.lastName) == 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	var password = typeof (data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;

	if (phone) {
		if (firstName || lastName || password) {

			var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
			handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
				if (tokenIsValid) {
					_data.read('users', phone, function (err, userData) {
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
							_data.update('users', phone, userData, function (err) {
								if (!err) {
									callback(200, { 'Status': 'User updated' })
								} else {
									console.log(err)
									callback(500, { 'Error': 'Could not update the user' })
								}
							})
						} else {
							callback(400, { 'Error': 'The specified user does not exist' });
						}
					})
				} else {
					callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
				}
			})
		} else {
			callback(400, { 'Error': 'Missing field to update' })
		}
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._users.delete = function (data, callback) {
	var phone = typeof (data.QueryStringObject.phone) == 'string' && data.QueryStringObject.phone.trim().length == 10 ? data.QueryStringObject.phone.trim() : false;
	if (phone) {
		var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
			if (tokenIsValid) {
				_data.read('users', phone, function (err, data) {
					if (!err && data) {
						_data.delete('users', phone, function (err) {
							if (!err) {
								var userChecks = typeof (data.checks) == 'object' && data.checks instanceof Array ? data.checks : [];
								var checkToDelete = userChecks.length;
								if (checkToDelete > 0) {
									var checksDeleted = 0;
									var deletionErrors = false;
									userChecks.forEach(function (checkId) {
										_data.delete('checks', checkId, function (err) {
											if (err) {
												deletionErrors = true;
											}
											checksDeleted++;
											if (checksDeleted == checkToDelete) {
												if (!deletionErrors) {
													callback(200, { 'Status': 'User deleted' })
												} else {
													callback(500,{'Error':'Errors encountered while attempting to delete all of the users checks. All checks may not have been deleted from the system successfuly'})
												}
											}
										})
									})
								} else {
									callback(200, { 'Status': 'User deleted' });
								}
							} else {
								callback(500, { 'Error': 'Could not delete the specified user' });
							}
						})
					} else {
						callback(404, { 'Error': 'Could not find the specified user' });
					}
				})
			} else {
				callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers.tokens = function (data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._tokens[data.Method](data, callback);
	} else {
		callback(405);
	}
}

handlers._tokens = {};
handlers._tokens.post = function (data, callback) {
	var phone = typeof (data.Payload.phone) == 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	var password = typeof (data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	if (phone && password) {
		_data.read('users', phone, function (err, userData) {
			if (!err && userData) {
				var hashedPassword = helpers.hash(password);
				if (hashedPassword == userData.hashedPassword) {
					var tokenID = helpers.createRandomString(20),
						expires = Date.now() * 1000 * 60 * 60,
						tokenObject = {
							phone,
							'id': tokenID,
							expires
						};
					_data.create('tokens', tokenID, tokenObject, function (err) {
						if (!err) {
							callback(200, tokenObject);
						} else {
							callback(500, { 'Error': 'Could not create the new token' })
						}
					})
				} else {
					callback(400, { 'Error': 'Password did not match' })
				}
			} else {
				callback(400, { 'Error': 'Could not find the specified user' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required fields' })
	}
}

handlers._tokens.get = function (data, callback) {
	var id = typeof (data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('tokens', id, function (err, tokenData) {
			if (!err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(404, { 'Error': 'Could not find specified id' });
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._tokens.put = function (data, callback) {
	var id = typeof (data.Payload.id) == 'string' && data.Payload.id.trim().length >= 20 ? data.Payload.id.trim() : false;
	var extend = typeof (data.Payload.extend) == 'boolean' && data.Payload.extend == true ? true : false;
	if (id && extend) {
		_data.read('tokens', id, function (err, tokenData) {
			if (!err && tokenData) {
				if (tokenData.expires > Date.now()) {
					tokenData.expires = Date.now() * 1000 * 60 * 60;
					_data.update('tokens', id, tokenData, function (err) {
						if (!err) {
							callback(200, { 'Status': 'Token updated' })
						} else {
							callback(400, { 'Error': 'Could not update the token expiration' })
						}
					})
				} else {
					callback(400, { 'Error': 'The token has already expired, and cannot be extended' })
				}
			} else {
				callback(400, { 'Error': 'Specified token dos not exist' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field or field are invalid' })
	}
}

handlers._tokens.delete = function (data, callback) {
	var id = typeof (data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('tokens', id, function (err, data) {
			if (!err && data) {
				_data.delete('tokens', id, function (err) {
					if (!err) {
						callback(200, { 'Status': 'Token deleted' });
					} else {
						callback(500, { 'Error': 'Could not delete the specified token' });
					}
				})
			} else {
				callback(404, { 'Error': 'Could not find the specified token' });
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._tokens.verifyToken = function (id, phone, callback) {
	_data.read('tokens', id, function (err, tokenData) {
		if (!err && tokenData) {
			if (tokenData.phone == phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false)
		}
	})
}

handlers.check = function (data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.Method) > -1) {
		handlers._check[data.Method](data, callback)
	} else {
		callback(405);
	}
}

handlers._check = {};

handlers._check.post = function (data, callback) {
	var protocol = typeof (data.Payload.protocol) == 'string' && ['https', 'http'].indexOf(data.Payload.protocol) > -1 ? data.Payload.protocol : false;
	var url = typeof (data.Payload.url) == 'string' && data.Payload.url.trim().length > 0 ? data.Payload.url.trim() : false;
	var method = typeof (data.Payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.Payload.method) > -1 ? data.Payload.method : false;
	var successCodes = typeof (data.Payload.successCodes) == 'object' && data.Payload.successCodes instanceof Array && data.Payload.successCodes.length > 0 ? data.Payload.successCodes : false;
	var timeoutSeconds = typeof (data.Payload.timeoutSeconds) == 'number' && data.Payload.timeoutSeconds % 1 === 0 && data.Payload.timeoutSeconds >= 1 && data.Payload.timeoutSeconds <= 5 ? data.Payload.timeoutSeconds : false;
	if (protocol, url, method, successCodes, timeoutSeconds) {
		var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
		_data.read('tokens', token, function (err, tokenData) {
			if (!err && tokenData) {
				var userPhone = tokenData.phone
				_data.read('users', userPhone, function (err, userData) {
					if (!err && userData) {
						var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						if (userChecks.length < config.maxChecks) {
							var checkId = helpers.createRandomString(20);
							var checkObject = {
								'id': checkId,
								userPhone,
								protocol,
								url,
								method,
								successCodes,
								timeoutSeconds
							};
							_data.create('checks', checkId, checkObject, function (err) {
								if (!err) {
									userData.checks = userChecks;
									userData.checks.push(checkId);
									_data.update('users', userPhone, userData, function (err) {
										if (!err) {
											callback(200, checkObject)
										} else {
											callback(500, { 'Error': 'Could not update the user with the new check' })
										}
									})
								} else {
									callback(500, { 'Error': 'Could not create new check' })
								}
							})
						} else {
							callback(400, { 'Error': 'The user already has the maximum number of checks (' + config.maxChecks + ')' })
						}
					} else {
						callback(403)
					}
				})
			} else {
				callback(403, { 'Error': 'Missing required field' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' })
	}
}

handlers._check.get = function (data, callback) {
	var id = typeof (data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('checks', id, function (err, checkData) {
			if (!err && checkData) {
				var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
				handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
					if (tokenIsValid) {
						callback(200, checkData);
					} else {
						callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
					}
				})
			} else {
				callback(404)
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._check.put = function (data, callback) {
	var id = typeof (data.Payload.id) == 'string' && data.Payload.id.trim().length == 20 ? data.Payload.id.trim() : false;
	var protocol = typeof (data.Payload.protocol) == 'string' && ['https', 'http'].indexOf(data.Payload.protocol) > -1 ? data.Payload.protocol : false;
	var url = typeof (data.Payload.url) == 'string' && data.Payload.url.trim().length > 0 ? data.Payload.url.trim() : false;
	var method = typeof (data.Payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.Payload.method) > -1 ? data.Payload.method : false;
	var successCodes = typeof (data.Payload.successCodes) == 'object' && data.Payload.successCodes instanceof Array && data.Payload.successCodes.length > 0 ? data.Payload.successCodes : false;
	var timeoutSeconds = typeof (data.Payload.timeoutSeconds) == 'number' && data.Payload.timeoutSeconds % 1 === 0 && data.Payload.timeoutSeconds >= 1 && data.Payload.timeoutSeconds <= 5 ? data.Payload.timeoutSeconds : false;

	if (id) {
		if (protocol || url || method || successCodes || timeoutSeconds) {
			_data.read('checks', id, function (err, checkData) {
				if (!err && checkData) {
					var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
					handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
						if (tokenIsValid) {
							if (protocol) {
								checkData.protocol = protocol
							}
							if (url) {
								checkData.url = url
							}
							if (method) {
								checkData.method = method
							}
							if (successCodes) {
								checkData.successCodes = successCodes
							}
							if (timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds
							}
							_data.update('checks', id, checkData, function (err) {
								if (!err) {
									callback(200, { 'Status': 'Chech updated' })
								} else {
									callback(500, { 'Error': 'Could not update the check' })
								}
							})
						} else {
							callback(403)
						}
					})
				} else {
					callback(400, { 'Error': 'Check ID did not exist' })
				}
			})
		} else {
			callback(400, { 'Error': 'Missing fields to update' })
		}
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers._check.delete = function (data, callback) {
	var id = typeof (data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if (id) {
		_data.read('checks', id, function (err, checkData) {
			if (!err && checkData) {
				var token = typeof (data.Headers.token) == 'string' ? data.Headers.token : false;
				handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
					if (tokenIsValid) {
						_data.delete('checks', id, function (err) {
							if (!err) {
								_data.read('users', checkData.userPhone, function (err, userData) {
									if (!err && userData) {
										var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
										var checkPostition = userChecks.indexOf(id);
										if (checkPostition > -1) {
											userChecks.splice(checkPostition, 1)
											_data.update('users', checkData.userPhone, userData, function (err) {
												if (!err) {
													callback(200, { 'Status': 'User Updated' });
												} else {
													callback(500, { 'Error': 'Could not update the specified user' });
												}
											})
										} else {
											callback(500, { 'Error': 'Could not find the check on the users object, so could not remove it' })
										}
									} else {
										callback(500, { 'Error': 'Could not find the user who created the check, so could not remove the check from the list of checks on the user object' });
									}
								})
							} else {
								callback(500, { 'Error': 'Could not delete the check data' })
							}
						})
					} else {
						callback(403, { 'Error': 'Missing required token in header, or token is invalid' })
					}
				})
			} else {
				callback(400, { 'Error': 'The specified check ID does not exist' })
			}
		})
	} else {
		callback(400, { 'Error': 'Missing required field' })
	}
}

handlers.ping = function (data, callback) {
	callback(200);
}

handlers.notFound = function (data, callback) {
	callback(404);
};

module.exports = handlers;