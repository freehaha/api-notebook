/* global App */

var util = require('annotator/src/util');
var annotator = App.Library.annotator;
var adder = annotator.ui.adder;
var highlighter = annotator.ui.highlighter;
var textselector = annotator.ui.textselector;
var viewer = annotator.ui.viewer;
var annotations = require('../state/annotations');
var messages = require('../state/messages');
var Annotation = require('../models/annotation');
var Promise = util.Promise;
var Backbone = require('backbone');
var _ = require('underscore');

var AnnViewer = viewer.Viewer.extend({
    constructor: function(options) {
      viewer.Viewer.call(this, options);
    }
});
// trim strips whitespace from either end of a string.
//
// This usually exists in native code, but not in IE8.
function trim(s) {
    if (typeof String.prototype.trim === 'function') {
        return String.prototype.trim.call(s);
    } else {
        return s.replace(/^[\s\xA0]+|[\s\xA0]+$/g, '');
    }
}


// annotationFactory returns a function that can be used to construct an
// annotation from a list of selected ranges.
function annotationFactory(contextEl, ignoreSelector) {
    return function (ranges) {
        var text = [],
            serializedRanges = [];

        for (var i = 0, len = ranges.length; i < len; i++) {
            var r = ranges[i];
            text.push(trim(r.text()));
            serializedRanges.push(r.serialize(contextEl, ignoreSelector));
        }

        return {
            quote: text.join(' / '),
            ranges: serializedRanges
        };
    };
}


// maxZIndex returns the maximum z-index of all elements in the provided set.
function maxZIndex(elements) {
    var max = -1;
    for (var i = 0, len = elements.length; i < len; i++) {
        var $el = util.$(elements[i]);
        if ($el.css('position') !== 'static') {
            // Use parseFloat since we may get scientific notation for large
            // values.
            var zIndex = parseFloat($el.css('z-index'));
            if (zIndex > max) {
                max = zIndex;
            }
        }
    }
    return max;
}


// Helper function to inject CSS into the page that ensures Annotator elements
// are displayed with the highest z-index.
function injectDynamicStyle() {
    util.$('#annotator-dynamic-style').remove();

    var sel = '*' +
              ':not(annotator-adder)' +
              ':not(annotator-outer)' +
              ':not(annotator-notice)' +
              ':not(annotator-filter)';

    // use the maximum z-index in the page
    var max = maxZIndex(util.$(global.document.body).find(sel).get());

    // but don't go smaller than 1010, because this isn't bulletproof --
    // dynamic elements in the page (notifications, dialogs, etc.) may well
    // have high z-indices that we can't catch using the above method.
    max = Math.max(max, 1000);

    var rules = [
        '.annotator-adder, .annotator-outer, .annotator-notice {',
        '  z-index: ' + (max + 20) + ';',
        '}',
        '.annotator-filter {',
        '  z-index: ' + (max + 10) + ';',
        '}'
    ].join('\n');

    util.$('<style>' + rules + '</style>')
        .attr('id', 'annotator-dynamic-style')
        .attr('type', 'text/css')
        .appendTo('head');
}


// Helper function to remove dynamic stylesheets
function removeDynamicStyle() {
    util.$('#annotator-dynamic-style').remove();
}


/**
 * function:: main([options])
 *
 * A module that provides a default user interface for Annotator that allows
 * users to create annotations by selecting text within (a part of) the
 * document.
 *
 * Example::
 *
 *     app.include(annotator.ui.main);
 *
 * :param Object options:
 *
 *   .. attribute:: options.element
 *
 *      A DOM element to which event listeners are bound. Defaults to
 *      ``document.body``, allowing annotation of the whole document.
 *
 *   .. attribute:: options.editorExtensions
 *
 *      An array of editor extensions. See the
 *      :class:`~annotator.ui.editor.Editor` documentation for details of editor
 *      extensions.
 *
 *   .. attribute:: options.viewerExtensions
 *
 *      An array of viewer extensions. See the
 *      :class:`~annotator.ui.viewer.Viewer` documentation for details of viewer
 *      extensions.
 *
 */
