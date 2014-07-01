var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

// Set a context to be "this" when an APIBase method is called server-side
// This object should be used to easily transmit session tokens and similar tokens
apibase.context({
    name: "Abe"
});

// Option 1 - Call retrieve to get an object with all exposed API methods
apibase.retrieve().then(function(API) {
    API.greeting().then(function (result) {
        console.log('1');
        console.log(result); // Should be Hello Abe from context
    });
    
    API.search("Fish").then(function (result) {
        console.log('2');
        console.log(result);
    });
    
    API.fail("This will fail.").then(function (result) {
        console.log("Success");
    }, function (err) {
        console.log('3');
        console.log("Error: " + err);   
    });
    
    API.rest(100).then(function (result) {
        console.log('4');
        console.log("Success: " + result);
    }, function (err) {
        console.log("Error: " + err);   
    });
    
    API.restFail(100).then(function (result) {
        console.log("Success: " + result);
    }, function (err) {
        console.log('5');
        console.log("Error: " + err);   
    });
});

// Option 2 - Call a method directly and hope the server knows this method.
var search = apibase.get('search');

search("Blind Fish").then(function (result) {
    console.log('0');
    console.log(result);
});
