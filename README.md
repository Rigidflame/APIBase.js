APIBase.js
=======

APIBase is an absurdly easy way to expose an API in NodeJS and communicate with it all through Firebase. APIBase takes care of the technical details like queueing and leaves you with a simple API to build your API on. 

Quickstart
----------

For the server portion in node:

```js
var apibase = require('apibase')("<Your Firebase>/apibase");

apibase.search = function (search) {   
    return 'I LIKE SEARCHING FOR ' + search;
};

apibase.fail = function (search) {   
    throw search;
    return "This shouldnt happen.";
};


apibase.publish();
```

For the client portion in a browser:

```js
var apibase = new APIBase("<Your Firebase>/apibase");

apibase.retreive().then(function(API) {
    API.search(phrase).then(function (result) {
        alert(result);
    });
});
```

Alternatively, if you don't want to fetch the entire method list on the client, you can "blindly" call an API method like this...

```js
var search = apibase.get('search');
search("Blind Fish").then(function (result) {
    console.log(result);
});

```

Documentation
---------------

APIBase consists of two parts, the server and the client. These will both use the same APIBase.js file, but will invoke different methods. To get started, create a new APIBase which points to your Firebase.

```js
var apibase = require('../apibase')("<Your Firebase>/apibase");
```

The next step is to add some API methods straight onto the APIBase object. These methods will be what are exposed to your clients.

```js
apibase.search = function (search) {   
    return 'I LIKE SEARCHING FOR ' + search;
};

apibase.fail = function (search) {   
    throw search;
    return "This shouldnt happen.";
};
```

APIBase knows which methods you've added and will expose these to clients. The last step on the server is to publish your API by calling `.publish()`.

```js
apibase.publish();
```

That's it! You now have an API set up. A client is set up in a very similar way, except we will use the `.retreive()` method to fetch the API methods we can use.

```js
apibase.retreive().then(function(API) {
    // API will expose the .search and .fail methods
});
```
        
The methods on `API` are asynchronous, so they return a promise which can be passed a success and failure/error callback. 

```js
var apibase = require('../apibase')("<Your Firebase>/apibase");

apibase.retreive().then(function(API) {

    // We call search and pass only a success callback
    API.search("Fish").then(function (result) {
        console.log(result);
    });

    // We call fail (a message which always throws an error)
    // and pass both a success and error callback
    API.fail("Fish").then(function (result) {
        // This won't be called
        console.log("Success");
    }, function (err) {
        // This will.
        console.log("Error: " + err);   
    });
});
```

This makes it extremely easy to build powerful, fast APIs on top of Firebase without worrying about the communication and sync details!

Credits
-------

Development of this library is sponsored by [Rigidflame Consultants](http://www.rigidflame.com).