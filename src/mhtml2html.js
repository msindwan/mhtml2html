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

const quotedPrintable = require('quoted-printable');
const url = require('url');

// Runtime dependencies.
let _mhtml2html, _btoa, _dom;
(() => {
    // localize existing namespace.
    if (typeof window !== 'undefined') {
        _mhtml2html = window.mhtml2html;
    }

    // Avoid preprocessors from bundling runtime dependencies.
    const _require = typeof require !== 'undefined' ? require : null;

    // _dom
    if (typeof DOMParser === 'undefined') {
        let _parser = _require('jsdom').jsdom;
        _dom = (...args) => {
            return _parser(...args, {});
        };
    } else {
        let _parser = new DOMParser();
        _dom = (...args) => {
            return _parser.parseFromString(...args, "text/html");
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
    return true;
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

// Main module.
const mhtml2html = {

    // Resets the module that was previously defined (if any) for conflict resolution.
    noConflict: () => {
        if (typeof window !== 'undefined') {
            window.mhtml2html = _mhtml2html;
        }
        return mhtml2html;
    },

    // Returns an object representing the mhtml and its resources.
    parse: (mhtml, html_only = false) => {
        const MHTML_FSM = {
            MHTML_HEADERS : 0,
            MTHML_CONTENT : 1,
            MHTML_DATA    : 2,
            MHTML_END     : 3
        };

        let asset, headers, content, media, frames;  // Record-keeping.
        let location, encoding, type, id;            // Content properties.
        let state, next, index, i, l;                // States.
        let boundary;                                // Boundaries.

        headers = { };
        content = { };
        media   = { };
        frames  = { };

        // Initial state and index.
        state = MHTML_FSM.MHTML_HEADERS;
        i = l = 0;

        // Discards characters until a non-whitespace character is encountered.
        function trim() {
            while (assert(i < mhtml.length - 1, 'Unexpected EOF') && /\s/.test(mhtml[i])) {
                if (mhtml[++i] == '\n') { l++; }
            }
        }

        // Returns the next line from the index.
        function getLine(encoding) {
            const j = i;

            // Wait until a newline character is encountered or when we exceed the str length.
            while (mhtml[i] !== '\n' && assert(i++ < mhtml.length - 1, 'Unexpected EOF'));
            i++; l++;

            const line = mhtml.substring(j, i);

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
            const kv = line.split(/[:=](.+)?/);
            assert(kv.length >= 2, `Invalid header; Line ${l}`);
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
                        return _dom(asset.data);
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

        let index, media, frames;  // Record-keeping.
        let reference;             // Resource ref.
        let i, j;                  // States.

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

        // Replace asset references with the corresponding data.
        function replaceReference(ref, asset) {
            let path, k;

            // Get the absolute path of the referenced asset.
            reference = asset.substring(i, asset.indexOf(')', i));
            i += reference.length;
            path = url.resolve(ref, reference.replace(/(\"|\')/g,''));

            if (media[path] == null) {
                return asset;
            }

            // Replace the reference with an encoded version of the resource.
            reference = `url('data:${media[path].type};base64,${(
                media[path].encoding === 'base64' ?
                media[path].data :
                _btoa(unescape(encodeURIComponent(quote(media[path].data))))
            )}')`;

            k = i; i = j + reference.length;

            // Replace the url with the base64 encoded string.
            return `${asset.substring(0, j)}${reference}${asset.substring(k + 1)}`;
        }

        // Merge resources into the document.
        function mergeResources(documentElem) {
            const CSS_URL_RULE = "url(";
            let nodes, base;
            let childNode;
            let href, src;
            let style;

            nodes = [ documentElem ];

            while (nodes.length) {
                // Resolve each node.
                childNode = nodes.shift();
                childNode.childNodes.forEach(function(child) {
                    if (child.getAttribute) {
                        href = child.getAttribute('href');
                        src  = child.getAttribute('src');
                    }
                    if (child.removeAttribute) {
                        child.removeAttribute('integrity');
                    }
                    switch(child.tagName) {
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
                                    j = i; i += CSS_URL_RULE.length;

                                    // Try to resolve the reference.
                                    media[href].data = replaceReference(href, media[href].data);
                                }

                                style.appendChild(documentElem.createTextNode(quote(media[href].data)));
                                childNode.replaceChild(style, child);
                            }
                            break;

                        case 'IMG':
                            if (typeof media[src] !== 'undefined' && media[src].type.includes('image')) {
                                switch(media[src].encoding) {
                                    case 'quoted-printable':
                                        reference = `data:${media[src].type};utf8,${quotedPrintable.decode(media[src].data)}`;
                                        break;
                                    case 'base64':
                                        reference = `data:${media[src].type};base64,${media[src].data}`;
                                        break;
                                    default:
                                        reference = `data:${media[src].type};base64,${_btoa(unescape(encodeURIComponent(quote(media[src].data))))}`;
                                        break;
                                }
                                child.setAttribute('src', reference);
                            }

                        default:
                            for (style in child.style) {
                                if (typeof child.style[style] === 'string') {
                                    // Find the next css rule with an external reference.
                                    while ((i = child.style[style].indexOf(CSS_URL_RULE, i)) > 0) {
                                        j = i; i += CSS_URL_RULE.length;

                                        // Try to resolve the reference.
                                        child.style[style] = replaceReference(index, child.style[style]);
                                    }
                                }
                            }
                            break;
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
