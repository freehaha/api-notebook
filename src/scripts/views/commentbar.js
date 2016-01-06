var _           = require('underscore');
// var View        = require('./template');
var View        = require('./view');
var CommentView = require('./comment');
var CommentEditorView = require('./comment-editor');
var config      = require('../state/config');
var middleware  = require('../state/middleware');
var persistence = require('../state/persistence');
var annotations = require('../state/annotations');
var Annotation  = require('../models/annotation');
var Backbone = require('backbone');


var CommentViewItem = Backbone.Model.extend({
});
var CommentViewItems = Backbone.Collection.extend({
  model: CommentViewItem
});
/**
 * Create a new commentbar view class.
 *
 * @type {Function}
 */
var CommentbarView = module.exports = View.extend({
  className: 'notebook-commentbar'
});

/**
 * Initialize the commentbar view.
 */
CommentbarView.prototype.initialize = function () {
  View.prototype.initialize.apply(this, arguments);
  var editor = new CommentEditorView({
    model: new Annotation()
  });
  editor.render();
  this.editor = editor;
  this.listenTo(annotations, 'add', function() {
    this.render();
  });
  this.listenTo(annotations, 'remove', function(ann) {
    console.debug('remove');
    this.data.get('views').remove(ann.id);
    this.render();
  });
  this.data.set('views', new CommentViewItems());
};

/**
 * An object of all events that trigger on the commentbar view.
 *
 * @type {Object}
 */
CommentbarView.prototype.events = {
  'click [data-delete]': function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    this.deleteId(e.target.getAttribute('data-delete'));
  },
  'click .persistence-authenticate':   'authenticate',
  'click .persistence-unauthenticate': 'unauthenticate',
  'click .commentbar-authenticate': function (e) {
    e.preventDefault();
  }
};

/**
 * Require the commentbar template.
 *
 * @type {Function}
 */
CommentbarView.prototype.template =
  require('../../templates/views/commentbar.hbs');

/**
 * Reload the persistent notebooks list.
 */
CommentbarView.prototype.updateList = function () {
  this.data.set('updating', true);

  persistence.list(_.bind(function (err, list) {
    this.data.set('updating', false);

    return this.data.set('list', list);
  }, this));
};

/**
 * Add some commentbar helpers.
 *
 * @type {Object}
 */
CommentbarView.prototype.helpers = {
  dateFormat: function (date) {
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  }
};

CommentbarView.prototype.renderChildren = function() {
  var views = this.data.get('views');
  var view = null;
  annotations.each(function(comment) {
    // instanciate a new comment view
    if((view = views.get(comment.id)) != null) {
      view.get('view').setComment(comment);
    } else {
      view = new CommentView({
        id: comment.id,
        model: comment,
        editor: this.editor
      });
      views.add({
          id: comment.id,
          view: view
      });
      view.render();
    }
  }, this);
};
/**
 * Override the render function to load the initial notebook list.
 */
CommentbarView.prototype.render = function () {
  View.prototype.render.call(this);
  var self = this;
  var views = this.data.get('views');
  this.renderChildren();
  console.log('render CommentbarView');
  this.el.innerHTML = CommentbarView.template;

  var eUl = self.$el.find('div.comment-listing:first').empty();
  views.each(function(view) {
    view.get('view').appendTo(eUl[0]);
  });
  this.editor.appendTo(eUl[0]);
  return this;
};

CommentbarView.template = [
  '<div class="comment-outer comment-viewer">',
  '  <div class="comment-widget comment-listing"></div>',
  '</div>'
].join('\n');

/**
 * Load an id into the persistence layer.
 *
 * @param {String} id
 */
CommentbarView.prototype.updateId = function (id) {
  config.set('id', id);
  this.el.querySelector('.commentbar-list').scrollTop = 0;
};

/**
 * Delete an id using the persistence layer.
 *
 * @param {String} id
 */
CommentbarView.prototype.deleteId = function (id) {
  middleware.trigger('ui:confirm', {
    title: 'Delete Notebook',
    content: 'Are you sure you want to delete this notebook?' +
    ' Deleted notebooks cannot be restored.'
  }, _.bind(function (err, confirmed) {
    return confirmed && persistence.remove(id, _.bind(function (err) {
      if (err) {
        return middleware.trigger('ui:notify', {
          title: 'Unable to delete the notebook',
          message: 'Refresh and try again'
        });
      }

      if (persistence.get('notebook').get('id') === id) {
        this.updateId('');
      }

      var listItemEl = this.el.querySelector('[data-load="' + id + '"]');
      return listItemEl && listItemEl.parentNode.removeChild(listItemEl);
    }, this));
  }, this));
};
