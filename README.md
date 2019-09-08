# mhtml2html.js

[![npm version](https://badge.fury.io/js/mhtml2html.svg)](https://badge.fury.io/js/mhtml2html) [![circleci](https://circleci.com/gh/msindwan/mhtml2html.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/msindwan/mhtml2html)

`mhtml2html` converts `MHTML` files to a single `HTML` file using javascript.

[Usage](#usage) | [API](#api) | [Development](#development)

## Usage

`mhtml2html` is compatible with Node >= v4.3.2.

**It has only been tested with MHTML files built and used with the latest versions of Chrome**

To get started, import mhtml2html:

```js
import mhtml2html from 'mhtml2html';
```

Or include it as a script in your webpage:

```html
<script src="https://unpkg.com/mhtml2html@<VERSION>" type="javascript" />
```

### Example

```js
const mhtml = '<your MHTML string>';
const mhtmlParsed = mhtml2html.parse(mhtml);
const html = mhtml2html.convert(mhtmlParsed);
console.log(html);

// Alternatively you could convert the result directly and have
// it implicitly parsed i.e:
// const html = mhtml2html.convert(mhtml);
```

## API

### parse

`mhtml2html.parse(mhtml_string, html_only = false);`

* Accepts an MHTML String.
* If html_only is true, returns the html document without resources.
Otherwise it returns an MHTML parsed object:

``` json
{
    "index" : "<html-index-url>",
    "assets": {
        "<asset-url>" : {
            "data" : "<resource-string>",
            "id": "<frame-id>",
            "type": "<resource-type",
            "encoding": "<resource-encoding>"
        }
    }
}
```

### convert

`mhtml2html.convert(mhtml_string or mhtml_object, parseDOM);`

* Accepts an MHTML String or parsed MHTML Object.
* Accepts a callback to parse DOM strings (default's to DOMParser available in a browser context)
* Returns an html document element.

## Development

### Requirements

* Node.js >= 10
* Yarn

To build and test mhtml2html:

1. If node_modules haven't been installed already, run `yarn install` from the root directory.
2. Run `yarn test` to build and test the source code.

## License

Released under the MIT License
