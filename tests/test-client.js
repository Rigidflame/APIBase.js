var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.retreive().then(function(API) {
    console.log(API);
    API.search("Fish").then(function (result) {
        console.log(result);
    });
    
    API.fail("Fish").then(function (result) {
        console.log("Success");
    }, function (err) {
        console.log("Error: " + err);   
    });
});
