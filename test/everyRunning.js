/* globals before, describe, it, beforeEach, after, afterEach */
var rethinkHost = process.env.RETHINKDB_HOST || 'localhost',
    rethinkPort = process.env.RETHINKDB_PORT || '28015',
    rethinkCfg = 'http://' + rethinkHost + ':' + rethinkPort + '/agenda_test';

var expect = require('expect.js'),
    path = require('path'),
    cp = require('child_process'),
    Agenda = require(path.join('..', 'index.js')),
    Job = require(path.join('..', 'lib', 'job.js'));

var r = require('rethinkdbdash')({
    host: rethinkHost,
    port: rethinkPort,
    db: 'agenda_test'
});



// create agenda instances
var jobs = null;

function clearJobs(done) {
    r.table('agendaJobs').delete().run(done);
}

// Slow timeouts for travis
var jobTimeout = process.env.TRAVIS ? 15000 : 300;


var jobType = 'do work';
var jobProcessor = function(job) {};


function failOnError(err) {
    if (err) {
        throw err;
    }
}


describe('agenda', function() {


    before(function(done) {

        jobs = new Agenda({
            db: {
                address: rethinkCfg
            }
        }, function(err) {


            setTimeout(function() {
                clearJobs(function() {
                    jobs.define('someJob', jobProcessor);
                    jobs.define('send email', jobProcessor);
                    jobs.define('some job', jobProcessor);
                    jobs.define(jobType, jobProcessor);
                    done();
                });
            }, 50);

        });
    });

    describe('every running', function() {
        this.timeout(30000);
        before(function(done) {
            jobs.defaultConcurrency(1);
            jobs.processEvery(5);
            jobs.stop(done);
        });
        it('should run the same job multiple times', function(done) {
            var counter = 0;

            jobs.define('everyRunTest1', function(job, cb) {
                if (counter < 2) {
                    counter++;
                }
                cb();
            });

            jobs.every(10, 'everyRunTest1');

            jobs.start();

            setTimeout(function() {
                jobs.jobs({
                    name: 'everyRunTest1'
                }, function(err, res) {
                    expect(counter).to.be(2);
                    jobs.stop(done);
                });
            }, jobTimeout);
        });

        it('should reuse the same job on multiple runs', function(done) {
            var counter = 0;

            jobs.define('everyRunTest2', function(job, cb) {
                if (counter < 2) {
                    counter++;
                }
                cb();
            });
            jobs.every(10, 'everyRunTest2');

            jobs.start();

            setTimeout(function() {
                jobs.jobs({
                    name: 'everyRunTest2'
                }, function(err, res) {
                    expect(res).to.have.length(1);
                    jobs.stop(done);
                });
            }, jobTimeout);
        });
    });

});