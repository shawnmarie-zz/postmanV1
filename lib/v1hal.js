(function() {
  var btoa = require('btoa'),
    axios = require('axios');

  function assetJson2CleanJson(baseHostUrl, original) {
    function processAsset(asset) {
      var obj = {
        "_links": {
          "self": {
            "href": baseHostUrl + asset.href,
            "id": asset.id
          }
        }
      };
      for (var key in asset.Attributes) {
        var item = asset.Attributes[key];
        if (item._type == "Attribute") {
          obj[item.name] = item.value;
        } else if (item._type == "Relation") {
          // TODO: handle multi-value relations properly by setting obj._links[item.name] to an Array
          obj._links[item.name] = {};
          if (item.value !== null && item.value.href && item.value.idref) {
            obj._links[item.name] = {
              href: baseHostUrl + item.value.href,
              idref: item.value.idref
            };
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
      for (var i = 0; i < original.Assets.length; i++) {
        var asset = original.Assets[i];
        results.push(processAsset(asset));
      }
    }

    if (results.length < 1) return results;
    if (original._type == 'Asset') return results[0];
    return results;
  };

  function json2AssetXml(obj) {
    var doc = "<Asset>";
    for (var key in obj) {
      var item = obj[key];
      if (item == null) item = '';
      if (key == "_links") continue;
      var attr = '\t<Attribute name="' + key + '" act="set"><![CDATA[' + item + ']]></Attribute>\n';
      doc += attr;

    }
    for (var key in obj._links) {
      if (key == 'self') continue;
      var item = obj._links[key];
      var isArray = Object.prototype.toString.call(item) === '[object Array]';
      if (!isArray) {
        var rel = '\t<Relation name="' + key + '" act="set">' +
          '<Asset idref="' + item.idref + '"/></Relation>';
        doc += rel;
      }
    }
    doc += "</Asset>";
    return doc;
  }

  module.exports = function(baseHostUrl, creds) {
    creds = creds || 'admin:admin';

    axios.interceptors.request.use(function(config) {
      config.headers = config.headers || {};
      config.headers.Authorization = 'Basic ' + btoa(creds);
      
      var accepts = 'accept=application/json';
      if (config.url.indexOf('?') < 0) { 
        accepts = '?' + accepts;
      }
      else accepts = '&' + accepts;
      config.url += accepts;

      if (config.data) {
        config.data = json2AssetXml(config.data);
      }

      return config;
    }, function(error) {
      console.error("v1hal error in request interceptor:");
      console.error(error);
      console.error("Stringified errors:");
      console.error(JSON.stringify(error.data.exceptions));
      return Promise.reject(error);
    });

    axios.interceptors.response.use(function(res) {
      res.data = assetJson2CleanJson(baseHostUrl, res.data);
      return res;
    }, function(error) {
      console.error('v1hal error in response interceptor:');      
      console.error(error);
      console.error("Stringified errors:");
      console.error(JSON.stringify(error.data.exceptions));      
      return Promise.reject(error);
    });

    return axios;
  };

}());