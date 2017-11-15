(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mhtml2html = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*! https://mths.be/quoted-printable v1.0.1 by @mathias | MIT license */
;(function(root) {

	// Detect free variables `exports`.
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`.
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code, and use
	// it as `root`.
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;
	var decode = function(input) {
		return input
			// https://tools.ietf.org/html/rfc2045#section-6.7, rule 3:
			// “Therefore, when decoding a `Quoted-Printable` body, any trailing white
			// space on a line must be deleted, as it will necessarily have been added
			// by intermediate transport agents.”
			.replace(/[\t\x20]$/gm, '')
			// Remove hard line breaks preceded by `=`. Proper `Quoted-Printable`-
			// encoded data only contains CRLF line  endings, but for compatibility
			// reasons we support separate CR and LF too.
			.replace(/=(?:\r\n?|\n|$)/g, '')
			// Decode escape sequences of the form `=XX` where `XX` is any
			// combination of two hexidecimal digits. For optimal compatibility,
			// lowercase hexadecimal digits are supported as well. See
			// https://tools.ietf.org/html/rfc2045#section-6.7, note 1.
			.replace(/=([a-fA-F0-9]{2})/g, function($0, $1) {
				var codePoint = parseInt($1, 16);
				return stringFromCharCode(codePoint);
			});
	};

	var handleTrailingCharacters = function(string) {
		return string
			.replace(/\x20$/, '=20') // Handle trailing space.
			.replace(/\t$/, '=09') // Handle trailing tab.
	};

	var regexUnsafeSymbols = /[\0-\x08\n-\x1F=\x7F-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	var encode = function(string) {

		// Encode symbols that are definitely unsafe (i.e. unsafe in any context).
		var encoded = string.replace(regexUnsafeSymbols, function(symbol) {
			if (symbol > '\xFF') {
				throw RangeError(
					'`quotedPrintable.encode()` expects extended ASCII input only. ' +
					'Don\u2019t forget to encode the input first using a character ' +
					'encoding like UTF-8.'
				);
			}
			var codePoint = symbol.charCodeAt(0);
			var hexadecimal = codePoint.toString(16).toUpperCase();
			return '=' + ('0' + hexadecimal).slice(-2);
		});

		// Limit lines to 76 characters (not counting the CRLF line endings).
		var lines = encoded.split(/\r\n?|\n/g);
		var lineIndex = -1;
		var lineCount = lines.length;
		var result = [];
		while (++lineIndex < lineCount) {
			var line = lines[lineIndex];
			// Leave room for the trailing `=` for soft line breaks.
			var LINE_LENGTH = 75;
			var index = 0;
			var length = line.length;
			while (index < length) {
				var buffer = encoded.slice(index, index + LINE_LENGTH);
				// If this line ends with `=`, optionally followed by a single uppercase
				// hexadecimal digit, we broke an escape sequence in half. Fix it by
				// moving these characters to the next line.
				if (/=$/.test(buffer)) {
					buffer = buffer.slice(0, LINE_LENGTH - 1);
					index += LINE_LENGTH - 1;
				} else if (/=[A-F0-9]$/.test(buffer)) {
					buffer = buffer.slice(0, LINE_LENGTH - 2);
					index += LINE_LENGTH - 2;
				} else {
					index += LINE_LENGTH;
				}
				result.push(buffer);
			}
		}

		// Encode space and tab characters at the end of encoded lines. Note that
		// with the current implementation, this can only occur at the very end of
		// the encoded string — every other line ends with `=` anyway.
		var lastLineLength = buffer.length;
		if (/[\t\x20]$/.test(buffer)) {
			// There’s a space or a tab at the end of the last encoded line. Remove
			// this line from the `result` array, as it needs to change.
			result.pop();
			if (lastLineLength + 2 <= LINE_LENGTH + 1) {
				// It’s possible to encode the character without exceeding the line
				// length limit.
				result.push(
					handleTrailingCharacters(buffer)
				);
			} else {
				// It’s not possible to encode the character without exceeding the line
				// length limit. Remvoe the character from the line, and insert a new
				// line that contains only the encoded character.
				result.push(
					buffer.slice(0, lastLineLength - 1),
					handleTrailingCharacters(
						buffer.slice(lastLineLength - 1, lastLineLength)
					)
				);
			}
		}

		// `Quoted-Printable` uses CRLF.
		return result.join('=\r\n');
	};

	var quotedPrintable = {
		'encode': encode,
		'decode': decode,
		'version': '1.0.1'
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return quotedPrintable;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = quotedPrintable;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (var key in quotedPrintable) {
				quotedPrintable.hasOwnProperty(key) && (freeExports[key] = quotedPrintable[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.quotedPrintable = quotedPrintable;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * mhtml2html
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-09-05
 * @Description : Converts mhtml to html.
 *
 * The MIT License(MIT)
 * Copyright(c) 2016 Mayank Sindwani
 **/

var quotedPrintable = require('quoted-printable');

// Runtime dependencies.
var _mhtml2html = void 0,
    _btoa = void 0,
    _dom = void 0;
(function () {
    // localize existing namespace.
    if (typeof window !== 'undefined') {
        _mhtml2html = window.mhtml2html;
    }

    // Avoid preprocessors from bundling runtime dependencies.
    var _require = typeof require !== 'undefined' ? require : null;

    // _dom
    if (typeof DOMParser === 'undefined') {
        var _parser = _require('jsdom').jsdom;
        _dom = function _dom() {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            return _parser.apply(undefined, args.concat([{}]));
        };
    } else {
        var _parser2 = new DOMParser();
        _dom = function _dom() {
            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                args[_key2] = arguments[_key2];
            }

            return _parser2.parseFromString.apply(_parser2, args.concat(["text/html"]));
        };
    }

    // _btoa
    if (typeof btoa === 'undefined') {
        _btoa = _require('btoa');
    } else {
        _btoa = btoa;
    }
})();

// Asserts a condition.
function assert(condition, error) {
    if (!condition) {
        throw new Error(error);
    }
}

// Escape unicode and return the ascii representation.
// http://stackoverflow.com/questions/834316/how-to-convert-large-utf-8-strings-into-ascii
function quote(string) {
    var escapable = /[\\\"\x00-\x1f\x7f-\uffff]/g,
        meta = { // table of character substitutions
        '\b': '\b',
        '\t': '\t',
        '\n': '\n',
        '\f': '\f',
        '\r': '\r',
        '"': '"',
        '\\': '\\'
    };

    escapable.lastIndex = 0;
    return escapable.test(string) ? string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c : '\\' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) : string;
}

// Main module.
var mhtml2html = {

    // Resets the module that was previously defined (if any) for conflict resolution.
    noConflict: function noConflict() {
        if (typeof window !== 'undefined') {
            window.mhtml2html = _mhtml2html;
        }
        return mhtml2html;
    },

    // Returns an object representing the mhtml and its resources.
    parse: function parse(mhtml) {
        var html_only = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var MHTML_FSM = {
            MHTML_HEADERS: 0,
            MTHML_CONTENT: 1,
            MHTML_DATA: 2,
            MHTML_END: 3
        };

        var asset = void 0,
            headers = void 0,
            content = void 0,
            media = void 0,
            frames = void 0; // Record-keeping.
        var location = void 0,
            encoding = void 0,
            type = void 0,
            id = void 0; // Content properties.
        var state = void 0,
            next = void 0,
            index = void 0,
            i = void 0,
            j = void 0,
            l = void 0; // States.
        var boundary = void 0; // Boundaries.

        headers = {};
        content = {};
        media = {};
        frames = {};

        // Initial state and index.
        state = MHTML_FSM.MHTML_HEADERS;
        i = l = 0;

        // Discards characters until a non-whitespace character is encountered.
        function trim() {
            for (;;) {
                assert(i < mhtml.length - 1, 'Unexpected EOF');
                if (!/\s/.test(mhtml[i])) {
                    break;
                }
                i++;
                if (mhtml[i] == '\n') {
                    l++;
                }
            }
        }

        // Returns the next line from the index.
        function getLine(encoding) {
            var line;

            j = i;

            // Wait until a newline character is encountered or when we exceed
            // the str length.
            for (;;) {
                if (mhtml[i] == '\n') {
                    i++;l++;
                    break;
                }
                assert(i++ < mhtml.length - 1, 'Unexpected EOF');
            }

            line = mhtml.substring(j, i);

            // Return the (decoded) line.
            switch (encoding) {
                case "quoted-printable":
                    return quotedPrintable.decode(line);
                case "base64":
                    return line.trim();
                default:
                    return line;
            }
        }

        // Splits headers from the first instance of ':' or '='.
        function splitHeaders(line, obj) {
            var kv = line.split(/[:=](.+)?/);
            assert(kv.length >= 2, 'Invalid header; Line ' + l);
            obj[kv[0].trim()] = kv[1].trim();
        }

        while (state != MHTML_FSM.MHTML_END) {

            switch (state) {

                // Fetch document headers including the boundary to use.
                case MHTML_FSM.MHTML_HEADERS:
                    {
                        next = getLine();

                        // Use a new line or null character to determine when we should
                        // stop processing headers.
                        if (next != 0 && next != '\n') {
                            splitHeaders(next, headers);
                        } else {
                            boundary = headers['boundary'];

                            // Ensure the extracted boundary exists.
                            assert(boundary !== undefined, 'Missing boundary from document headers; Line ' + l);
                            boundary = boundary.replace(/\"/g, '');

                            trim();
                            next = getLine();

                            // Expect the next boundary to appear.
                            assert(next.includes(boundary), 'Expected boundary; Line ' + l);
                            content = {};
                            state = MHTML_FSM.MTHML_CONTENT;
                        }
                        break;
                    }

                // Parse and store content headers.
                case MHTML_FSM.MTHML_CONTENT:
                    {
                        next = getLine();

                        // Use a new line or null character to determine when we should
                        // stop processing headers.
                        if (next != 0 && next != '\n') {
                            splitHeaders(next, content);
                        } else {
                            encoding = content['Content-Transfer-Encoding'];
                            type = content['Content-Type'];
                            id = content['Content-ID'];
                            location = content['Content-Location'];

                            // Assume the first boundary to be the document.
                            if (index === undefined) {
                                index = location;
                                assert(index !== undefined && type === "text/html", 'Index not found; Line ' + l);
                            }

                            // Ensure the extracted information exists.
                            assert(id !== undefined || location !== undefined, 'ID or location header not provided;  Line ' + l);
                            assert(encoding !== undefined, 'Content-Transfer-Encoding not provided;  Line ' + l);
                            assert(type !== undefined, 'Content-Type not provided; Line ' + l);

                            asset = {
                                encoding: encoding,
                                type: type,
                                data: '',
                                id: id
                            };

                            // Keep track of frames by ID.
                            if (id !== undefined) {
                                frames[id] = asset;
                            }

                            // Associate the first frame with the location.
                            if (location !== undefined && media[location] === undefined) {
                                media[location] = asset;
                            }

                            trim();
                            content = {};
                            state = MHTML_FSM.MHTML_DATA;
                        }
                        break;
                    }

                // Map data to content.
                case MHTML_FSM.MHTML_DATA:
                    {

                        next = getLine(encoding);

                        // Build the decoded string.
                        while (!next.includes(boundary)) {
                            asset.data += next;
                            next = getLine(encoding);
                        }

                        try {
                            // Decode unicode.
                            asset.data = decodeURIComponent(escape(asset.data));
                        } catch (e) {
                            e;
                        }

                        // Ignore assets if 'html_only' is set.
                        if (html_only === true && index !== undefined) {
                            return _dom(asset.data);
                        }

                        // Set the finishing state if there are no more characters.
                        state = i >= mhtml.length - 1 ? MHTML_FSM.MHTML_END : MHTML_FSM.MTHML_CONTENT;
                        break;
                    }
            }
        }

        return {
            frames: frames,
            media: media,
            index: index
        };
    },

    // Accepts an mhtml string or parsed object and returns the converted html.
    convert: function convert(mhtml) {

        var index = void 0,
            media = void 0,
            frames = void 0; // Record-keeping.
        var reference = void 0; // Resource ref.
        var i = void 0,
            j = void 0; // States.

        if ((typeof mhtml === 'undefined' ? 'undefined' : _typeof(mhtml)) === _typeof('')) {
            mhtml = mhtml2html.parse(mhtml);
        } else {
            assert((typeof mhtml === 'undefined' ? 'undefined' : _typeof(mhtml)) === _typeof({}), 'Expected argument of type string or object');
        }

        frames = mhtml.frames;
        media = mhtml.media;
        index = mhtml.index;

        assert((typeof frames === 'undefined' ? 'undefined' : _typeof(frames)) === _typeof({}), 'MHTML error: invalid frames');
        assert((typeof media === 'undefined' ? 'undefined' : _typeof(media)) === _typeof({}), 'MHTML error: invalid media');
        assert((typeof index === 'undefined' ? 'undefined' : _typeof(index)) === _typeof(' '), 'MHTML error: invalid index');
        assert(media[index] && media[index].type === "text/html", 'MHTML error: invalid index');

        // http://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
        function resolve(base, relative) {
            var splitUrl, stack, parts, path;

            // Ignore paths that start with http, https, or ftp protocols.
            if (/^((http|https|ftp):\/\/)/.test(relative)) return relative;

            if (relative[0] == '/') {
                splitUrl = base.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));

                // Prefix the path with the base protocol and domain.
                return splitUrl[2] + '://' + splitUrl[4] + relative;
            }

            // Get the absolute path.
            function getPath(pop) {
                stack = base.split("/"), parts = relative.split("/");

                // TODO: Find a better way to determine whether or not we need
                // to pop the last filename.
                if (pop) {
                    stack.pop();
                }

                for (var i = 0; i < parts.length; i++) {
                    if (parts[i] == "..") {
                        stack.pop();
                    } else if (parts[i] != ".") {
                        stack.push(parts[i]);
                    }
                }
                return stack.join("/");
            }

            path = getPath();
            if (media[path] == null) {
                return getPath(true);
            }

            return path;
        }

        // Replace asset references with the corresponding data.
        function replaceReference(url, asset) {
            var path, k;

            // Get the absolute path of the referenced asset.
            reference = asset.substring(i, asset.indexOf(')', i));
            i += reference.length;
            path = resolve(url, reference.replace(/(\"|\')/g, ''));

            if (media[path] == null) {
                return null;
            }

            // Replace the reference with an encoded version of the resource.
            reference = 'url(\'data:' + media[path].type + ';base64,' + (media[path].encoding === 'base64' ? media[path].data : _btoa(unescape(encodeURIComponent(quote(media[path].data))))) + '\')';

            k = i;i = j + reference.length;

            // Replace the url with the base64 encoded string.
            return '' + asset.substring(0, j) + reference + asset.substring(k + 1);
        }

        // Merge resources into the document.
        function mergeResources(documentElem) {
            var CSS_URL_RULE = "url(";
            var childNode = void 0,
                children = void 0;
            var nodes = void 0,
                base = void 0;
            var href = void 0,
                src = void 0;
            var style = void 0;

            nodes = [documentElem];

            while (nodes.length) {

                childNode = nodes.shift();
                children = new Array(Object.keys(childNode.childNodes).length);

                for (i = 0; i < children.length; i++) {
                    children[i] = childNode.childNodes[i];
                }

                // Resolve each node.
                children.forEach(function (child) {

                    if (child.getAttribute) {
                        href = child.getAttribute('href');
                        src = child.getAttribute('src');
                    }

                    switch (child.tagName) {
                        case 'HEAD':
                            // Link targets should be directed to the outer frame.
                            base = documentElem.createElement("base");
                            base.setAttribute("target", "_parent");
                            child.insertBefore(base, child.firstChild);
                            break;

                        case 'LINK':
                            if (typeof media[href] !== 'undefined' && media[href].type === 'text/css') {
                                style = documentElem.createElement('style');
                                style.type = 'text/css';

                                i = 0;
                                // Find the next css rule with an external reference.
                                while ((i = media[href].data.indexOf(CSS_URL_RULE, i)) > 0) {
                                    j = i;i += CSS_URL_RULE.length;

                                    // Try to resolve the reference.
                                    reference = replaceReference(href, media[href].data);
                                    if (reference != null) {
                                        media[href].data = reference;
                                    }
                                }

                                style.appendChild(documentElem.createTextNode(quote(media[href].data)));
                                childNode.replaceChild(style, child);
                            }
                            break;

                        case 'IMG':
                            if (typeof media[src] !== 'undefined' && media[src].type.includes('image')) {
                                switch (media[src].encoding) {
                                    case 'quoted-printable':
                                        reference = 'data:' + media[src].type + ';utf8,' + quotedPrintable.decode(media[src].data);
                                        break;
                                    case 'base64':
                                        reference = 'data:' + media[src].type + ';base64,' + media[src].data;
                                        break;
                                    default:
                                        reference = 'data:' + media[src].type + ';base64,' + _btoa(unescape(encodeURIComponent(quote(media[src].data))));
                                        break;
                                }
                                child.setAttribute('src', reference);
                            }

                        default:
                            for (style in child.style) {
                                if (typeof child.style[style] === 'string') {
                                    // Find the next css rule with an external reference.
                                    while ((i = child.style[style].indexOf(CSS_URL_RULE, i)) > 0) {
                                        j = i;i += CSS_URL_RULE.length;

                                        // Try to resolve the reference.
                                        reference = replaceReference(index, child.style[style]);
                                        if (reference != null) {
                                            child.style[style] = reference;
                                        }
                                    }
                                }
                            }
                            break;
                    }

                    if (child.removeAttribute) {
                        child.removeAttribute('integrity');
                    }

                    nodes.push(child);
                });
            }

            return documentElem;
        }

        // Return the parsed HTML with resources
        return mergeResources(_dom(media[index].data));
    }
};

module.exports = mhtml2html;

},{"quoted-printable":1}]},{},[2])(2)
});