var PENDING = 0;
var DONE    = 1;
var FAIL    = -1;
var guid    = 0;
function isThenable (obj) {
    return (typeof obj === 'object' || typeof obj === 'function') && obj && 'then' in obj;
}

function tryCatch (next, res, rej, result, state) {
    if (typeof next === 'function') {
        try {
            res(next(result));
        } catch (ex) {
            rej(ex);
        }
    } else {
        state === DONE ? res(result) : rej(result);
    }
}

function Promise (fn) {
    var self = this;
    var called = false;
    this.state = PENDING;
    this.callbacks = [[], []];
    this.guid = guid ++;
    function resolve (result) {
        var resultThenIsFunction = false;
        if (result === self) {
            throw new TypeError();
        }

        if (self.state) {
            return;
        }

        if (isThenable(result)) {
            (function () {
                var resolving = false;
                var ran = false;
                var then;
                try {
                    then = result.then;
                    if (typeof then !== 'function') {
                        return;
                    }
                    resultThenIsFunction = true;

                    then.call(result, function (ret) {
                        if (ret === self) {
                            throw new TypeError();
                        }

                        if (ran) {
                            return;
                        }
                        ran = true;
                        resolving = true;
                        resolve(ret);
                    }, function (err) {
                        if (ran) {
                            return;
                        }
                        ran = true;
                        reject(err);
                    });
                } catch (ex) {
                    if (!resolving) {
                        reject(ex);
                    }
                }
            })();
            if (resultThenIsFunction) {
                return;
            }
        }

        self.state = DONE;
        self.result = result;

        self.callbacks[0].forEach(function (cb) {
            setTimeout(function () {
                cb(result);
            }, 0);
        });

        self.callbacks[0] = [];
    }

    function reject(reason) {
        if (self.state) {
            return;
        }

        self.state = FAIL;
        self.result = reason;

        self.callbacks[1].forEach(function (cb) {
            setTimeout(function () {
                cb(reason);
            }, 0);
        });
        self.callbacks[1] = [];
    }

    fn(
        function (ret) {
            if (ret === self) {
                throw new TypeError();
            }
            if (called) {
                return;
            }
            called = true;
            resolve(ret);
        },
        function (err) {
            if (called) {
                return;
            }
            called = true;
            reject(err);
        }
    );
}

module.exports = Promise;

Promise.length = 1;

Promise.all = function (promises) {
    return new Promise(function (res, rej) {
        var results = [];
        var done = 0;
        promises = promises.slice(promises);

        promises.forEach(function (promise, i) {
            Promise.resolve(promise)
                .then(
                    function (result) {
                        results[i] = result;
                        done ++;

                        if (done === promises.length) {
                            res(results);
                        }
                    },
                    function (result) {
                        results[i] = result;

                        rej(result);
                    }
                );
        });
    });
};

Promise.race = function (promises) {
    return new Promise(function (res, rej) {
        promises = promises.slice(promises);

        promises.forEach(function (promise) {
            Promise.resolve(promise)
                .then(res, rej);
        });
    });
};

Promise.resolve = function (value) {
    return new Promise(function (res) {
        res(value);
    });
};

Promise.reject = function (value) {
    return new Promise(function (res, rej) {
        rej(value);
    });
};

Promise.prototype.then = function (onFullfilled, onRejected) {
    var self = this;
    return new Promise(function (res, rej) {
        if (self.state === PENDING) {
            self.callbacks[0].push(function (result) {
                tryCatch(onFullfilled, res, rej, result, self.state);
            });

            self.callbacks[1].push(function (result) {
                tryCatch(onRejected, res, rej, result, self.state);
            });
        }

        if (self.state === DONE) {
            setTimeout(function () {
                tryCatch(onFullfilled, res, rej, self.result, self.state);
            }, 0);
        }

        if (self.state === FAIL) {
            setTimeout(function () {
                tryCatch(onRejected, res, rej, self.result, self.state);
            }, 0);
        }
    });
};

Promise.prototype.caught = function (onRejected) {
    return this.then(undefined, onRejected);
};

Promise.prototype['catch'] = Promise.prototype.caught;