function main(options) {
    if (typeof options === 'undefined' || options === null) {
        options = {};
    }

    options.element = options.element || global.document.body;
    options.editorExtensions = options.editorExtensions || [];
    options.viewerExtensions = options.viewerExtensions || [];

    // Local helpers
    var makeAnnotation = annotationFactory(options.element, '.annotator-hl');

    // Object to hold local state
    var s = {
        interactionPoint: null,
        events: _.extend({}, Backbone.Events)
    };

    function start(app) {
        var ident = app.registry.getUtility('identityPolicy');
        var authz = app.registry.getUtility('authorizationPolicy');

        messages.on('attach:editor', function(editor) {
          s.editor = editor;
        });
        s.adder = new adder.Adder({
            onCreate: function (ann) {
                app.annotations.create(ann);
            }
        });
        s.adder.attach();

        // addPermissionsCheckboxes(s.editor, ident, authz);

        s.highlighter = new highlighter.Highlighter(options.element);

        s.textselector = new textselector.TextSelector(options.element, {
            onSelection: function (ranges, event) {
                if (ranges.length > 0) {
                    var annotation = makeAnnotation(ranges);
                    s.interactionPoint = util.mousePosition(event);
                    s.adder.load(annotation, s.interactionPoint);
                } else {
                    s.adder.hide();
                }
            }
        });

        s.viewer = new AnnViewer({
            onEdit: function (ann) {
                // Copy the interaction point from the shown viewer:
                s.interactionPoint = util.$(s.viewer.element)
                                         .css(['top', 'left']);

                app.annotations.update(ann);
            },
            onDelete: function (ann) {
                console.debug('delete', ann);
                app.annotations['delete'](ann);
            },
            permitEdit: function (ann) {
                return authz.permits('update', ann, ident.who());
            },
            permitDelete: function (ann) {
                return authz.permits('delete', ann, ident.who());
            },
            autoViewHighlights: options.element,
            onShowAnnotation: options.onShowAnnotation,
            extensions: options.viewerExtensions
        });

        annotations.on('remove', function(ann) {
          app.annotations['delete'](ann.toJSON());
        });
        annotations.on('save', function(ann) {
          app.annotations.update(ann.toJSON());
        });
        s.viewer.attach();

        injectDynamicStyle();
    }

    return {
        start: start,

        destroy: function () {
            s.adder.destroy();
            s.highlighter.destroy();
            s.textselector.destroy();
            s.viewer.destroy();
            removeDynamicStyle();
        },

        annotationsLoaded: function (anns) {
          s.highlighter.drawAll(anns);
          annotations.add(anns);
          annotations.trigger('loaded');
        },
        annotationCreated: function (ann) {
          s.highlighter.draw(ann);
          annotations.add(ann);
        },
        annotationDeleted: function (ann) {
          s.highlighter.undraw(ann);
          annotations.remove(ann);
        },
        annotationUpdated: function (ann) {
          annotations.get(ann.id).set(ann);
          s.highlighter.redraw(ann);
        },

        beforeAnnotationCreated: function (annotation) {
          var ann = new Annotation(annotation);
          ann.set('new', true);
          if(!s.editor) {
            /* probe for editor */
            s.events.listenToOnce(messages, 'attach:editor', function(editor) {
              console.debug('got editor!');
              s.editor = editor;
              editor.setModel(ann);
            });
            /* FIXME: might have some race conditions? */
            messages.trigger('probe:editor');
          } else {
            s.editor.setModel(ann);
          }
          s.events.listenTo(ann, 'change:text', function(ann) {
            _.extend(annotation, ann.attributes);
          });
          var p = new Promise(function(resolve, reject) {
            s.events.listenToOnce(ann, 'save', function(){
              resolve();
            });
            s.events.listenToOnce(ann, 'cancel', function(){
              reject();
            });
          });
          p.catch().then(function() {
            console.log('removing listeners...');
            s.events.stopListening(ann);
          });
          return p;
        },

        // beforeAnnotationUpdated: function (annotation) {
        //     return s.editor.load(annotation, s.interactionPoint);
        // }
    };
}


module.exports = main;
