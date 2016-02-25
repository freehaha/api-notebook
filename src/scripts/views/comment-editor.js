var View        = require('./view');
var _           = require('underscore');
var $           = require('jquery');
var messages    = require('../state/messages');

var CommentEditorView = module.exports = View.extend({
    tagName: 'div',
    events: {
      'click .comment-cancel': function(e) {
        e.preventDefault();
        this.cancel();
      },
      'click .comment-save': function(e) {
        e.preventDefault();
        this.save();
      }
    }
});

CommentEditorView.defaultOptions = {
  fields: [
    {
      name: 'text',
      type: 'textarea',
      label: 'comment'
    }

  ]
};

CommentEditorView.prototype.hide = function() {
  this.$el.addClass('hide');
};

CommentEditorView.prototype.show = function() {
  this.$el.removeClass('hide');
  this.$el.addClass('showing');
};

CommentEditorView.prototype.setModel = function(model){
  this._removeModelListeners();
  this.model = model;
  this._showFieldValues();
  this._addModelListeners();
  this.show();
};

CommentEditorView.prototype._showFieldValues = function() {
  _.each(this.fields, function(field) {
    field.input.val(this.model.get(field.name));
  }, this);
};

CommentEditorView.prototype._addModelListeners = function() {
  this.listenTo(this.model, 'change', function() {
    this._showFieldValues();
  });
};

CommentEditorView.prototype._removeModelListeners = function() {
  this.stopListening(this.model);
};

CommentEditorView.prototype.cancel = function() {
  this.model.trigger('cancel', this.model);
  this.hide();
};

CommentEditorView.prototype.save = function() {
  _.each(this.fields, function(field) {
    this.model.set(field.name, field.input.val());
  }, this);
  this.model.trigger('save', this.model);
  this.hide();
};

CommentEditorView.prototype.initialize = function(options) {
  options = options || CommentEditorView.defaultOptions;
  options.fields = options.fields || CommentEditorView.defaultOptions.fields;
  View.prototype.initialize.apply(this, arguments);
  this.fields = options.fields;
  this._addModelListeners();
  this.listenTo(messages, 'probe:editor', function(){
    messages.trigger('attach:editor', this);
  });
  return this;
};

CommentEditorView.prototype.render = function() {
  View.prototype.render.call(this);
  this.el.innerHTML = CommentEditorView.template;
  var list = $('<li class="comment-field"></li>');
  _.each(this.fields, function(field) {
    var input = $('<textarea></textarea>');
    input.attr({
        id: field.id,
        placeholder: field.label
    });
    input.appendTo(list);
    field.input = input;
  }, this);
  list.appendTo(this.$el.find('ul:first')[0]);
  return this;
};

CommentEditorView.template = [
    '<form class="comment-widget">',
    '  <ul class="comment-listing"></ul>',
    '  <div class="comment-controls">',
    '    <a href=""',
    '       class="comment-save comment-focus">Save</a>',
    '   <a href="" class="comment-cancel">Cancel</a>',
    '  </div>',
    '</form>',
].join('\n');
