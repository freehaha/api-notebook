var View        = require('./template');
var $ = require('jquery');

var CommentView = module.exports = View.extend({
  tagName: 'li',
  className: 'notebook-comment',
  events: {
    'click .comment-edit': 'edit'
  }
});

CommentView.prototype.close = function() {
  this.stopListenind();
};

CommentView.prototype.edit = function(e) {
  e.stopImmediatePropagation();
  console.debug('edit', e, this.model.id);
};

CommentView.prototype.initialize = function() {
  View.prototype.initialize.apply(this, arguments);
  this.listenTo(this.model, 'change', function() {
    console.debug('view model change');
    this.render();
  });
};

CommentView.prototype.render = function() {
  console.debug(this.model.attributes);
  View.prototype.render.call(this);
  this.$el = $(this.el);
  console.debug('render', this.model.get('text'), this.model.get('show'));
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


