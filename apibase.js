/*jslint nomen: true */
/*global module, require */
(function () {

    "use strict";

    var APIBase, root;

    APIBase = function (URL) {
        if (typeof URL !== 'string') { throw new Error("URL must be a string!"); }
        var attr, self = this;

        self._ref = new root.Firebase(URL);
        self._attributes = [];
        self._online = false;
        self._authState = 0;
        self._pendingResolutions = [];
        self._user = {};

        for (attr in self) {
            self._attributes.push(attr);
        }

        self._ref.child('_meta/online').on('value', function (snapshot) {
            self._online = snapshot.val() ? true : false;
        });
    };

    APIBase.prototype.publish = function () {
        var deferred = this._defer,
            self = this;

        this._ref.child('_meta/online').once('value', function (snapshot) {
            if (snapshot.val()) { throw "A APIBase server is already running at " + self._ref.toString(); }
            self._pendingResolutions.push(deferred.resolve.bind(deferred));
            self._progress();
        });

        deferred.promise.then(function () {
            var attr, methodName, methodQueue, methods = {};
            for (attr in self) {
                if (self._attributes.indexOf(attr) === -1) {
                    methods[attr] = true;
                }
            }

            self._ref.child('_meta/methods').set(methods);
            self._ref.child('_meta/methods')
                .onDisconnect().remove();

            self._ref.child('_meta/online').set(true);
            self._ref.child('_meta/online')
                .onDisconnect().set(false);

            for (methodName in methods) {
                methodQueue = self._ref.child('queue').child('request');
                methodQueue.child(methodName).on('child_added', self._handleQueueItem.bind(self));
            }
        });
    };

    APIBase.prototype.get = function (methodName) {
        return this._createFunction(methodName);
    };

    APIBase.prototype.retrieve = function () {
        var API = {},
            deferred = this._defer,
            self = this;

        this._ref.child('_meta/methods').once('value', function (snapshot) {
            snapshot.forEach(function (methodSnapshot) {
                var methodName = methodSnapshot.name();
                API[methodName] = self._createFunction(methodName);
            });
            self._pendingResolutions.push(deferred.resolve.bind(deferred, API));
            self._progress();
        });

        return deferred.promise;
    };

    APIBase.prototype.auth = function (token) {
        var self = this;
        self._authState = 1; // Auth in the progress
        self._ref.auth(token, function (err, user) {
            if (err) { throw err; }
            self._authState = 2; // Auth complete
            self._user = user;
            self._progress();
        });
    };

    APIBase.prototype._progress = function () {
        var resId;
        if (this._authState === 1) { return false; }
        for (resId = 0; resId < this._pendingResolutions.length; resId += 1) {
            this._pendingResolutions[resId]();
        }
        return true;
    };

    APIBase.prototype._handleQueueItem = function (snapshot) {
        var value = snapshot.val(),
            methodName = snapshot.ref().parent().name(),
            ticketName = snapshot.ref().name(),
            responseRef = this._ref
                .child('queue/response')
                .child(methodName)
                .child(ticketName),
            args = snapshot.val(),
            methodDeferred = this._defer,
            response;

        args.push(methodDeferred);

        try {
            response = this[methodName].apply(this, args);
            if (response !== undefined) {
                responseRef.child('success').set(response);
            } else {
                methodDeferred
                    .promise
                    .then(function (response) {
                        responseRef.child('success').set(response);
                    });
            }
        } catch (err) {
            responseRef.child('error').set(err);
        }

        snapshot.ref().remove();
    };

    APIBase.prototype._createFunction = function (methodName) {
        var self = this;
        return function () {
            var deferred = this._defer,
                ticket = self._ref
                    .child('queue/request')
                    .child(methodName)
                    .push(
                        Array.prototype.slice.call(arguments)
                    );

            self._ref
                .child('queue/response')
                .child(methodName)
                .child(ticket.name())
                .on('value', function (snapshot) {
                    var returned = snapshot.val();
                    if (!returned) { return false; }
                    if (returned.success) { deferred.resolve.apply(this, [snapshot.val().success]); }
                    if (returned.error) { deferred.cancel.apply(this, [snapshot.val().error]); }
                    snapshot.ref().off();
                    snapshot.ref().remove();
                });

            return deferred.promise;
        };
    };

    APIBase.prototype._defer = function (context) {
        var local = {};
        local._status = 0;

        local.promise = {
            then: function (successCallback, errorCallback) {
                local.successCallback = successCallback;
                local.errorCallback = errorCallback;
                if (local._status) {
                    local._finish();
                }
            }
        };

        local.resolve = function () {
            local.args = arguments;
            local._status = 1;
            if (local.successCallback) {
                local._finish();
            }
        };

        local.cancel = function () {
            local.args = arguments;
            local._status = 2;
            if (local.errorCallback) {
                local._finish();
            }
        };

        local._finish = function () {
            if (local._status === 1) {
                local.successCallback.apply(context, local.args);
            } else if (local._status === 2) {
                local.errorCallback.apply(context, local.args);
            }
        };

        return local;
    };

    root = this || {};
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = function (URL) {
            return new APIBase(URL);
        };
        root.Firebase = require('firebase');
    } else {
        root = window;
        if (!root.Firebase) {
            throw "Please include Firebase.js";
        }
        root.APIBase = APIBase;
    }
}());