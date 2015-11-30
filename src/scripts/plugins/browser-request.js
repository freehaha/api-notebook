
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
  // This is extremely janky, but is required for Safari 7.0 which seems to
  // be ignoring direct property assignments under certain conditions.
  Object.defineProperty(context, 'request', { value: request });
  return next();
};
