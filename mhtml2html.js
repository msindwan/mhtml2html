/**
 * mhtml2html
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-08-05
 *
 * Description : Converts mhtml to html.
 **/

'use strict';

(function(root) {

    // localize existing namespace.
    var previous_mymodule = root.mhtml2html;

    /*! https://mths.be/quoted-printable v1.0.0 by @mathias | MIT license */
    function quotedPrintable() {

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

        return {
            'encode': encode,
            'decode': decode,
            'version': '1.0.0'
        };
    }

    // http://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
    function resolve(base, relative) {
        var stack,
            parts;

        // Ignore paths that start with http, https, or ftp protocols.
        if (/^((http|https|ftp):\/\/)/.test(relative))
            return relative;

        if (relative[0] == '/') {
            var pattern = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
            var matches =  base.match(pattern);
            return matches[2] + '://' + matches[4] + relative;
        }

        stack = base.split("/"),
        parts = relative.split("/");
        stack.pop(); // remove current file name (or empty string)
                     // (omit if "base" is the current folder without trailing slash)
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }

    // Asserts a condition.
    function assert(condition, error) {
        if (!condition) {
            throw new Error(error);
        }
    }

    var quotedPrintable = quotedPrintable();

    // Main module.
    var mhtml2html = {

        // Returns the module that was previously defined (if any) for conflict resolution.
        noConflict: function() {
            root.mhtml2html = previous_mymodule;
            return mhtml2html;
        },

        // Returns an object representing the mhtml and its resources.
        parse: function(mhtml, html_only /* = false */) {
            var MHTML_FSM = {
                MHTML_HEADERS : 0,
                MTHML_CONTENT : 1,
                MHTML_DATA    : 2,
                MHTML_END     : 3
            };

            var asset, headers, content, media, frames;  // Record-keeping.
            var location, encoding, type, id;            // Content properties.
            var state, next, index, i, j, l;             // States.
            var nextBoundary, boundary;                  // Boundaries.
            var parser, html;                            // HTML.

            headers = { };
            content = { };
            media   = { };
            frames  = { };

            // Initial state and index.
            state = MHTML_FSM.MHTML_HEADERS;
            i = l = 0;

            // Discards characters until a non-whitespace character is encountered.
            function trim() {
                while (true) {
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
                while (true) {
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
                assert (kv.length >= 2, 'Invalid header; Line ' + l);
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
                            assert(boundary !== undefined, 'Missing boundary from document headers; Line ' + l);
                            boundary = boundary.replace(/\"/g,'');

                            trim();
                            next = getLine();

                            // Expect the next boundary to appear.
                            assert(next.includes(boundary), 'Expected boundary; Line ' + l);
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
                                assert(index !== undefined && type === "text/html", 'Index not found; Line ' + l);
                            }

                            // Ensure the extracted information exists.
                            assert(id       !== undefined || location !== undefined, 'ID or location header not provided;  Line ' + l);
                            assert(encoding !== undefined, 'Content-Transfer-Encoding not provided;  Line ' + l);
                            assert(type     !== undefined, 'Content-Type not provided; Line ' + l);

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
                            // Decode utf8.
                            asset.data = decodeURIComponent(escape(asset.data));
                        } catch (e) {

                        }

                        // Ignore assets if 'html_only' is set.
                        if (html_only === true && index !== undefined) {
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
        convert: function(mhtml) {

            var CSS_URL_RULE = "url(";

            var index, asset, media, frames;  // Record-keeping.
            var parser;                       // Parser.
            var i, j;                         // States.

            if (typeof mhtml === typeof '') {
                mhtml = mhtml2html.parse(mhtml);
            } else {
                assert(typeof mhtml === typeof { }, 'Expected argument of type string or object');
            }

            frames = mhtml.frames;
            media  = mhtml.media;
            index  = mhtml.index;

            if( typeof btoa === 'undefined' ) {
                assert( typeof require !== 'undefined' , 'Require is not defined.');
                var btoa = require('btoa');
            }

            // Replace URL references in assets.
            for (asset in media) {
                if (media[asset].type === "text/css") {
                    i = 0;

                    // Find the next css rule with an external reference.
                    while ((i = media[asset].data.indexOf(CSS_URL_RULE, i)) > 0) {
                        j = i;
                        i += CSS_URL_RULE.length;

                        var reference = media[asset].data.substring(i, media[asset].data.indexOf(')', i));
                        i += reference.length;
                        reference = resolve(asset, reference.replace(/(\"|\')/g,''));

                        // Try to resolve the reference.
                        if (media[reference] !== undefined) {

                            reference = "url('data:" + media[reference].type + ';base64,'
                                + ( media[reference].encoding === 'base64' ? media[reference].data : btoa(media[reference].data) ) + "')";

                            // Replace the url with the base64 encoded string.
                            media[asset].data = media[asset].data.substring(0, j)
                                + reference
                                + media[asset].data.substring(i + 1);

                            i = j + reference.length;
                        }
                    }
                }
            }

            // Parse the HTML.
            function parseHTML(location) {

                function mergeResources(documentElem) {
                    var nodes = [documentElem];

                    while (nodes.length) {

                        var childNode = nodes.shift(),
                            children = new Array(Object.keys(childNode.childNodes).length);

                        for (i = 0; i < children.length; i++) {
                            children[i] = childNode.childNodes[i];
                        }

                        children.forEach(function(child) {
                            var href, src;

                            if (child.getAttribute) {
                                href = child.getAttribute('href');
                                src  = child.getAttribute('src');

                                // TODO: check style attribute

                                if (href && media[href]) {
                                    child.setAttribute('href', 'data:' + media[href].type
                                        + ';' + media[href].encoding
                                        + ',' + encodeURIComponent(media[href].data));
                                }

                                if (src) {
                                    if (media[src]) {
                                        child.setAttribute('src', 'data:' + media[src].type
                                            + ';' + media[src].encoding
                                            + ',' + encodeURIComponent(media[src].data));

                                    } else if (src.substring(0, 4) === 'cid:') {
                                        // TODO
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
                    assert( typeof require !== 'undefined' , 'Require is not defined.');

                    // Use jsdom to parse the html.
                    parser = require('jsdom').jsdom;
                    return mergeResources(parser(media[location].data, {}));

                } else {
                    // Use the browser's dom parser.
                    parser = new DOMParser();
                    return mergeResources(parser.parseFromString(media[location].data, "text/html"));
                }
            }

            return parseHTML(index);
        }
    };

    // Export
    if (typeof exports !== 'undefined' ) {
        if( typeof module !== 'undefined' && module.exports ) {
            exports = module.exports = mhtml2html;
        }
        exports.mhtml2html = mhtml2html;
    } else {
        root.mhtml2html = mhtml2html;
    }

})(this);
