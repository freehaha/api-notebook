// Shim Backbone with the functionality from Backbone.native
var Backbone = require('backbone');
Backbone.$   = require('../../vendor/backbone.native').$;

// Require codemirror instance
require('codemirror');
require('codemirror/addon/mode/overlay');
require('codemirror/mode/gfm/gfm');
require('codemirror/mode/markdown/markdown');
require('codemirror/mode/css/css');
require('codemirror/mode/xml/xml');
require('codemirror/mode/clike/clike');
require('codemirror/mode/htmlmixed/htmlmixed');
require('codemirror/mode/javascript/javascript');
