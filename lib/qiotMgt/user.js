var templateAPI = require('./template');

exports.login = function(endpoint, version, username, password) {
    var action = 'login';
    var url = `${endpoint}/${version}/users/login/`;
    var requestBody = {
        'username': username,
        'password': password
    };
    return templateAPI.requestPostWithoutKey(url, action, requestBody);
};
