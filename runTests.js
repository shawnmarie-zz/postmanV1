var Newman = require('newman'),
    fs = require('fs'),
    JSON5 = require('json5'),
    baseApiUrl = 'https://www14.v1host.com/v1sdktesting/rest-1.v1/Data',
    baseHostUrl = 'https://www14.v1host.com',
    v1hal = require('./lib/v1hal')(baseHostUrl);

global.getOne = function() {
	console.log("HEY WE ARE IN CUSTOM CODE");
	return 2;
}

console.log(baseApiUrl + '/Story');

v1hal.post(baseApiUrl + '/Story', {
    _links: {
        'Scope': { idref: 'Scope:0' }
    },
    Name: "It's a brand new Story"
}).then(function(res) {
    console.log("Post Story result:");
    console.log(JSON.stringify(res.data, ' ', 2));
    console.log('The self link is:');
    console.log(res.data._links.self.href);
    v1hal.get(res.data._links.self.href).then(function(res) {
        console.log(JSON.stringify(res.data, ' ', 2));
    }).catch(function(err) {
        console.error('Error getting story after successful post:');
        console.error(err);
    });
}).catch(function(err) {
    console.error("Error creating new Story:");
    console.error(err);
});

// OLD:

// read the collectionjson file
var collectionJson = JSON5.parse(fs.readFileSync("HACK.json", 'utf8'));

// define Newman options
newmanOptions = {
    //envJson: JSON5.parse(fs.readFileSync("envjson.json", "utf-8")), // environment file (in parsed json format)
    //dataFile: data.csv,                    // data file if required
    iterationCount: 1,                    // define the number of times the runner should run
    outputFile: "outfile.json",            // the file to export to
    responseHandler: "TestResponseHandler", // the response handler to use
    asLibrary: true,                        // this makes sure the exit code is returned as an argument to the callback function
    stopOnError: true
}

// Optional Callback function which will be executed once Newman is done executing all its tasks.
/*
Newman.execute(collectionJson, newmanOptions, function() {
	console.log("Ran newman");
});
*/