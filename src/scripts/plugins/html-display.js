
exports['sandbox:context'] = function (context, next) {
  Object.defineProperty(context, 'render', {
      value: function(html) {
        return {
          isHtml: true,
          html: html
        };
      }
  });
  return next();
};
