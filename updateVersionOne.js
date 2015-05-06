var _ = require('lodash'),
  util = require('util'),
  FS = require('q-io/fs'),
  program = require('commander');

program
  .version('0.0.1')
  .option('-i --instanceUrl <instanceUrl>', 'Set the V1 instance URL to use', 'https://www14.v1host.com/v1sdktesting')
  .option('-u --user <user:password>', 'Set the V1 instance user credentials', 'admin:admin')
  .option('-a --assetPattern <assetPattern>', 'Set the RegExp pattern to use for extracting the V1 asset OID from the Postman test title', '[A-Z,a-z]+:[0-9]+')
  .option('-c --configFileName <configFileName>', 'Set the filename to store the mappings of Postman test IDs to V1 asset OIDs', 'postmanTestsToV1AssetMap.json')
  .option('-p --postmanResultsFileName <postmanResultsFileName)', 'Set the filename from which read the postman results', 'postmanResults.json')
  .parse(process.argv);

var instanceUrl = program.instanceUrl;
var user = program.user;
var assetPattern = program.assetPattern;
var configFileName = program.configFileName;
var postmanResultsFileName = program.postmanResultsFileName;

// ex: https://www14.v1host.com/v1sdktesting
if (instanceUrl[instanceUrl.length] !== '/') instanceUrl += '/';
var baseApiUrl = instanceUrl + 'rest-1.v1/Data/';
// ex: baseApiUrl = 'https://www14.v1host.com/v1sdktesting/rest-1.v1/Data/',    
var baseHostUrl = instanceUrl.substr(0, instanceUrl.lastIndexOf('/'));
// ex: baseHostUrl = 'https://www14.v1host.com',

console.log('Using V1 instance at: ' + instanceUrl);

var v1hal = require('./lib/v1hal')(baseHostUrl, user);

function getV1TestStatusFromPostmanFailCount(failCount) {
  if (failCount > 0) return 'TestStatus:155';
  else return 'TestStatus:129';
}

function getAssetOid(str) {
  var matches = str.match(assetPattern);
  if (matches && 0 < matches.length) return matches[0];
  return '';
}

var postmanTestsToV1AssetMap = {};

FS.isFile(configFileName)
  .then(function(exists) {
    if (!exists) return FS.write(configFileName, '{}');
    return true;
  })
  .then(function() {
    return FS.read(configFileName);
  })
  .then(function(json) {
    json = json || '{}';
    postmanTestsToV1AssetMap = JSON.parse(json);
    return postmanTestsToV1AssetMap;
  }).then(function() {
    return FS.read(postmanResultsFileName)
  }).then(function(postmanResultsJson) {
    postmanResultsJson = postmanResultsJson || '{}';
    var postmanResults = JSON.parse(postmanResultsJson);
    
    var testDataMap = {};

    _.forEach(postmanResults.results, function(item) {
      var assetOid = getAssetOid(item.name);
      testDataMap[item.id] = {
        assetOid: assetOid,
        name: item.name,
        failCount: item.totalPassFailCounts.fail
      };
    });

    _.forEach(testDataMap, function(testData, postmanTestId) {
      if (_.has(postmanTestsToV1AssetMap, postmanTestId)) {
        var assetId = postmanTestsToV1AssetMap[postmanTestId];
        assetId = assetId.replace(':', '/');
        v1hal.post(baseApiUrl + assetId, {
          _links: {
            Status: {
              idref: getV1TestStatusFromPostmanFailCount(testData.failCount)
            }
          }
        })
          .then(function(res) {
            console.log('Successfully updated existing V1 Test asset:');
            console.log(res.data);
          })
          .catch(function(err) {
            console.error('Error in updating V1 Test asset after Postman test run:');
            console.error(err);
          });
      } else {
        v1hal.post(baseApiUrl + 'Test', {
          _links: {
            Parent: {
              idref: testData.assetOid
            },
            Status: {
              idref: getV1TestStatusFromPostmanFailCount(testData.failCount)
            }
          },
          Name: testData.name
        })
          .then(function(res) {
            var id = res.data._links.self.id;
            var momentLessId = id.substr(0, id.lastIndexOf(':'));
            postmanTestsToV1AssetMap[postmanTestId] = momentLessId;
            console.log('Created new V1 Test asset:');
            console.log(res.data);
            return FS.write(configFileName, JSON.stringify(postmanTestsToV1AssetMap))
          })
          .then(function() {
            console.log('Updated ' + configFileName + ' with new mapping.');
          })
          .catch(function(error) {
            console.error('Error in creating V1 Test asset after Postman test run:');
            console.error(error);
          });
      }
    });
  })
  .catch(function(error) {
    console.error('Error processing Newman results and updating VersionOne:');
    console.error(error);
  });