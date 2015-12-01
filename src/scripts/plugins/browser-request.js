/* global App */
// var _         = App.Library._;
var url       = App.Library.url;
var PROXY_URL = process.env.plugins.proxy && process.env.plugins.proxy.url;

/**
 * The request object is used in the execution context.
 *
 * @type {Object}
 */
var request = require('browser-request');

/**
 * Alter the context to include the RAML client generator.
 *
 * @param {Object}   data
 * @param {Function} next
 */
exports['sandbox:context'] = function (context, next) {
  var r = function() {
    var self = this;
    var opts = arguments[0];
    if(opts.url) {
      opts.uri = opts.url;
      delete opts.url;
    }

    if(opts.uri) {
      var uri   = url.parse(opts.uri);

      // Attach the proxy if the url is not a relative url.
      if (uri.protocol && uri.host) {
        opts.uri = url.resolve(window.location.href, PROXY_URL) +
          '/' + opts.uri;
      }
    }
    
    request.apply(self, arguments);
  };
  // add shortcuts, source copied from browser-request
  var shortcuts = [ 'get', 'put', 'post', 'head' ];
  shortcuts.forEach(function(shortcut) {
    var method = shortcut.toUpperCase();
    var func   = shortcut.toLowerCase();

    r[func] = function(opts) {
      if(typeof opts === 'string') {
        opts = {'method':method, 'uri':opts};
      }
      else {
        opts = JSON.parse(JSON.stringify(opts));
        opts.method = method;
      }

      var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
      return r.apply(this, args);
    };
  });

  Object.defineProperty(context, 'request', { value: r });
  return next();
};
