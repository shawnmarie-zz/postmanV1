var Newman = require('newman'),
  fs = require('fs'),  
  JSON5 = require('json5');

var collectionJson = JSON5.parse(fs.readFileSync('HACK.json', 'utf8'));

newmanOptions = {
  iterationCount: 1, // define the number of times the runner should run
  outputFile: 'postmanResults.json', // the file to export to
  responseHandler: 'TestResponseHandler', // the response handler to use
  asLibrary: true, // this makes sure the exit code is returned as an argument to the callback function
  stopOnError: true
}

Newman.execute(collectionJson, newmanOptions);