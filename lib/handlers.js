var handlers = {},
	_data = require('./data'),
	helpers = require('./helpers.js');

handlers.users = function(data, callback){
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.Method) > -1){
		handlers._users[data.Method](data, callback);
	} else {
		callback(405);
	}
}

handlers._users = {}
handlers._users.post= function(data, callback){
	var firstName = typeof(data.Payload.firstName) == 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	var lastName = typeof(data.Payload.lastName) == 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	var phone = typeof(data.Payload.phone) == 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	var password = typeof(data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	var tosAgreement = typeof(data.Payload.tosAgreement) == 'boolean' && data.Payload.tosAgreement == true ? true : false;
	if (firstName && lastName && phone && password && tosAgreement){
		_data.read('users',phone,function(err, data){
			if(err){
				var hashedPassword = helpers.hash(password);
				if (hashedPassword) {
					var userObject = {
							firstName,
							lastName,
							phone,
							hashedPassword,
							tosAgreement
						};
					_data.create('users', phone, userObject, function(err){
						if (!err){
							callback(200,{'Status':'User Created'});
						} else {
							callback(500,{'Error':'Could not create new user'});
						}
					});
				} else {
					callback(500,{'Error':'Could not hash the user\'s password'});
				}
			} else {
				callback(400,{'Error':'A user with that phone number already exists'})
			}
		})
	} else {
		callback(400,{'Error':'Missing required fields'})
	}
}

handlers._users.get= function(data, callback){
	var phone = typeof(data.QueryStringObject.phone) == 'string' && data.QueryStringObject.phone.trim().length == 10 ? data.QueryStringObject.phone.trim() : false;
	if(phone){
		var token = typeof(data.Headers.token) == 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
			if (tokenIsValid){
				_data.read('users', phone, function(err, data){
					if(!err && data){
						delete data.hashedPassword;
						callback(200,data);
					} else {
						callback(404);
					}
				})
			} else {
				callback(403,{'Error':'Missing required token in header, or token is invalid'})
			}
		})
	} else {
		callback(400,{'Error':'Missing required field'})
	}
}

handlers._users.put= function(data, callback){
	var phone = typeof(data.Payload.phone) == 'string' && data.Payload.phone.trim().length == 10 ? data.Payload.phone.trim() : false;

	var firstName = typeof(data.Payload.firstName) == 'string' && data.Payload.firstName.trim().length > 0 ? data.Payload.firstName.trim() : false;
	var lastName = typeof(data.Payload.lastName) == 'string' && data.Payload.lastName.trim().length > 0 ? data.Payload.lastName.trim() : false;
	var password = typeof(data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;

	if(phone){
		if (firstName || lastName || password) {

			var token = typeof(data.Headers.token) == 'string' ? data.Headers.token : false;
			handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
				if (tokenIsValid){
					_data.read('users', phone, function(err, userData){
						if(!err && userData){
							if (firstName) {
								userData.firstName = firstName;
							}
							if (lastName) {
								userData.lastName = lastName;
							}
							if (password) {
								userData.hashedPassword = helpers.hash(password);
							}
							_data.update('users', phone, userData, function(err){
								if(!err){
									callback(200, {'Status':'User updated'})
								} else {
									console.log(err)
									callback(500,{'Error':'Could not update the user'})
								}
							})
						} else {
							callback(400,{'Error':'The specified user does not exist'});
						}
					})
				} else {
					callback(403,{'Error':'Missing required token in header, or token is invalid'})
				}
			})
		} else {
			callback(400,{'Error':'Missing field to update'})
		}
	} else {
		callback(400,{'Error':'Missing required field'})
	}
}

handlers._users.delete= function(data, callback){
	var phone = typeof(data.QueryStringObject.phone) == 'string' && data.QueryStringObject.phone.trim().length == 10 ? data.QueryStringObject.phone.trim() : false;
	if(phone){
		var token = typeof(data.Headers.token) == 'string' ? data.Headers.token : false;
		handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
			if (tokenIsValid){
				_data.read('users', phone, function(err, data){
					if(!err && data){
						_data.delete('users', phone, function(err){
							if (!err){
								callback(200,{'Status':'User deleted'});
							} else {
								callback(500,{'Error':'Could not delete the specified user'});
							}
						})
					} else {
						callback(404,{'Error':'Could not find the specified user'});
					}
				})
			} else {
				callback(403,{'Error':'Missing required token in header, or token is invalid'})
			}
		})
	} else {
		callback(400,{'Error':'Missing required field'})
	}
}

