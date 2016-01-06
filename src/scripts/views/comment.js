var View        = require('./template');
var annotations = require('../state/annotations');
var Backbone    = require('backbone');
var showdown    = require('showdown');

var CommentView = module.exports = View.extend({
  tagName: 'div',
  className: 'notebook-comment item',
  events: {
    'click [data-edit]': function() {
      this.startEdit();
    },
    'click [data-delete]': function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.deleteId();
    }
  }
});

CommentView.prototype.close = function() {
  this.stopListening();
};

CommentView.prototype.startEdit = function() {
  this.editor.setModel(this.model);
};

CommentView.prototype.deleteId = function() {
  //TODO: confirm
  console.debug('delete', this.model.id);
  annotations.remove(this.model.id);
};

CommentView.prototype.updateText = function() {
  var converter = new showdown.Converter();
  this.$el.find('span.comment-text')
    .html(converter.makeHtml(this.model.get('text')));
};

CommentView.prototype.initialize = function(options) {
  this.editor = options.editor;
  View.prototype.initialize.apply(this, arguments);
  this.listenTo(this.model, 'change:text', function() {
    this.updateText();
  });
  this.listenTo(this.model, 'change:show', function() {
    if(this.model.get('show')) {
      this.$el.removeClass('item-hide');
      this.$el.addClass('item-active');
    } else {
      // this.$el.addClass('item-hide');
      this.$el.removeClass('item-active');
    }
  });
};

CommentView.prototype.render = function() {
  View.prototype.render.call(this);
  if(this.model.get('show')) {
    this.$el.removeClass('item-hide');
  } else {
    this.$el.addClass('item-hide');
  }
  this.updateText();
  return this;
};

CommentView.prototype.template = require('../../templates/views/comment.hbs');
// CommentView.prototype.render = function() {
//   View.prototype.render.call(this);
//   this.el.innerHTML = CommentView.itemTemplate;
//   return this;
// };

CommentView.prototype.setComment = function (comment) {
  if(comment instanceof Backbone.Model) {
    this.model.set(comment.attributes);
  } else {
    this.model.set(comment);
  }
};


