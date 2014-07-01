APIBase.js
=======

APIBase is an absurdly easy way to expose an API in NodeJS and communicate with it all through Firebase. APIBase takes care of the technical details like queueing and leaves you with a simple API to build your API on. 

Basic Usage
----------
To begin, you must **enable Anonymous Login** on your Firebase. Then **install the security rules** which are specified in `rules.json`.  

Create a `server.js` file which will be run in Node. 

```js
var apibase = require('apibase')("<Your Firebase>/apibase");

// If you're using the recommended APIBase security rules
// Your server must authenticate with your Firebase Secret.
apibase.auth(SECRET);

// Any methods you put on apibase will be exposed publically via your API
apibase.hello = function (name) {   
    return 'Hello ' + name;
};

// API methods are passed a `done` method which can be used in place of "return"
apibase.rest = function (time, done) {
    setTimeout(function () {
        done("Coming from a promise!");
    }, time);
};

apibase.publish();
```

Create a `client.js` file which can be included on your webpage (or ran in Node as well).

```js
var apibase = new APIBase("<Your Firebase>/apibase");

apibase.retrieve().then(function(API) {

    API.hello("Abe").then(function (result) {
        alert(result);
    }, function (err) {
        alert(err);
    });
    
    API.rest(1000).then(function (result) {
        alert(result);
    });
});
```

Then, run `node server.js` and open your `client.js` file in a browser and you're done!

Using a Context
-------------
APIBase supports use of a context which is passed to your API methods when they are invoked server-side as `this.ctx`. A context is an object which can contain arbitrary data which is required for most method calls (like a session token).

A client specifies a new context with `APIBase.context`.

```js
apibase.context({
    name: "Abe"
});

apibase.get("greet")().then(function (greeting) {
    console.log(greeting); // Logs "Hello Abe"
});
```

Using context on the server simply requires reading a field from `this.ctx`.

```js
apibase.greet = function () {
    return "Hello " + this.ctx.name;
};

// Calling publish allows clients to connect to your API
apibase.publish();
```

The context will be sent will every method call until a different context is specified. 

Using Blind Methods
------------------

Although it is generally easier to use `retrieve()` to fetch an object with all known API methods, you can alternatively user blind calls to API methods. Blind calls run the risk of silently failing if the server is not aware of the method being accessed. However, they can be slightly faster if your API consists of hundreds or thousands of methods which would be slow to sync to the client. 

```js
var hello = apibase.get('hello');

hello("Blind Fish").then(function (result) {
    console.log(result);
});

```


Authentication
--------------

By default APIBase uses Anonymous Login on the client to ensure secure communication with your server. However, custom authentication can be used in two different ways.

### Option 1: Calling APIBase.auth 

An APIBase instance provides an `auth` method which takes a valid Firebase Auth token. When `auth` is called, APIBase will unauth any existing authentication on the Firebase (from, for example, Simple Login) then authenticate with the new token. This method is great if you're using a custom authentication system where your clients retrieve the tokens and would normally just call `FirebaseRef.auth`.

### Option 2: Calling APIBase.setUserData

If you're user is already logged in via Simple Login or another method, it can be difficult to retrieve the current authenication token which would be needed by `APIBase.auth`. Alternatively, you can call `setUserData` with a `user` object. APIBase will assume that the `uid` field on the `user` object will be the same as the UID which your Firebase is currently authenticated with. 

Here is an example integration of APIBase with Firebase Simple Login.

```js
var URL = 'https://<YOUR-FIREBASE>.firebaseio.com';
var ref = new Firebase(URL);
var apibase = new APIBase(ref.child('api'));

var auth = new FirebaseSimpleLogin(ref, function(error, user) {
  if (error) {
    // an error occurred while attempting login
    console.log(error);
  } else if (user) {
    // user authenticated with Firebase
    console.log('User ID: ' + user.uid + ', Provider: ' + user.provider);
    
    // Tell APIBase that our user data has changed
    apibase.setUserData(user);
  } else {
    // user is logged out
  }
});
```

Credits
-------

Development of this library is sponsored by [Rigidflame Consulting](http://www.rigidflame.com).