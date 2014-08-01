/*jslint nomen: true */
/*global module, require, process */
(function () {

    "use strict";

    var APIBase, 
        root,
        NOT_STARTED = 0,
        IN_PROGRESS = 1,
        COMPLETE = 2;

    APIBase = function (firebase) {
        var attr, self = this;
        
        if (typeof firebase == 'string') {
            self._ref = new root.Firebase(firebase);
        }
        
        if (typeof firebase == 'object') {
            self._ref = firebase; 
        }

        self._attributes = [];
        self._online = false;
        self._authState = NOT_STARTED;
        self._pendingResolutions = [];
        self._methods = {};
        self._user = {};
        self._isServer = false;
        self._cleanUpInterval = 60000;
        self._context = {}; 
        

        for (attr in self) {
            self._attributes.push(attr);
        }

        self._ref.child('_meta/online').on('value', function (snapshot) {
            self._online = snapshot.val() ? true : false;
        });
    };

    APIBase.prototype.publish = function () {
        var deferred = this._defer(),
            self = this;

        self._isServer = true;

        this._ref.child('_meta/online').once('value', function (snapshot) {
            if (snapshot.val()) { 
                throw "A APIBase server is already running at " + self._ref.toString();
            }
            self._pendingResolutions.push(deferred.resolve.bind(deferred));
            self._progress();
        });

        deferred.promise.then(function () {
            var attr, methodName, methodQueue
            for (attr in self) {
                if (self._attributes.indexOf(attr) === -1) {
                    self._methods[attr] = true;
                }
            }
            
            for (methodName in self._methods) {
                methodQueue = self._ref.child('queue').child('request');
                methodQueue.child(methodName).on('child_added', self._handleQueueItem.bind(self));
                setInterval(self._cleanUp.bind(self, methodName), self._cleanUpInterval);
            }
            
            self._ref.child('queue').child('request')
                .on('child_added', self._handleMethodType.bind(self));
            
            self._ref.child('_meta/online').on('value', function (snapshot) {
                var online = snapshot.val();
                if (online) {
                    self._log("APIBase is listening for requests...");   
                }
            });
            
            self._publicizeStatus();
        });
    };

    APIBase.prototype.get = function (methodName) {
        return this._createFunction(methodName);
    };

    APIBase.prototype.retrieve = function () {
        var API = {},
            deferred = this._defer(),
            self = this;

        this._ref.child('_meta/methods').once('value', function (snapshot) {
            snapshot.forEach(function (methodSnapshot) {
                var methodName = methodSnapshot.name();
                API[methodName] = self._createFunction(methodName);
            });
            
            if (self._authState == NOT_STARTED) {
                self._anonymousLogin();
            }
            
            if (self._authState !== COMPLETE) {
                self._pendingResolutions.push(deferred.resolve.bind(deferred, API));
                self._progress();
            } else {
                deferred.resolve(API);
            }
        });

        return deferred.promise;
    };

    APIBase.prototype.auth = function (token, overwriteExistingAuth) {
        var self = this;
        self._authState = IN_PROGRESS;
        self._ref.root().child('.info/authenticated').once('value', function (snapshot) {
            var authenticated = snapshot.val(); 
            
            if (authenticated && !overwriteExistingAuth) return;
            
            self._ref.auth(token.toString(), function (err, data) {
                if (err) { throw err; }
                self._authState = COMPLETE;
                self._user = data.auth;

                self._progress();
            });
        });
    };
    
    APIBase.prototype.setUserData = function (user) {
        var self = this;
        self._ref.root().child('.info/authenticated').once('value', function (snapshot) {
            var authenticated = snapshot.val();
            
            if (!authenticated) 
                throw "setUserData should only be called after you've manually authenticated.";
            
            self._authState = COMPLETE;
            self._user = user;
            self._progress();
        });
    };
    
    APIBase.prototype.context = function (contextObj) {
        this._context = contextObj; 
    };
    
    APIBase.prototype._publicizeStatus = function () {
        var self = this;
        
        self._ref.child('_meta/methods').on('value', function (snapshot) {
            snapshot.ref().set(self._methods); 
        });
        self._ref.child('_meta/methods')
            .onDisconnect().remove();

        self._ref.child('_meta/online').on('value', function (snapshot) {
            snapshot.ref().set(true); 
        });
        self._ref.child('_meta/online')
            .onDisconnect().set(false);
    };

    APIBase.prototype._progress = function () {
        var resId;
        if (this._authState !== COMPLETE) { return false; }
        for (resId = 0; resId < this._pendingResolutions.length; resId += 1) {
            this._pendingResolutions[resId]();
        }
        this._pendingResolutions = [];
        return true;
    };
    
    APIBase.prototype._handleMethodType = function (snapshot) {
        var methodName = snapshot.name();
        if (!this._methods[methodName]) {
            this._log('Unknown method "' + methodName + '" was called. Cleaning up...');
            snapshot.ref().remove();
        }
    };

    APIBase.prototype._handleQueueItem = function (snapshot) {
        var value = snapshot.val(),
            methodName = snapshot.ref().parent().name(),
            ticketName = snapshot.ref().name(),
            self = this,
            finish = function (data) {
                responseRef.setWithPriority(data, root.Firebase.ServerValue.TIMESTAMP);
                snapshot.ref().remove();
            },
            responseRef = this._ref
                .child('queue/response')
                .child(methodName)
                .child(ticketName),
            trafficArgs = snapshot.val().args,
            context = snapshot.val().ctx,
            uid =  snapshot.val().uid,
            originalArgs = [],
            a, arg;
        
        if (!trafficArgs) {
            self._log("ERROR: Request Queue ticket has malformed or no arguments field.");   
            return;
        }
        
        if (!uid) {
            self._log("ERROR: Request Queue ticket has no UID field.");  
            return;
        }
        
        if (trafficArgs == "\\apibase.empty\\") {
            trafficArgs = [];   
        }
        
        for (a = 0; a < trafficArgs.length; a += 1) {
            arg = trafficArgs[a];
            if (arg == "\\apibase.undefined\\") {
                originalArgs.push(undefined);   
            } else if (arg == "\\apibase.null\\") {
                originalArgs.push(null);   
            } else {
                originalArgs.push(arg);
            }
        }
        
        this._apply(methodName, originalArgs, context).then(function (response) {
            finish({success: response, uid: uid});
        }, function (err) {
            self._log('ERROR: ' + err);   
            finish({error: err, uid: uid});
        });
    };

    APIBase.prototype._apply = function (methodName, args, context) {
        // This is probably slow and is generally bad, should be replaced
        // with a non-bad error catching system. I wish async error handling
        // wasn't awful :(
        var d = root.domain.create(),
            methodDeferred = this._defer(),
            response;
        
        args = args || [];
        args.push(methodDeferred.resolve);
        
        d.run((function(context) {
            try {
                response = this[methodName].apply({ctx: context}, args);
                if (response !== undefined) {
                    methodDeferred.resolve(response)   
                }
            } catch (err) {
                methodDeferred.cancel(err); 
            }
        }).bind(this, context)); 

        d.on('error', function(err) {
            methodDeferred.cancel(err);
        });

        return methodDeferred.promise;
    };

    APIBase.prototype._createFunction = function (methodName) {
        if (!this._isServer) {
            return this._remoteFunction.bind(this, methodName);
        } else {
            return this._localFunction.bind(this, methodName);
        }
    };

    APIBase.prototype._remoteFunction = function (methodName) {
        var deferred = this._defer(),
            orginalArgs = Array.prototype.slice.call(arguments, 1),
            trafficArgs = [],
            ticket, arg, a;
        
        for (a = 0; a < orginalArgs.length; a += 1) {
            arg = orginalArgs[a];
            if (typeof arg == "undefined") {
                trafficArgs.push("\\apibase.undefined\\");  
            } else if (arg == null) {
                trafficArgs.push("\\apibase.null\\");
            } else {
                trafficArgs.push(arg);   
            }
        }
            
        if (!trafficArgs.length) {
            trafficArgs = "\\apibase.empty\\";   
        }
        
        if (this._authState !== COMPLETE) {
            this._anonymousLogin();
            this._pendingResolutions.push(
                this._triggerRemote.bind(this, methodName, trafficArgs, deferred)
            );
        }else{
            this._triggerRemote(methodName, trafficArgs, deferred)        
        }
    
        return deferred.promise;
    };
    
    APIBase.prototype._triggerRemote = function (methodName, args, deferred) {
        var ticket = this._ref
                .child('queue/request')
                .child(methodName)
                .push();
        
        ticket.setWithPriority({
                args: args,
                ctx: this._context,
                uid: this._user.uid
            },
            root.Firebase.ServerValue.TIMESTAMP);
        
        this._ref
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
    };

    APIBase.prototype._localFunction = function (methodName) {
        var deferred = this._defer(),
            args = Array.prototype.slice.call(arguments, 1),
            context = this._context;

        args.push(deferred.resolve);

        var perform = (function (args) {
            var resolve = args[args.length - 1],
                result = this[methodName].apply({ctx: this._context}, args);

            if (result !== undefined) {
                resolve(result);
            }
        }).bind(this, args);

        if (typeof process !== "undefined") {
            process.nextTick(perform);
        } else {
            setTimeout(perform, 0);
        }

        return deferred.promise;
    };
    
    APIBase.prototype._anonymousLogin = function (callback) {
        var self = this,
            firebaseName = self._ref.toString().match(/https:\/\/(.+)\.firebaseio.com/)[1],
            url = "https://auth.firebase.com/auth/anonymous?transport=jsonp&firebase=" + firebaseName;
        
        self._authState = IN_PROGRESS;
        self._fetch(url).then(function (auth) {
            if (auth.error) {
                throw "Please enable Anonymous Login on your Firebase. (https://www.firebase.com/docs/security/simple-login-anonymous.html)";   
            }
            self.auth(auth.token);
        });
    };
    
    APIBase.prototype._cleanUp = function(methodName) {
        var self = this;
        this._ref
            .child('queue/response')
            .child(methodName)
            .endAt(new Date().valueOf() - this._cleanUpInterval)
            .once('value', function(snap) {
                if (!snap.numChildren()) return;

                snap.forEach(function(ticketResponse) {
                    ticketResponse.ref().remove();
                });
            });
    },
        
    APIBase.prototype._fetch = function (src) {
        var deferred = this._defer(),
            reqListener;
        if (root.request) {
            root.request(src, function (error, response, body) {
                deferred.resolve(JSON.parse(body));
            });      
        } else {
            var firebaseName = this._ref.toString().match(/https:\/\/(.+)\.firebaseio.com/)[1];
            var callbackName = "apibase_" + this._ref.push().name().replace(/-/g, '');
            window[callbackName] = function (data) {
                deferred.resolve(data);
            };

            var script = document.createElement('script');
            var url = src + "&callback=" + callbackName;
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", url);

            document.getElementsByTagName("head")[0].appendChild(script);  
        }
        return deferred.promise;
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

    APIBase.prototype._log = function () {
        if (typeof window !== "undefined" || typeof module !== "undefined") {
            console.log.apply(this, Array.prototype.slice.call(arguments));
        }
    };

    root = this || {};
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = function (URL) {
            return new APIBase(URL);
        };
        root.Firebase = require('firebase');
        root.domain = require('domain');
        root.request = require('request');
    } else {
        root = window;
        if (!root.Firebase) {
            throw "Please include Firebase.js";
        }
        root.APIBase = APIBase;
    }
}());