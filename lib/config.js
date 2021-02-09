var environments = {}

environments.staging = {
	'httpPort': 3000,
	'httpsPort': 3001,
	'envName': 'staging',
	'hashSecret': 'SomeSecret',
	'maxChecks': 5
};

environments.production = {
	'httpPort': 5000,
	'httpsPort': 5001,
	'envName': 'production',
	'hashSecret': 'SomeSecretHash',
	'maxChecks': 5
};

var currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

var environmentToExport = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;