APIBase.js
=======

APIBase is an absurdly easy way to expose an API in NodeJS and communicate with it all through Firebase. APIBase takes care of the technical details like queueing and leaves you with a simple API to build your API on. 

Quickstart
----------

For the server portion in node:

```js
var apibase = require('apibase')("<Your Firebase>/apibase");

// optionally call apibase.auth with a token to authenticate
// apibase.auth(TOKEN);

// Any methods you put on apibase will be exposed publically via your API
apibase.hello = function (name) {   
    return 'HELLO MY BEST FRIEND ' + name;
};

apibase.fail = function (search) {   
    throw search;
    return "This shouldnt happen.";
};

// API methods are passed a "deferred" object with resolve/cancel methods.
apibase.rest = function (time, deferred) {
    setTimeout(function () {
        deferred.resolve("Coming from a promise!");
        // deferred.cancel to pass an error
    }, time);
};

// Calling publish allows clients to connect to your API
apibase.publish();
```

For the client portion in a browser:

```js
var apibase = new APIBase("<Your Firebase>/apibase");

// optionally call apibase.auth with a token to authenticate
// apibase.auth(TOKEN);

// We can retreive an object with our API methods
apibase.retreive().then(function(API) {
    // Then call any API method
    API.hello("Abe").then(function (result) {
        // These methods return promises, because
        // all API calls are asynchronous
        alert(result);
    }, function (err) {
        // Provide a second callback to handle errors
    });
    
    API.rest(1000).then(function (result) {
        alert(result);
    });
});
```

Alternatively, if you don't want to fetch the entire method list on the client, you can "blindly" call an API method like this...

```js
// Load a specific method
var hello = apibase.get('hello');

// Then call it like a normal function!
hello("Blind Fish").then(function (result) {
    console.log(result);
});

```

Credits
-------

Development of this library is sponsored by [Rigidflame Consultants](http://www.rigidflame.com).