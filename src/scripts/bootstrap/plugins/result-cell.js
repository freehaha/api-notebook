var _              = require('underscore');
var typeOf         = require('../../lib/type');
var Inspector      = require('../../views/inspector');
var ErrorInspector = require('../../views/error-inspector');
var middleware     = require('../../state/middleware');

var View       = require('../../views/view');
var domify = require('domify');
var _ = require('underscore');

var HtmlView = module.exports = View.extend({
  className: 'htmlviewer'
});

HtmlView.prototype.initialize = function (options) {
  View.prototype.initialize.apply(this, arguments);

  _.extend(this, _.pick(
    options, ['property', 'parent', 'inspect', 'internal', 'window']
  ));
};

/**
 * Renders the inspector view.
 *
 * @return {HtmlVeiw}
 */
HtmlView.prototype.render = function () {
  View.prototype.render.call(this);
  console.log(this);
  var html = '<div>' + this.inspect.html + '</div>';
  this.el.appendChild(domify(html));
  return this;
};


/**
 * Render the result cell contents.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
// exports['result:render'] = function (data, next, done) {
//   console.log(data);
//   if(_.isObject(data.inspect) && data.inspect.isHtml) {
//     var viewer = new HtmlView({html: data.inspect.Html});
//     viewer.render().appendTo(data.el);
//     return done(null);
//   }
//   return next();
//
// };
/**
 * Render the result cell contents.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
middleware.register('result:render', function (data, next, done) {
  var options = {
    window:  data.window,
    inspect: data.inspect
  };

  if(_.isObject(data.inspect) && data.inspect.isHtml) {
    var viewer = new HtmlView({inspect: data.inspect});
    viewer.render().appendTo(data.el);
    return done(null);
  }

  var inspector;

  if (!data.isError) {
    inspector = new Inspector(options);
  } else {
    inspector = new ErrorInspector(options);
  }

  inspector.render().appendTo(data.el);

  // Opens the inspector automatically when the type is an object.
  var type = typeOf(data.inspect);

  if (type === 'object' || type === 'array') {
    inspector.open();
  }

  return done(null, _.bind(inspector.remove, inspector));
});
