const app = {};

app.config = {
    sessionToken: false,
};

app.client = {};

app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
    headers = typeof (headers) === 'object' && headers !== null ? headers : {};
    path = typeof (path) === 'string' ? path : '/';
    method = typeof (method) === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
    queryStringObject = typeof (queryStringObject) === 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof (payload) === 'object' && payload !== null ? payload : {};
    callback = typeof (callback) === 'function' ? callback : false;

    let reqestUrl = `${path}?`;
    let counter = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const queryKey in queryStringObject) {
        // eslint-disable-next-line no-prototype-builtins
        if (queryStringObject.hasOwnProperty(queryKey)) {
            counter++;
            if (counter > 1) {
                reqestUrl += '&';
            }
            reqestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
        }
    }
    const xhr = new XMLHttpRequest();
    xhr.open(method, reqestUrl, true);
    xhr.setRequestHeader('Content-Type', 'aplication/json');

    // eslint-disable-next-line no-restricted-syntax
    for (const headerKey in headers) {
        // eslint-disable-next-line no-prototype-builtins
        if (headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    if (app.config.sessionToken) {
        xhr.setRequestHeader('token', app.config.sessionToken.id);
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const statusCode = xhr.status;
            const responseReturned = xhr.responseText;

            if (callback) {
                try {
                    const parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                } catch (e) {
                    callback(statusCode, false);
                }
            }
        }
    };
    const PayloadString = JSON.stringify(payload);
    xhr.send(PayloadString);
};
