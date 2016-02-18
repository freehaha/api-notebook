/*package annotator.identity */

'use strict';
var util = require('annotator/src/util');
var persistence = require('../state/persistence');
var notifyError = require('../lib/notify-error');
var Promise = util.Promise;


var SimpleIdentityPolicy;


function appendIdentity(annotation, identity) {
  var userId = identity.who();
  var title = identity.title();
  annotation.user = userId;
  annotation.userTitle = title;
  annotation.permissions = {
    delete: [userId],
    edit: [userId]
  };
}
/**
 * function:: simple()
 *
 * A module that configures and registers an instance of
 * :class:`annotator.identity.SimpleIdentityPolicy`.
 */
exports.simple = function simple() {
  var identity = new SimpleIdentityPolicy();

  return {
    configure: function (registry) {
      registry.registerUtility(identity, 'identityPolicy');
    },
    beforeAnnotationCreated: function (annotation) {
      if(persistence.get('userId')) {
        appendIdentity(annotation, identity);
        return;
      }
      var p = new Promise(function(resolve, reject) {
        persistence.authenticate(function(err) {
          if(err) {
            notifyError('Failed to authenticate!')(err);
            reject(err);
            return;
          }
          appendIdentity(annotation, identity);
          resolve(annotation);
        });
      });
      return p;
    }
  };
};


/**
 * class:: SimpleIdentityPolicy
 *
 * A simple identity policy that considers the identity to be an opaque
 * identifier.
 */
SimpleIdentityPolicy = function SimpleIdentityPolicy() {
  /**
   * data:: SimpleIdentityPolicy.identity
   *
   * Default identity. Defaults to `null`, which disables identity-related
   * functionality.
   *
   * This is not part of the identity policy public interface, but provides a
   * simple way for you to set a fixed current user::
   *
   *     app.ident.identity = 'bob';
   */
  this.identity = null;
};
exports.SimpleIdentityPolicy = SimpleIdentityPolicy;


/**
 * function:: SimpleIdentityPolicy.prototype.who()
 *
 * Returns the current user identity.
 */
SimpleIdentityPolicy.prototype.who = function () {
  return persistence.get('userId');
  // return this.identity;
};
SimpleIdentityPolicy.prototype.title = function () {
  return persistence.get('userTitle');
  // return this.identity;
};
