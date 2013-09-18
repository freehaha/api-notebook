var _        = require('underscore');
var trim     = require('trim');
var View     = require('./view');
var Backbone = require('backbone');

var CodeView           = require('./code-cell');
var TextView           = require('./text-cell');
var EditorView         = require('./editor-cell');
var CellControls       = require('./cell-controls');
var EntryModel         = require('../models/cell');
var NotebookCollection = require('../collections/notebook');

var Sandbox     = require('../lib/sandbox');
var insertAfter = require('../lib/browser/insert-after');
var persistence = require('../state/persistence');

/**
 * Create a new notebook instance.
 *
 * @type {Function}
 */
var Notebook = module.exports = View.extend({
  className: 'notebook'
});

/**
 * Runs when a new notebook instance is created.
 *
 * @param  {Object} options
 */
Notebook.prototype.initialize = function (options) {
  this.sandbox    = new Sandbox();
  this.controls   = new CellControls().render();
  this.collection = new NotebookCollection();

  // If the user changes at any point in the applications state, we may now
  // be granted the ability to edit, fork.. or we may have lost the ability
  this.listenTo(persistence, 'changeUser',    this.updateUser);
  this.listenTo(persistence, 'resetNotebook', this.render);
};

/**
 * Removes the notebook from the DOM.
 *
 * @return {Notebook}
 */
Notebook.prototype.remove = function () {
  persistence.reset();
  this.sandbox.remove();
  return View.prototype.remove.call(this);
};

/**
 * Update the notebook contents and save to the persistence layer.
 *
 * @param {Function} done
 */
Notebook.prototype.update = function (done) {
  // If we are currently in an update operation, set a flag to remind
  // ourselves to process the data once we are free.
  if (this._updating) { return this._updateQueue = true; }

  this._updating = true;
  // Serialize the notebook and set the persistant notebook contents
  persistence.update(this.collection.toJSON(), _.bind(function (err, notebook) {
    this._updating = false;
    if (this._updateQueue) {
      this._updateQueue = false;
      this.update();
    }

    return done && done(err, notebook);
  }, this));
};

/**
 * Updates the current users display status. E.g. Unauthorized users can't
 * edit notebook cells.
 *
 * @return {Notebook}
 */
Notebook.prototype.updateUser = function () {
  this.collection.each(function (model) {
    model.view.renderEditor();
  });

  return this;
};

/**
 * Render the notebook view.
 *
 * @return {Notebook}
 */
Notebook.prototype.render = function () {
  this.stopListening(this.collection);
  this.collection.each(function (model) {
    model.view.remove();
  });

  View.prototype.render.call(this);
  this.collection = new NotebookCollection();
  this.listenTo(this.collection, 'remove sort change', this.update);

  persistence.deserialize(_.bind(function (err, cells) {
    // Empty all the current content to reset with new contents
    _.each(cells, function (cell) {
      var appendView = 'appendCodeView';
      if (cell.type === 'text') { appendView = 'appendTextView'; }
      this[appendView](null, cell.value);
    }, this);

    if (!this.collection.length) { this.appendCodeView(); }

    this.collection.last().view.focus();
  }, this));

  return this;
};

/**
 * Append the notebook view to an element.
 *
 * @return {Notebook}
 */
Notebook.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);

  // Any editor cells will need refreshing to display properly.
  this.collection.each(function (model) {
    if (model.view && model.view.editor) {
      model.view.editor.refresh();
    }
  });

  return this;
};

/**
 * Execute the entire notebook sequentially.
 *
 * @param  {Function} done
 */
Notebook.prototype.execute = function (done) {
  var that = this;
  this.execution = true;

  // This chaining is a little awkward, but it allows the execution to work with
  // asynchronous callbacks.
  (function execution (view) {
    // If no view is passed through, we must have hit the last view.
    if (!view) {
      that.execution = false;
      return done && done();
    }

    view.focus().moveCursorToEnd();

    if (view.model.get('type') === 'code') {
      view.execute(function (err, data) {
        execution(that.getNextView(view));
      });
    } else {
      execution(that.getNextView(view));
    }
  })(this.collection.at(0).view);
};

/**
 * Returns the next view in the notebook.
 *
 * @param  {Object} view
 * @return {Object}
 */
Notebook.prototype.getNextView = function (view) {
  var model = this.collection.getNext(view.model);
  return model && model.view;
};

/**
 * Returns the previous view in the notebook.
 *
 * @param  {Object} view
 * @return {Object}
 */
Notebook.prototype.getPrevView = function (view) {
  var model = this.collection.getPrev(view.model);
  return model && model.view;
};

/**
 * Refresh all notebook cells from the current view instance.
 *
 * @param  {Object}   view
 * @return {Notebook}
 */
Notebook.prototype.refreshFromView = function (view) {
  do {
    view.refresh();
  } while (view = this.getNextView(view));

  return this;
};

/**
 * Append a new code cell view instance.
 *
 * @param  {Node}     el
 * @param  {String}   value
 * @return {CodeView}
 */
Notebook.prototype.appendCodeView = function (el, value) {
  var view = new CodeView();
  this.appendView(view, el);
  view.setValue(value).moveCursorToEnd();
  return view;
};

/**
 * Append a new text cell view instance.
 *
 * @param  {Node}     el
 * @param  {String}   value
 * @return {TextView}
 */
Notebook.prototype.appendTextView = function (el, value) {
  var view = new TextView();
  this.appendView(view, el);
  view.setValue(value).moveCursorToEnd();
  return view;
};

