/**
 * mhtml2html
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-09-05
 * @Description : Converts mhtml to html.
 *
 * Licensed under the MIT License
 * Copyright(c) 2016 Mayank Sindwani
 **/

'use strict';

const quotedPrintable = require('quoted-printable');
const b64toa = require('btoa');
const url = require('url');

let _mhtml2html, dom;

// Loads runtime dependencies.
function loadDependencies() {
    // Localize any existing module named mhtml2html.
    if (typeof window !== 'undefined') {
        _mhtml2html = window.mhtml2html;
    }

    // Avoid preprocessors from bundling runtime dependencies.
    const _require = typeof require !== 'undefined' ? require : null;

    if (typeof DOMParser === 'undefined') {
        const parser = _require('jsdom').jsdom;
        dom = (asset) => {
            return parser(asset, {});
        };
    } else {
        const parser = new DOMParser();
        dom = (asset) => {
            return parser.parseFromString(asset, "text/html");
        };
    }
}

// Asserts a condition.
function assert(condition, error) {
    if (!condition) {
        throw new Error(error);
    }
    return true;
}

// Replace asset references with the corresponding data.
function replaceReferences(media, base, asset) {
    const CSS_URL_RULE = 'url(';
    let reference, i;

    for (i = 0; (i = asset.indexOf(CSS_URL_RULE, i)) > 0; i += reference.length) {
        i += CSS_URL_RULE.length;
        reference = asset.substring(i, asset.indexOf(')', i));

        // Get the absolute path of the referenced asset.
        const path = url.resolve(base, reference.replace(/(\"|\')/g,''));
        if (media[path] != null) {
            // Replace the reference with an encoded version of the resource.
            try {
                const embeddedAsset = `'data:${media[path].type};base64,${(
                    media[path].encoding === 'base64' ?
                    media[path].data :
                    b64toa(media[path].data)
                )}'`;
                asset = `${asset.substring(0, i)}${embeddedAsset}${asset.substring(i + reference.length)}`;
            } catch(e) {
                console.warn(e);
            }
        }
    }
    return asset;
}

// Main module.
const mhtml2html = {

    /**
     * No Conflict
     *
     * Description: Resets the module that was previously defined for browser conflict resolution.
     * @returns mhtml2html as a localized object.
     */
    noConflict: () => {
        if (typeof window !== 'undefined') {
            window.mhtml2html = _mhtml2html;
        }
        return mhtml2html;
    },

    /**
     * Parse
     *
     * Description: Returns an object representing the mhtml and its resources.
     * @param {mhtml} // The mhtml string.
     * @param {html_only} // A flag to determine which parsed object to return.
     * @returns an html document without resources if html_only === true; an MHTML parsed object otherwise.
     */
    parse: (mhtml, html_only) => {
        const MHTML_FSM = {
            MHTML_HEADERS : 0,
            MTHML_CONTENT : 1,
            MHTML_DATA    : 2,
            MHTML_END     : 3
        };

        let asset, headers, content, media, frames;  // Record-keeping.
        let location, encoding, type, id;            // Content properties.
        let state, key, next, index, i, l;           // States.
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

        // Splits headers from the first instance of ':'.
        function splitHeaders(line, obj) {
            let m;
            if ((m = line.indexOf(':')) > -1) {
                key = line.substring(0, m).trim();
                obj[key] = line.substring(m + 1, line.length).trim();
            } else {
                assert(typeof key !== 'undefined', `Missing MHTML headers; Line ${l}`);
                obj[key] += line.trim();
            }
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
                        assert(typeof headers['Content-Type'] !== 'undefined', `Missing document content type; Line ${l}`);
                        const matches = headers['Content-Type'].match(/boundary=(.*)/m);

                        // Ensure the extracted boundary exists.
                        assert(matches != null, `Missing boundary from document headers; Line ${l}`);
                        boundary = matches[1].replace(/\"/g,'');

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
                        if (typeof index === 'undefined') {
                            index = location;
                            assert(typeof index !== 'undefined' && type === "text/html", `Index not found; Line ${l}`);
                        }

                        // Ensure the extracted information exists.
                        assert(typeof id !== 'undefined' || typeof location !== 'undefined',
                            `ID or location header not provided;  Line ${l}`);
                        assert(typeof encoding !== 'undefined', `Content-Transfer-Encoding not provided;  Line ${l}`);
                        assert(typeof type     !== 'undefined', `Content-Type not provided; Line ${l}`);

                        asset = {
                            encoding : encoding,
                            type : type,
                            data : '',
                            id : id
                        };

                        // Keep track of frames by ID.
                        if (typeof id !== 'undefined') {
                            frames[id] = asset;
                        }

                        // Associate the first frame with the location.
                        if (typeof location !== 'undefined' && typeof media[location] === 'undefined') {
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
                    if (html_only === true && typeof index !== 'undefined') {
                        return dom(asset.data);
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

    /**
     * Convert
     *
     * Description: Accepts an mhtml string or parsed object and returns the converted html.
     * @param {mhtml} // The mhtml string or object.
     * @returns an html document element.
     */
    convert: (mhtml) => {
        let utf8String, b64String; // Encoded references.
        let index, media, frames;  // Record-keeping.
        let style, base, img;      // DOM objects.
        let href, src;             // References.

        if (typeof mhtml === "string") {
            mhtml = mhtml2html.parse(mhtml);
        } else {
            assert(typeof mhtml === "object", 'Expected argument of type string or object');
        }

        frames = mhtml.frames;
        media  = mhtml.media;
        index  = mhtml.index;

        assert(typeof frames === "object", 'MHTML error: invalid frames');
        assert(typeof media  === "object", 'MHTML error: invalid media' );
        assert(typeof index  === "string", 'MHTML error: invalid index' );
        assert(media[index] && media[index].type === "text/html", 'MHTML error: invalid index');

        const documentElem = dom(media[index].data);
        const nodes = [ documentElem ];

        // Merge resources into the document.
        while (nodes.length) {
            const childNode = nodes.shift();

            // Resolve each node.
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
                            // Embed the css into the document.
                            style = documentElem.createElement('style');
                            style.type = 'text/css';
                            media[href].data = replaceReferences(media, href, media[href].data);
                            style.appendChild(documentElem.createTextNode(media[href].data));
                            childNode.replaceChild(style, child);
                        }
                        break;

                    case 'STYLE':
                        style = documentElem.createElement('style');
                        style.type = 'text/css';
                        style.appendChild(documentElem.createTextNode(replaceReferences(media, index, child.innerHTML)));
                        childNode.replaceChild(style, child);
                        break;

                    case 'IMG':
                        img = null;
                        if (typeof media[src] !== 'undefined' && media[src].type.includes('image')) {
                            // Embed the image into the document.
                            switch(media[src].encoding) {
                                case 'quoted-printable':
                                    utf8String = quotedPrintable.decode(media[src].data);
                                    img = `data:${media[src].type};utf8,${utf8String}`;
                                    break;
                                case 'base64':
                                    img = `data:${media[src].type};base64,${media[src].data}`;
                                    break;
                                default:
                                    try {
                                        b64String = b64toa(media[src].data);
                                        img = `data:${media[src].type};base64,${b64String}`;
                                    } catch(e) {
                                        console.warn(e);
                                    }
                                    break;
                            }
                            if (img !== null) {
                                child.setAttribute('src', img);
                            }
                        }
                        child.style.cssText = replaceReferences(media, index, child.style.cssText);
                        break;

                    default:
                        if (child.style) {
                            child.style.cssText = replaceReferences(media, index, child.style.cssText);
                        }
                        break;
                }
                nodes.push(child);
            });
        }
        return documentElem;
    }
};

loadDependencies();
module.exports = mhtml2html;