handlers.tokens = function(data, callback){
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.Method) > -1){
		handlers._tokens[data.Method](data, callback);
	} else {
		callback(405);
	}
}

handlers._tokens = {};
handlers._tokens.post = function(data, callback){
	var phone = typeof(data.Payload.phone) == 'string' && data.Payload.phone.trim().length >= 10 ? data.Payload.phone.trim() : false;
	var password = typeof(data.Payload.password) == 'string' && data.Payload.password.trim().length > 0 ? data.Payload.password.trim() : false;
	if (phone && password){
		_data.read('users', phone, function(err, userData){
			if (!err && userData){
				var hashedPassword = helpers.hash(password);
				if (hashedPassword == userData.hashedPassword){
					var tokenID = helpers.createRandomString(20),
						expires = Date.now() * 1000 * 60 * 60,
						tokenObject = {
							phone,
							'id':tokenID,
							expires
						};
					_data.create('tokens', tokenID, tokenObject, function(err){
						if(!err){
							callback(200, tokenObject);
						} else {
							callback(500, {'Error':'Could not create the new token'})
						}
					})
				} else {
					callback(400,{'Error':'Password did not match'})	
				}
			} else {
				callback(400,{'Error':'Could not find the specified user'})
			}
		})
	} else {
		callback(400,{'Error':'Missing required fields'})
	}
}

handlers._tokens.get = function(data, callback){
	var id = typeof(data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if(id){
		_data.read('tokens', id, function(err, tokenData){
			if(!err && tokenData){
				callback(200, tokenData);
			} else {
				callback(404,{'Error':'Could not find specified id'});
			}
		})
	} else {
		callback(400,{'Error':'Missing required field'})
	}
}

handlers._tokens.put = function(data, callback){
	var id = typeof(data.Payload.id) == 'string' && data.Payload.id.trim().length >= 20 ? data.Payload.id.trim() : false;
	var extend = typeof(data.Payload.extend) == 'boolean' && data.Payload.extend == true ? true : false;
	if(id && extend){
		_data.read('tokens', id, function(err, tokenData){
			if(!err && tokenData){
				if(tokenData.expires > Date.now()){
					tokenData.expires = Date.now() * 1000 * 60 * 60;
					_data.update('tokens', id, tokenData, function(err){
						if(!err){
							callback(200, {'Status':'Token updated'})
						} else {
							callback(400, {'Error':'Could not update the token expiration'})
						}
					})
				} else {
					callback(400,{'Error':'The token has already expired, and cannot be extended'})	
				}
			} else {
				callback(400,{'Error':'Specified token dos not exist'})
			}
		})
	} else {
		callback(400,{'Error':'Missing required field or field are invalid'})
	}
}

handlers._tokens.delete = function(data, callback){
	var id = typeof(data.QueryStringObject.id) == 'string' && data.QueryStringObject.id.trim().length == 20 ? data.QueryStringObject.id.trim() : false;
	if(id){
		_data.read('tokens', id, function(err, data){
			if(!err && data){
				_data.delete('tokens', id, function(err){
					if (!err){
						callback(200,{'Status':'Token deleted'});
					} else {
						callback(500,{'Error':'Could not delete the specified token'});
					}
				})
			} else {
				callback(404,{'Error':'Could not find the specified token'});
			}
		})
	} else {
		callback(400,{'Error':'Missing required field'})
	}
}

handlers._tokens.verifyToken = function(id, phone, callback){
	_data.read('tokens', id, function(err, tokenData){
		if (!err && tokenData){
			if (tokenData.phone == phone && tokenData.expires > Date.now()){
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false)
		}
	})
}

handlers.ping = function(data, callback){
	callback(200);
}

handlers.notFound = function(data, callback){
	callback(404);
};

module.exports = handlers;