var columnify = require('columnify');
var fs = require('fs');

Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('');
};

var push = function(index, thingid, step, message) {
    var log = {};
    log['index'] = index;
    log['thingid'] = thingid;
    log['step'] = step;
    var content = message || new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    log['content'] = content;
    // console.log('now ==' + index + ':' + this.hostname + ':' + step);
    this.stepLogArray.push(log);
};

var toSumUp = function() {
    var text = '';
    text += 'deploy report - ' + this.thingType + ' - ' + this.hostname + '\n';
    text += '------------------------------\n';
    for (var i = 0; i < this.stepLogArray.length; i++) {
        var space = '';
        for (var j = 0; j < (20 - String(this.stepLogArray[i]['step']).length); j++) {
            space = space + ' ';
        }
        text = text + this.stepLogArray[i]['index'] + ' ' + this.stepLogArray[i]['thingid'] + ' ' + this.stepLogArray[i]['step'] + space + '\t\t\t' + this.stepLogArray[i]['content'] + '\n';
    }
    text += '\n'
    console.log('');
    console.log('deploy report - ' + this.thingType + ' - ' + this.hostname);
    console.log('------------------------------');
    var columns = columnify(this.stepLogArray, {
        minWidth: 20,
        maxWidth: 20,
        config: {
            index: { minWidth: 4, maxWidth: 4, showHeaders: false, align: 'center' },
            thingid: { minWidth: 40, maxWidth: 40 }
        }
    });
    console.log(columns);
    fs.appendFileSync('logs/stepLog_' + new Date().yyyymmdd() + '.txt', text);
};

var destory = function() {
    this.stepLogArray = null;
};

module.exports = function(thingType, hostname) {
    this.stepLogArray = [];
    this.thingType = thingType;
    this.hostname = hostname;
    this.push = push;
    this.toSumUp = toSumUp;
    this.destory = destory;
}