/**
 * Append any view to the notebook. Sets up a few listeners on every view
 * instance and manages interactions between cells.
 *
 * @param  {Object}   view
 * @param  {Node}     before
 * @return {Notebook}
 */
Notebook.prototype.appendView = function (view, before) {
  if (view instanceof EditorView) {
    this.listenTo(view, 'navigateUp', function (view) {
      var prevView = this.getPrevView(view);
      if (prevView) { prevView.focus().moveCursorToEnd(); }
    });

    this.listenTo(view, 'navigateDown', function (view) {
      var nextView = this.getNextView(view);
      if (nextView) { nextView.focus().moveCursorToEnd(0); }
    });

    this.listenTo(view, 'moveUp', function (view) {
      if (!view.el.previousSibling) { return; }

      view.el.parentNode.insertBefore(view.el, view.el.previousSibling);
      view.focus();
      this.collection.sort();
      this.refreshFromView(view);
    });

    this.listenTo(view, 'moveDown', function (view) {
      if (!view.el.nextSibling) { return; }

      insertAfter(view.el, view.el.nextSibling);
      view.focus();
      this.collection.sort();
      this.refreshFromView(this.getPrevView(view));
    });

    // Listen to clone events and append the new views after the current view
    this.listenTo(view, 'clone', function (view, clone) {
      this.appendView(clone, view.el);
      // Need to work around the editor being removed and added with text cells
      var cursor = view.editor && view.editor.getCursor();
      clone.focus().editor.setCursor(cursor);
      this.refreshFromView(clone);
    });

    this.listenTo(view, 'remove', function (view) {
      // If it's the last node in the document, append a new code cell
      if (this.el.childNodes.length < 2) { this.appendCodeView(view.el); }
      // Focus in on the next/previous cell
      var newView = this.getNextView(view) || this.getPrevView(view);
      if (newView) { newView.focus().moveCursorToEnd(); }
      // Need to remove the model from the collection
      this.collection.remove(view.model);
      this.refreshFromView(newView);
    });

    // Listen for switch events, which isn't a real switch but recreates the
    // view using the data it has available. This results in some issues, but
    // avoids a whole different set of issues that would arrise trying to change
    // everything on the fly.
    this.listenTo(view, 'switch', function (view) {
      var newView;
      if (view instanceof TextView) {
        newView = this.appendCodeView(view.el, view.getValue());
      } else {
        newView = this.appendTextView(view.el, view.getValue());
      }

      var cursor = view.editor && view.editor.getCursor();
      view.remove();
      newView.focus();
      if (cursor) { newView.editor.setCursor(cursor); }
    });
  }

  /**
   * Event listener for 'appendNew' event.
   * Appends a new CodeCell after the passed in CellView.
   */
  this.listenTo(view, 'appendNew', function (view) {
    this.appendCodeView(view.el).focus();
  });

  /**
   * Event listener for 'showControls' event.
   * Appends the UIControls to the focused cell.
   */
  this.listenTo(view, 'showControls', function (view) {
    this.controls.toggleView(view);
  });

  // Listening to different events for `text` cells
  if (view instanceof TextView) {
    // Listen to a code event which tells us to make a new code cell
    this.listenTo(view, 'code', function (view, code) {
      // Either add a new code view (if we have code or it's the last view),
      // or focus the next view.
      if (code || this.el.lastChild === view.el) {
        this.appendCodeView(view.el, code);
      }

      this.getNextView(view).moveCursorToEnd(0).focus();

      if (!view.getValue()) { view.remove(); }
    });

    // Append a new code cell when we blur a text cell and it the last cell.
    this.listenTo(view, 'blur', function (view) {
      if (this.el.lastChild === view.el) {
        this.appendCodeView().focus();
      }
    });
  }

  // Listening to another set of events for `code` cells
  if (view instanceof CodeView) {
    // Listen to execution events from the child views, which may or may not
    // require new working cells to be appended to the console
    this.listenTo(view, 'execute', function (view) {
      // Need a flag here so we don't cause an infinite loop when running the
      // notebook
      if (this.execution) { return; }

      if (this.el.lastChild === view.el) {
        this.appendCodeView().focus();
      } else {
        this.getNextView(view).moveCursorToEnd(0).focus();
      }
    });

    this.listenTo(view, 'text', function (view, text) {
      this.appendTextView(view.el, text).focus();

      if (!view.getValue()) { view.remove(); }
    });

    this.listenTo(view, 'browseUp', function (view, currentCid) {
      var model = this.collection.getPrevCode(this.collection.get(currentCid));

      if (model) {
        view.browseToCell(model);
        view.moveCursorToEnd();
      }
    });

    this.listenTo(view, 'browseDown', function (view, currentCid) {
      var model = this.collection.getNextCode(this.collection.get(currentCid));

      if (model) {
        view.browseToCell(model);
        view.moveCursorToEnd(0);
      }
    });

    this.listenTo(view, 'linesChanged', this.refreshFromView);
  }

  // Some references may be needed
  view.sandbox    = this.sandbox;
  view.model.view = view;
  // Add the model to the collection
  this.collection.push(view.model);
  // Append the view to the end of the console
  view.render().appendTo(_.bind(function (el) {
    return before ? insertAfter(el, before) : this.el.appendChild(el);
  }, this));
  // Sort the collection every time a node is added in a different position to
  // just being appended at the end
  if (before) { this.collection.sort(); }

  return this;
};