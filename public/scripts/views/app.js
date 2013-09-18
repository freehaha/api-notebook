var _        = require('underscore');
var domify   = require('domify');
var Backbone = require('backbone');

var View     = require('./view');
var Notebook = require('./notebook');
var controls = require('../lib/controls');

var state       = require('../state/state');
var messages    = require('../state/messages');
var persistence = require('../state/persistence');

/**
 * Create a central application view.
 *
 * @type {Function}
 */
var App = module.exports = View.extend({
  className: 'application'
});

/**
 * Keep track of all events that can be triggered from the DOM.
 *
 * @type {Object}
 */
App.prototype.events = {
  'click .modal-toggle':   'toggleShortcuts',
  'click .modal-backdrop': 'hideShortcuts',
  'click .notebook-exec':  'runNotebook',
  'click .notebook-fork':  'forkNotebook',
  'click .notebook-auth':  'authNotebook'
};

/**
 * Runs when we create an instance of the applications. Starts listening for
 * relevant events to respond to.
 */
App.prototype.initialize = function () {
  this.notebook = new Notebook();

  // Start up the history router, which will trigger the start of other
  // subsystems such as persistence and authentication.
  Backbone.history.start({
    pushState: false
  });

  this.updateUser();
  this.listenTo(persistence, 'changeUser',      this.updateUser,      this);
  this.listenTo(messages,    'keydown:Esc',     this.hideShortcuts,   this);
  this.listenTo(messages,    'keydown:Shift-/', this.toggleShortcuts, this);
};

/**
 * Remove the application view from the DOM.
 *
 * @return {App}
 */
App.prototype.remove = function () {
  this.notebook.remove();
  Backbone.history.stop();
  return View.prototype.remove.call(this);
};

/**
 * Updates the template when the user or document owner changes.
 *
 * @return {App}
 */
App.prototype.updateUser = function () {
  var isAuth  = persistence.isAuthenticated();
  var isOwner = persistence.isOwner();

  this.el.classList[isOwner  ? 'add' : 'remove']('user-is-owner');
  this.el.classList[!isOwner ? 'add' : 'remove']('user-not-owner');
  this.el.classList[isAuth   ? 'add' : 'remove']('user-is-authenticated');
  this.el.classList[!isAuth  ? 'add' : 'remove']('user-not-authenticated');

  // Adding and removing some of these classes cause the container to resize.
  messages.trigger('resize');

  return this;
};

/**
 * Shows the shortcut modal.
 */
App.prototype.showShortcuts = function () {
  this.el.classList.add('modal-visible');
};

/**
 * Hides the shortcut modal.
 */
App.prototype.hideShortcuts = function () {
  this.el.classList.remove('modal-visible');
};

/**
 * Toggle the visibility of the shortcut modal window.
 */
App.prototype.toggleShortcuts = function () {
  if (this.el.classList.contains('modal-visible')) {
    this.hideShortcuts();
  } else {
    this.showShortcuts();
  }
};

/**
 * Render the applications `innerHTML`.
 *
 * @return {App}
 */
App.prototype.render = function () {
  this.notebook.render();
  View.prototype.render.call(this);

  this.el.appendChild(domify(
    '<header class="notebook-header clearfix">' +
      '<div class="notebook-header-primary">' +
        '<h1>JSNotebook</h1>' +
      '</div>' +

      '<div class="notebook-header-secondary">' +
        '<button class="btn-text notebook-fork">Make my own copy</button>' +
        '<button class="btn-text notebook-auth">' +
          'Authenticate' +
        '</button>' +
        '<button class="notebook-exec">Run All</button>' +
        '<button class="ir modal-toggle">Keyboard Shortcuts</button>' +
      '</div>' +
    '</header>' +

    '<div class="banner notebook-auth">' +
      '<p>Please authenticate to save the notebook.</p>' +
    '</div>' +

    '<div class="modal-backdrop"></div>'
  ));

  var allControls = controls.editor.concat(controls.code).concat(controls.text);

  var controlMap = _.map(allControls, function (control) {
    return '<tr>' +
      '<td>' + (control.keyCode || control.shortcut) + '</td>' +
      '<td>' + control.description + '</td>' +
    '</tr>';
  });

  this.el.appendChild(domify(
    '<div class="modal">' +
      '<header class="modal-header">' +
        '<h3>Keyboard Shortcuts</h3>' +
      '</header>' +

      '<div class="modal-body">' +
        '<table>' +
          '<colgroup>' +
            '<col class="col-mini">' +
            '<col class="col-large">' +
          '</colgroup>' +
          '<tr>' +
            '<th>Key Combination</th>' +
            '<th>Action</th>' +
          '</tr>' +
          controlMap.join('') +
        '</table>' +
      '</div>' +
    '</div>'
  ));

  return this;
};

/**
 * Append the application view to an element.
 *
 * @return {App}
 */
App.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);
  this.notebook.appendTo(this.el);
  messages.trigger('resize');
  return this;
};

/**
 * Runs the entire notebook sequentially.
 */
App.prototype.runNotebook = function () {
  this.notebook.execute();
};

/**
 * Authenticate with the persistence layer.
 */
App.prototype.authNotebook = function () {
  persistence.authenticate();
};

/**
 * Fork the current notebook in-memory.
 */
App.prototype.forkNotebook = function () {
  persistence.fork();
};