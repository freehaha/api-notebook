var $     = require('jquery');
var cache = require('js-cache');

function APIBaseStorage(options) {
  this.options = $.extend(true, {}, options);
  this.nId = options.nId || 'unknown';
  this.viewId = options.viewId;
  return this;
}

APIBaseStorage.prototype._request = function(url, req) {
  return $.ajax(url, req);
};

APIBaseStorage.prototype._getUrl = function(endpoint, annotation) {
  if(annotation) {
    return this.options.host +
      endpoint.replace('{id}', annotation && annotation.id);
  }
  else {
    return this.options.host + endpoint;
  }
};

APIBaseStorage.prototype.create = function(annotation) {
  var url = this._getUrl('/resource', annotation);
  var data = $.extend(true, {}, annotation, {
    resourceType: 'NotebookAnnotation',
    nId: this.nId,
    viewId: this.viewId
  });
  console.debug('create', url);
  data = JSON.stringify(data);
  var req = this._request(url, {
      method: 'POST',
      dataType: 'json',
      data: data,
      contentType: 'application/json'
  });

  var d = $.Deferred();
  req.then(function(ret){
    annotation.id = ret.id;
    d.resolve(annotation);
    console.debug('result', ret);
  }, function(err){
    d.reject(err);
    console.debug('err', err);
  });
  return d;
};

APIBaseStorage.prototype['delete'] = function(annotation) {
  console.log('delete', annotation);
  var url = this._getUrl('/{id}', annotation);
  var d = $.Deferred();
  var req = this._request(url, {
      method: 'DELETE',
      dataType: 'json',
      contentType: 'application/json'
  });
  req.then(function(ret){
    console.debug('annotation deleted', ret);
    d.resolve(true);
  }, function(err){
    d.reject(err);
    console.debug('err', err);
  });

  return d;
};

APIBaseStorage.prototype.query = function() {
  var self = this;
  var cacheId = self.nId;
  var req = cache.get(cacheId);
  var d = $.Deferred();
  if(!req) {
    var url = this._getUrl('/search');
    console.debug('query', url);
    req = this._request(url, {
        method: 'GET',
        dataType: 'json',
        data: {
          type: 'Resource',
          q: '_rtName:NotebookAnnotation AND data:"\\"nId\\":\\"' +
            this.nId + '\\""'
        },
        contentType: 'application/json'
    });
    cache.set(cacheId, req, 300000);
  }
  req.then(function(ret){
    var anns = ret.map(function(item) {
      var id = item.id;
      var annotation = JSON.parse(item.data);
      annotation.id = id;
      return annotation;
    });
    anns = anns.filter(function(item) {
      return item.viewId === self.viewId;
    });
    d.resolve({results: anns, meta: {total: anns.length}});
    console.debug('result', ret);
  }, function(err){
    d.reject(err);
    console.debug('err', err);
  });
  return d;
};

APIBaseStorage.prototype.update = function(annotation) {
  var url = this._getUrl('/resource/{id}', annotation);
  var data = $.extend(true, {}, annotation, {
    nId: this.nId,
    viewId: this.viewId
  });
  console.debug('update', url);
  delete data.id;
  data = JSON.stringify(data);
  var req = this._request(url, {
      method: 'PUT',
      dataType: 'json',
      data: data,
      contentType: 'application/json'
  });

  var d = $.Deferred();
  req.then(function(ret){
    d.resolve(annotation);
    console.debug('result', ret);
  }, function(err){
    d.reject(err);
    console.debug('err', err);
  });
  return d;
};
/**
 * function:: apibase([options])
 *
 * A storage module to read/write annotation stored in ABIBase
 *
 */
module.exports = function apibase(options) {
  var notify = function() {};

  if (typeof options === 'undefined' || options === null) {
    options = {};
  }

  var storage = new APIBaseStorage(options);
  return {
    configure: function(registry) {
      registry.registerUtility(storage, 'storage');
    },
    start: function(app) {
      notify = app.notify;
    }
  };
};


