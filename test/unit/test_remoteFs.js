process.env.NODE_ENV = 'test';

var assert = require('assert');
var child_process = require('child_process');
var fs = require('fs');
var sinon = require('sinon');

var remoteFs = require('../../lib/remoteFs');

var sandbox;

describe('Sync files', function() {
    beforeEach(function() {
        // mock fs.lstat and stub returned isDirectory method
        sandbox = sinon.sandbox.create();
        var dummyStats = {
            isDirectory: () => false
        };
        var lstatStub = sandbox.stub(fs, 'lstat');
        lstatStub.yields(null, dummyStats);
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('copy files to remote', function() {
        it('should be suceessful', function(done) {
            // mock the child_process.exec function and require again to clean cache
            var execStub = sandbox.stub(child_process, 'exec');
            execStub.yields(null, true);

            remoteFs.syncFiles('127.0.0.1', 'username', 'password', '/tmp/dummyfile', '/tmp/remote-dummyfile').then(function(data) {
                    done();
                })
                .catch(function(error) {
                    throw error;
                })
                .done();
        });
    });

    describe('copy files to wrong remote path', function() {
        it('should return error', function(done) {
            // mock the child_process.exec function and require again to clean cache
            var execStub = sandbox.stub(child_process, 'exec');
            execStub.yields(new Error());

            remoteFs.syncFiles('127.0.0.1', 'username', 'password', '/tmp/dummyfile', '/nonexist/remote-dummyfile').then(function(data) {
                assert.fail(data, null, 'Sync file to wrong path should be failed');
            }, function(error) {
                done();
            }).done();
        });
    });
});