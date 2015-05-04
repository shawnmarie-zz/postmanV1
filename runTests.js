var Newman = require('newman'),
    fs = require('fs'),
    JSON5 = require('json5'),
    btoa = require('btoa'),
    axios = require('axios');

global.getOne = function() {
	console.log("HEY WE ARE IN CUSTOM CODE");
	return 2;
}

var baseUrl = 'https://www14.v1host.com';

function assetJson2CleanJson(original) {
    function processAsset(asset) {   
        var obj = {
            "_links": {
                "self": {
                    "href": baseUrl + asset.href,
                    "id": asset.id
                }
            }
        };
        for (var key in asset.Attributes) {
            var item = asset.Attributes[key];
            if (item._type == "Attribute") {
                obj[item.name] = item.value;
            } else if (item._type == "Relation") {
                obj._links[item.name] = [];
                if (item.value !== null && item.value.href && item.value.idref) {
                    obj._links[item.name] = [{
                        href: baseUrl + item.value.href,
                        idref: item.value.idref
                    }];
                }
            }
        }
        return obj;
    }

    var results = [];

    if (original._type == 'Asset') {
        results.push(processAsset(original));
    }

    if (original._type == 'Assets') {
        for(var i = 0; i < original.Assets.length; i++) {
            var asset = original.Assets[i];
            results.push(processAsset(asset));
        }
    }

    if (results.length < 1) return results;
    if (original._type == 'Asset') return results[0];
    return results;
}

axios.interceptors.response.use(function(res) {
    console.log("running interceptor on response");
    res.data = assetJson2CleanJson(res.data);
    return res;
});

function json2AssetXml(obj) {
  var doc = "<Asset>";
    for(var key in obj)
    {
        var item = obj[key];
        if (item == null) item = "";
        if (key == "_links") continue;
        var attr = '\t<Attribute name="' + key + '" act="set"><![CDATA[' + item + ']]></Attribute>\n';
        doc += attr;

    }
    for (var key in obj._links)
    {
        if (key == 'self') continue;
        var item = obj._links[key];
        var isArray = Object.prototype.toString.call(item) === '[object Array]';
        if (!isArray) {
            var rel = '\t<Relation name="' + key + '" act="set">' +
                '<Asset idref="' + item.idref +'"/></Relation>';
            doc += rel;
        }
    }
    doc += "</Asset>";
    return doc;
}

axios.interceptors.request.use(function (config) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = 'Basic ' + btoa('admin:admin');
    if (config.url.indexOf('json') < 0) config.url += '?accept=application/json';

    if (config.data) {
        config.data = json2AssetXml(config.data);
    }

    console.log("***");
    console.log(config);
    console.log("***");    

    return config;
  }, function (error) {
    console.log("Error in request interceptor:");
    console.error(error);
    // Do something with request error
    return Promise.reject(error);
  });

axios.get(baseUrl + '/v1sdktesting/rest-1.v1/data/Member/20').then(function(res) {
    console.log(JSON.stringify(res.data, null, 2));
}).catch(function(err) {
    console.error(err);
});

axios.post(baseUrl + '/v1sdktesting/rest-1.v1/data/Story', {
    _links: {
        'Scope': { idref: 'Scope:0' }
    },
    Name: "It's a brand new Story"
}).then(function(res) {
    console.log("result:");
    console.log(res);
    console.log(res.data);
}).catch(function(err) {
    console.log("Error handling post");
    console.error(JSON.stringify(err, null, 2));
});

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