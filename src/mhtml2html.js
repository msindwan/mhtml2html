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

'use strict';

(function(root) {

    // Avoid preprocessors from bundling runtime dependencies.
    let _require;

    if (typeof require !== 'undefined') {
        _require = require;
    }

    const CSS_URL_RULE = "url(";
    const RESET_CSS = '\
        /* MyCache CSS Reset:  */                        \
        /* http://meyerweb.com/eric/tools/css/reset/ */  \
        html, body, div, span, applet, object, iframe,   \
        blockquote, pre,                                 \
        a, abbr, acronym, address, big, cite, code,      \
        del, dfn, em, img, ins, kbd, q, s, samp,         \
        small, strike, strong, sub, sup, tt, var,        \
        b, u, i, center,                                 \
        dl, dt, dd, ol, ul, li,                          \
        fieldset, form, label, legend,                   \
        table, caption, tbody, tfoot, thead, tr, th, td, \
        article, aside, canvas, details, embed,          \
        figure, figcaption, footer, header, hgroup,      \
        menu, nav, output, ruby, section, summary,       \
        time, mark, audio, video {                       \
            margin: 0;                                   \
            padding: 0;                                  \
            border: 0;                                   \
            font-size: 100%;                             \
            font: inherit;                               \
            vertical-align: baseline;                    \
        }                                                \
        h1, h2, h3, h4, h5, h6, p {                      \
            padding: 0;                                  \
            border: 0;                                   \
            font-size: 100%;                             \
            font: inherit;                               \
            vertical-align: baseline;                    \
        }                                                \
        article, aside, details, figcaption, figure,     \
        footer, header, hgroup, menu, nav, section {     \
            display: block;                              \
        }                                                \
        body {                                           \
            line-height: 1;                              \
        }                                                \
        ol, ul {                                         \
            list-style: none;                            \
        }                                                \
        blockquote, q {                                  \
            quotes: none;                                \
        }                                                \
        blockquote:before, blockquote:after,             \
        q:before, q:after {                              \
            content: \'\';                               \
            content: none;                               \
        }                                                \
        strong, b {                                      \
            font-weight: bold;                           \
        }                                                \
        table {                                          \
            border-collapse: collapse;                   \
            border-spacing: 0;                           \
        }';  // Overrides browser stylesheets with default values (http://meyerweb.com/eric/tools/css/reset/)
             // TODO: Consider a better way to embed the CSS.

    // localize existing namespace.
    let previous_mymodule,
        quotedPrintable;

    if (root != undefined) {
        previous_mymodule = root.mhtml2html;
    }

    // Asserts a condition.
    function assert(condition, error) {
        if (!condition) {
            throw new Error(error);
        }
    }

    // Escape unicode and return the ascii representation.
    // http://stackoverflow.com/questions/834316/how-to-convert-large-utf-8-strings-into-ascii
    function quote(string) {
        const escapable = /[\\\"\x00-\x1f\x7f-\uffff]/g,
            meta = { // table of character substitutions
                '\b': '\b',
                '\t': '\t',
                '\n': '\n',
                '\f': '\f',
                '\r': '\r',
                '"' : '"',
                '\\': '\\'
            };

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            string.replace(escapable, (a) => {
                var c = meta[a];
                return typeof c === 'string' ? c : '\\' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) : string;
    }

    // Quoted printable
    // Obtained from the quoted-printable package by @mathias
    // https://mths.be/quoted-printable v1.0.0 by @mathias | MIT license
    quotedPrintable = (function() {

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
                .replace(/\t$/, '=09'); // Handle trailing tab.
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

        return {
            'encode': encode,
            'decode': decode,
            'version': '1.0.0'
        };
    })();

    // Main module.
    let mhtml2html = {

        // Returns the module that was previously defined (if any) for conflict resolution.
        noConflict: () => {
            root.mhtml2html = previous_mymodule;
            return mhtml2html;
        },

        // Returns an object representing the mhtml and its resources.
        parse: (mhtml, html_only = false) => {
            let MHTML_FSM = {
                MHTML_HEADERS : 0,
                MTHML_CONTENT : 1,
                MHTML_DATA    : 2,
                MHTML_END     : 3
            };

            let asset, headers, content, media, frames;  // Record-keeping.
            let location, encoding, type, id;            // Content properties.
            let state, next, index, i, j, l;             // States.
            let boundary;                                // Boundaries.
            let parser;                                  // HTML.

            headers = { };
            content = { };
            media   = { };
            frames  = { };

            // Initial state and index.
            state = MHTML_FSM.MHTML_HEADERS;
            i = l = 0;

            // Discards characters until a non-whitespace character is encountered.
            function trim() {
                for (;;) {
                    assert (i < mhtml.length - 1, 'Unexpected EOF');
                    if (!/\s/.test(mhtml[i])) { break; }
                    i++;
                    if (mhtml[i] == '\n') { l++; }
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
                        i++; l++;
                        break;
                    }
                    assert (i++ < mhtml.length - 1, 'Unexpected EOF');
                }

                line = mhtml.substring(j, i);

                // Return the (decoded) line.
                switch(encoding) {
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
                assert (kv.length >= 2, `Invalid header; Line ${l}`);
                obj[kv[0].trim()] = kv[1].trim();
            }

            while (state != MHTML_FSM.MHTML_END) {

                switch(state) {

                    // Fetch document headers including the boundary to use.
                    case MHTML_FSM.MHTML_HEADERS: {
                        next = getLine();

                        // Use a new line or null character to determine when we should
                        // stop processing headers.
                        if (next != 0 && next != '\n') {
                            splitHeaders(next, headers);
                        } else {
                            boundary = headers['boundary'];

                            // Ensure the extracted boundary exists.
                            assert(boundary !== undefined, `Missing boundary from document headers; Line ${l}`);
                            boundary = boundary.replace(/\"/g,'');

                            trim();
                            next = getLine();

                            // Expect the next boundary to appear.
                            assert(next.includes(boundary), `Expected boundary; Line ${l}`);
                            content = { };
                            state = MHTML_FSM.MTHML_CONTENT;
                        }
                        break;
                    }

                    // Parse and store content headers.
                    case MHTML_FSM.MTHML_CONTENT: {
                        next = getLine();

                        // Use a new line or null character to determine when we should
                        // stop processing headers.
                        if (next != 0 && next != '\n') {
                            splitHeaders(next, content);
                        } else {
                            encoding = content['Content-Transfer-Encoding'];
                            type     = content['Content-Type'];
                            id       = content['Content-ID'];
                            location = content['Content-Location'];

                            // Assume the first boundary to be the document.
                            if (index === undefined) {
                                index = location;
                                assert(index !== undefined && type === "text/html", `Index not found; Line ${l}`);
                            }

                            // Ensure the extracted information exists.
                            assert(id       !== undefined || location !== undefined, `ID or location header not provided;  Line ${l}`);
                            assert(encoding !== undefined, `Content-Transfer-Encoding not provided;  Line ${l}`);
                            assert(type     !== undefined, `Content-Type not provided; Line ${l}`);

                            asset = {
                                encoding : encoding,
                                type : type,
                                data : '',
                                id : id
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
                            content = { };
                            state = MHTML_FSM.MHTML_DATA;
                        }
                        break;
                    }

                    // Map data to content.
                    case MHTML_FSM.MHTML_DATA: {

                        next = getLine(encoding);

                        // Build the decoded string.
                        while (!next.includes(boundary)) {
                            asset.data += next;
                            next = getLine(encoding);
                        }

                        try {
                            // Decode unicode.
                            asset.data = decodeURIComponent(escape(asset.data));
                        } catch (e) { e; }

                        // Ignore assets if 'html_only' is set.
                        if (html_only === true && index !== undefined) {
                            if( typeof DOMParser === 'undefined' ) {
                                assert( typeof _require !== 'undefined' , 'Require is not defined.');

                                // Use jsdom to parse the html.
                                parser = _require('jsdom').jsdom;
                                return parser(asset.data, {});
                            }

                            // Use the browser's dom parser.
                            parser = new DOMParser();
                            return parser.parseFromString(asset.data, "text/html");
                        }

                        // Set the finishing state if there are no more characters.
                        state = (i >= mhtml.length - 1 ? MHTML_FSM.MHTML_END : MHTML_FSM.MTHML_CONTENT);
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
        convert: (mhtml) => {

            var index, media, frames;  // Record-keeping.
            var parser, reference;     // Parser.
            var i, j;                  // States.

            if (typeof mhtml === typeof '') {
                mhtml = mhtml2html.parse(mhtml);
            } else {
                assert(typeof mhtml === typeof { }, 'Expected argument of type string or object');
            }

            frames = mhtml.frames;
            media  = mhtml.media;
            index  = mhtml.index;

            assert(typeof frames === typeof { }, 'MHTML error: invalid frames');
            assert(typeof media  === typeof { }, 'MHTML error: invalid media' );
            assert(typeof index  === typeof ' ', 'MHTML error: invalid index' );
            assert(media[index] && media[index].type === "text/html", 'MHTML error: invalid index');

            let _btoa;
            if( typeof btoa === 'undefined' ) {
                assert( _require !== 'undefined' , 'Require is not defined.');
                _btoa = _require('btoa');
            } else {
                _btoa = btoa;
            }

            // http://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
            function resolve(base, relative) {
                var splitUrl,
                    stack,
                    parts,
                    path;

                // Ignore paths that start with http, https, or ftp protocols.
                if (/^((http|https|ftp):\/\/)/.test(relative))
                    return relative;

                if (relative[0] == '/') {
                    splitUrl = base.match(new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"));

                    // Prefix the path with the base protocol and domain.
                    return `${splitUrl[2]}://${splitUrl[4]}${relative}`;
                }

                // Get the absolute path.
                function getPath(pop) {
                    stack = base.split("/"),
                    parts = relative.split("/");

                    // TODO: Find a better way to determine whether or not we need
                    // to pop the last filename.
                    if (pop) {
                        stack.pop();
                    }

                    for (var i=0; i<parts.length; i++) {
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
                path = resolve(url, reference.replace(/(\"|\')/g,''));

                if (media[path] == null) {
                    return null;
                }

                // Replace the reference with an encoded version of the resource.
                reference = `url('data:${media[path].type};base64,${( media[path].encoding === 'base64' ? media[path].data : _btoa(media[path].data) )}')`;

                k = i; i = j + reference.length;

                // Replace the url with the base64 encoded string.
                return `${asset.substring(0, j)}${reference}${asset.substring(k + 1)}`;
            }

            // Merge resources into the document.
            function mergeResources(documentElem) {
                var childNode, children;
                var nodes, reset, base;
                var href, src;
                var style;

                nodes = [documentElem];
                reset = documentElem.createElement("style");

                // Create the "reset css" tag.
                reset.type = 'text/css';
                if (reset.styleSheet){
                    reset.styleSheet.cssText = RESET_CSS;
                } else {
                    reset.appendChild(documentElem.createTextNode(RESET_CSS));
                }

                while (nodes.length) {

                    childNode = nodes.shift();
                    children = new Array(Object.keys(childNode.childNodes).length);

                    for (i = 0; i < children.length; i++) {
                        children[i] = childNode.childNodes[i];
                    }

                    // Resolve each node.
                    children.forEach(function(child) {
                        if (child.tagName === 'HEAD') {
                            // Append reset css.
                            child.insertBefore(reset, child.firstChild);

                            // Link targets should be directed to the outer frame.
                            base = documentElem.createElement("base");
                            base.setAttribute("target", "_parent");
                            child.insertBefore(base, child.firstChild);
                        }

                        if (child.getAttribute) {
                            href = child.getAttribute('href');
                            src  = child.getAttribute('src');

                            // Resolve links.
                            if (href && media[href]) {
                                if (media[href].type === "text/css") {
                                    i = 0;

                                    // Find the next css rule with an external reference.
                                    while ((i = media[href].data.indexOf(CSS_URL_RULE, i)) > 0) {
                                        j = i; i += CSS_URL_RULE.length;

                                        // Try to resolve the reference.
                                        reference = replaceReference(href, media[href].data);
                                        if (reference != null) {
                                            media[href].data = reference;
                                        }
                                    }
                                }

                                child.setAttribute('href', 'data:' + media[href].type
                                    + ';' + media[href].encoding
                                    + ',' + encodeURIComponent(quote(media[href].data)));
                            }

                            // Resolve scripts and images.
                            if (src && media[src]) {
                                child.setAttribute('src', 'data:' + media[src].type
                                    + ';' + media[src].encoding
                                    + ',' + encodeURIComponent(media[src].data));
                            }

                            // Resolve inline-scripts.
                            for (style in child.style) {
                                if (typeof child.style[style] === typeof '') {
                                    // Find the next css rule with an external reference.
                                    while ((i = child.style[style].indexOf(CSS_URL_RULE, i)) > 0) {
                                        j = i; i += CSS_URL_RULE.length;

                                        // Try to resolve the reference.
                                        reference = replaceReference(index, child.style[style]);
                                        if (reference != null) {
                                            child.style[style] = reference;
                                        }
                                    }
                                }
                            }
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
            if( typeof DOMParser === 'undefined' ) {
                assert( typeof _require !== 'undefined' , 'Require is not defined.');

                // Use jsdom to parse the html.
                parser = _require('jsdom').jsdom;
                return mergeResources(parser(media[index].data, {}));
            }

            // Use the browser's dom parser.
            parser = new DOMParser();
            return mergeResources(parser.parseFromString(media[index].data, "text/html"));
        }
    };

    // Export
    if (typeof exports !== 'undefined' ) {
        if( typeof module !== 'undefined' && module.exports ) {
            exports = module.exports = mhtml2html;
        }
        exports.mhtml2html = mhtml2html;
    } else if (root != undefined) {
        root.mhtml2html = mhtml2html;
    }

})((typeof window !== 'undefined' ? window : null));
