var request = require('request');
var list = [];
var timer = null;
var executePost = function() {
    if (list.length > 0) {
        var data = list.shift();
        request.get(data.url, data.options, data.callback);
    } else {
        clearInterval(timer);
        timer = null;
    }
};

exports.push = function(url, options, cb) {
    var requestData = {
        'url': url,
        'options': options,
        'callback': cb
    };
    list.push(requestData);
    if (timer === null) {
        timer = setInterval(executePost, 500);
    }
};
