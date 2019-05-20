var Q = require('q');
var stream = require('stream');
var unzip = require('unzip');

exports.unzip = function(buffer, destination) {
    var deferred = Q.defer();
    if (buffer.length < 4) {
        deferred.reject(new Error('Invalid zipped buffer format'));
    } else {
        var bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        var unzipExtractor = unzip.Extract({ path: destination });
        unzipExtractor.on('error', function(err) {
            deferred.reject(err);
        });
        unzipExtractor.on('close', function() {
            deferred.resolve(true);
        });
        bufferStream.pipe(unzipExtractor);
    }
    return deferred.promise;
}
