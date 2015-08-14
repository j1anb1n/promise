var Promise = require('./promise.js');
var promisesAplusTests = require('promises-aplus-tests');

var adapter = {
    resolved: function (val) {
        return Promise.resolve(val);
    },
    rejected: function (val) {
        return Promise.reject(val);
    },
    deferred: function () {
        var res, rej;
        var promise = new Promise(function (r1, r2) {
            res = r1;
            rej = r2;
        });

        return {
            promise: promise,
            resolve: res,
            reject: rej
        };
    }
};

promisesAplusTests(adapter, function () {});