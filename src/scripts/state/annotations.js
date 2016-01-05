var Backbone = require('backbone');
var _ = require('underscore');
var Annotations = Backbone.Collection.extend({
  model: require('../models/annotation')
});

Annotations.prototype.showOnly = function(anns) {
  this.each(function(comment) {
    comment.set({show: false});
  });
  _.each(anns, function(ann) {
    this.get(ann.id).set({
        show: true
    });
  }, this);
};

module.exports = new Annotations();
