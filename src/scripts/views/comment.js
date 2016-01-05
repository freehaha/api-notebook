var View        = require('./template');
var $ = require('jquery');

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
  console.debug('edit', this.model.id);
};

CommentView.prototype.deleteId = function() {
  console.debug('delete', this.model.id);
};

CommentView.prototype.initialize = function() {
  View.prototype.initialize.apply(this, arguments);
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
  this.$el = $(this.el);
  if(this.model.get('show')) {
    this.$el.removeClass('item-hide');
  } else {
    this.$el.addClass('item-hide');
  }
  return this;
};

CommentView.prototype.template = require('../../templates/views/comment.hbs');
// CommentView.prototype.render = function() {
//   View.prototype.render.call(this);
//   this.el.innerHTML = CommentView.itemTemplate;
//   return this;
// };

CommentView.prototype.setComment = function (comment) {
  this.model.set(comment);
};


