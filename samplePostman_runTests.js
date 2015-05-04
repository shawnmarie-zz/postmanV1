var Newman = require('newman'),
  fs = require('fs'),
  JSON5 = require('json5'),
  baseApiUrl = 'http://localhost/versionone/rest-1.v1/Data/',
  baseHostUrl = 'http://localhost',
  _ = require('lodash'),
  v1hal = require('./lib/v1hal')(baseHostUrl),
  util = require('util');
_.mixin(require('lodash-deep'));

// OLD:

// read the collectionjson file
var collectionJson = JSON5.parse(fs.readFileSync("HACK.json", 'utf8'));

// define Newman options
newmanOptions = {
  iterationCount: 1, // define the number of times the runner should run
  outputFile: "outfile.json", // the file to export to
  responseHandler: "TestResponseHandler", // the response handler to use
  asLibrary: true, // this makes sure the exit code is returned as an argument to the callback function
  stopOnError: true
}

// Optional Callback function which will be executed once Newman is done executing all its tasks.


fs.readFile('postmanTestsToV1AssetMap.json', function read(err, data) {
  if (err) console.error(err);
  else {
    postmanTestsToV1AssetMap = JSON.parse(data);

    Newman.addEventListener("iterationRunnerResultsAvailable", function(response) {
      var map = {};
      _.forEach(response.results, function(item) {
        map[item.id] = item.name;
      });

      _.forEach(map, function(storyNumber, postmanTestId) {
        if (_.has(postmanTestsToV1AssetMap, postmanTestId)) {
          var assetId = postmanTestsToV1AssetMap[postmanTestId];
          assetId = assetId.replace(':', '/');
          v1hal.post(baseApiUrl + assetId, {
            Name: storyNumber
          })
            .then(function(res) {
              console.log("Successfully updated the V1 Test asset:");
              console.log(res.data);
            })
            .catch(function(error) {
              console.error("Error in updating V1 Test asset after Postman test run:");
              console.error(error);
            });
        } else {
          // TODO storyNumber should use regex patter match, not assume name === storyNumber
          v1hal.post(baseApiUrl + "Test", {
            _links: {
              'Parent': {
                idref: storyNumber
              }
            },
            Name: storyNumber
          })
            .then(function(res) {
              var id = res.data._links.self.id;
              var momentLessId = id.substr(0, id.lastIndexOf(':'));
              postmanTestsToV1AssetMap[postmanTestId] = momentLessId;

              fs.writeFile('postmanTestsToV1AssetMap.json', JSON.stringify(postmanTestsToV1AssetMap), function(err) {
                if (err) return console.error(err);
                else console.log('Updated postmanTestsToV1AssetMap.json with latest mappings...');
              });

            })
            .catch(function(error) {
              console.error("Error in creating V1 Test asset after Postman test run:");
              console.error(error);
            });
        }
      });

    });

    Newman.execute(collectionJson, newmanOptions);

  }
});


/*
  v1hal.get(baseApiUrl + "Test?where=Parent='Story:6150'&sel=ID")
  .then(function(res) {
    var idrefs = _.deepPluck(res.data, '_links.ID.idref');
    console.log(idrefs);
  })
  .catch(function(err) {
    console.error("Error getting Test:");
    console.error(err);
  });  
  */