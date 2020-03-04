# mhtml2html.js

[![npm version](https://badge.fury.io/js/mhtml2html.svg)](https://badge.fury.io/js/mhtml2html) [![circleci](https://circleci.com/gh/msindwan/mhtml2html.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/msindwan/mhtml2html)

`mhtml2html` converts `MHTML` files to a single `HTML` file using javascript.

[Usage](#usage) | [API](#api) | [Development](#development)

## Usage

`mhtml2html` is compatible with Node >= v10.

**It has only been tested with MHTML files built and used with the latest versions of Chrome**

### Node.js Example

mhtml2html can be used via the command line (use the `--help` flag to view all options):

```sh
$ mhtml2html <input.mhtml> <output.html>
```

For programmatic usage, mhtml2html can be used provided a WHATWG DOM parser implementation (e.g [jsdom](https://github.com/jsdom/jsdom)):

```js
const mhtml2html = require('mhtml2html');
const { JSDOM } = require('jsdom');

const mhtml = '<your MHTML string>';
const htmlDoc = mhtml2html.convert(mhtml, { parseDOM: (html) => new JSDOM(html) });
console.log(htmlDoc);
```

### Browser Example

To get started, import mhtml2html:

```js
import mhtml2html from 'mhtml2html';
```

Or include it as a script in your webpage:

```html
<script src="https://unpkg.com/mhtml2html@<VERSION>" type="javascript" />
```

By default, mhtml2html will use the DOMParser available in most browsers:

```js
import mhtml2html from 'mhtml2html';

const mhtml = '<your MHTML string>';
const html = mhtml2html.convert(mhtml);
console.log(html);
```

## API

### parse

`mhtml2html.parse(mhtml, { htmlOnly = false, parseDOM = <function> });`

* mhtml: An MHTML String.
* options.htmlOnly: If set to true, returns the html document without resources.
* options.parseDOM: A callback that accepts a DOM string and returns a window object (defaults to `DOMParser` only available in browsers).
* Returns an html document without resources if `htmlOnly` is set to true. Otherwise it returns an MHTML parsed object:

``` json
{
    "index" : "<html-index-url>",
    "media": {
        "<asset-url>" : {
            "data" : "<resource-string>",
            "id": "<frame-id>",
            "type": "<resource-type>",
            "encoding": "<resource-encoding>"
        }
    },
    "frames": {
        "<frame-id>": {
            "data": "<resource-string>",
            "id": "<frame-id>",
            "type:": "<resource-type>",
            "encoding": "<resource-encoding>"
        }
    }
}
```

### convert

`mhtml2html.convert(mhtml, { convertIframes = false, parseDOM = <function> });`

* mhtml: An MHTML String or MHTML parsed object.
* options.convertIframes: Whether or not to include iframes in the converted response (defaults to false).
* options.parseDOM: A callback that accepts a DOM string and returns a window object (defaults to `DOMParser` only available in browsers).
* Returns an html window element.

## Development

### Requirements

* Node.js >= 10
* Yarn

To build and test mhtml2html:

1. If `node_modules` haven't been installed already, run `yarn install` from the root directory.
2. Run `yarn test` to build and test the source code.

## License

Released under the MIT License
