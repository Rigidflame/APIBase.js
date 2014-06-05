(function () {
   "use strict";
    var isNode = false;
    
    var APIBase = function (URL) {
        if (typeof URL !== 'string') throw new Error("URL must be a string!");
        this._ref = new root.Firebase(URL);
        this._attributes = [];
        
        for (var attr in this) {
            this._attributes.push(attr);   
        }
    };

    APIBase.prototype.publish = function () {
        var methods = {};
        for (var attr in this) {
            if (this._attributes.indexOf(attr) == -1) {
                methods[attr] = true;   
            }
        }
        
        this._ref.child('_meta/methods').set(methods);
        this._ref.child('_meta/online').set(true);
        this._ref.child('_meta/online')
            .onDisconnect().set(false);
        
        for (var methodName in methods) {
            var methodQueue = this._ref.child('queue').child('request');
            methodQueue.child(methodName).on('child_added', this._handleQueueItem.bind(this));
        }
    };
    
    APIBase.prototype.get = function (methodName) {
        return this._createFunction(methodName);
    };
    
    APIBase.prototype.retreive = function () {
        var API = {};
        var deferred = defer();
        var self = this;
        this._ref.child('_meta/methods').once('value', function (snapshot) {
            snapshot.forEach(function (methodSnapshot) {
                var methodName = methodSnapshot.name();
                API[methodName] = self._createFunction(methodName);
            });
            deferred.resolve(API);
        });
        return deferred.promise;
    };
    
    APIBase.prototype._handleQueueItem = function (snapshot) {
        var value = snapshot.val();
        var methodName = snapshot.ref().parent().name();
        var ticketName = snapshot.ref().name();
        var responseRef = this._ref
            .child('queue/response')
            .child(methodName)
            .child(ticketName);
        var args = snapshot.val();
        
        try {
            var response = this[methodName].apply(this, args);
            responseRef.child('success').set(response);
        } catch (err) {
            responseRef.child('error').set(err);
        }
    };
    
    APIBase.prototype._createFunction = function (methodName) {
        var self = this;
        return function () {
            var deferred = defer();
            
            var ticket = self._ref
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
                    if (!returned) return; 
                    if (returned.success) deferred.resolve.apply(this, [snapshot.val().success]);
                    if (returned.error) deferred.cancel.apply(this, [snapshot.val().error]);
                    snapshot.ref().off();
                });
            
            return deferred.promise;
        }
    };
    
    var defer = function (context) {
        var local = {};
        local.status = 0;

        local.promise = {
            then: function (successCallback, errorCallback) {
                local.successCallback = successCallback;
                local.errorCallback = errorCallback;
                if (local.status) {
                    local.finish();
                }
            }
        };

        local.resolve = function () {
            local.args = arguments;
            local.status = 1;
            if (local.successCallback) {
                local.finish();
            }
        };
        
        local.cancel = function () {
            local.args = arguments;
            local.status = 2;
            if (local.errorCallback) {
                local.finish();
            }
        };

        local.finish = function () {
            if (local.status == 1) {
                local.successCallback.apply(context, local.args);
            }else if (local.status == 2) {
                local.errorCallback.apply(context, local.args);
            }
        };

        return local;
    };
    
    var root = this || {};
    if (typeof module !== 'undefined' && module.exports) {
        isNode = true;
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