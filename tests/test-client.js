var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.retrieve().then(function(API) {
    API.search("Fish").then(function (result) {
        console.log(result);
    });
    
    API.fail("Fish").then(function (result) {
        console.log("Success");
    }, function (err) {
        console.log("Error: " + err);   
    });
    
    API.rest(100).then(function (result) {
        console.log("Success: " + result);
    }, function (err) {
        console.log("Error: " + err);   
    });
});

apibase.get('search')("Blind Fish").then(function (result) {
    console.log(result);
});
