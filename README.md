# mhtml2html.js

[![npm version](https://badge.fury.io/js/mhtml2html.svg)](https://badge.fury.io/js/mhtml2html) [![circleci](https://circleci.com/gh/msindwan/mhtml2html.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/msindwan/mhtml2html)

`mhtml2html` converts `MHTML` files to a single `HTML` file using javascript.

[Usage](#usage) | [API](#api) | [Development](#development)

## Usage

`mhtml2html` is compatible with Node >= v4.3.2.

**It has only been tested with MHTML files built and used with the latest versions of Chrome**

### Node.js

``` js
'use strict';

const mhtml2html = require('mhtml2html');

fs.readFile('input.mhtml', 'utf8', function (err, input) {
    if (err) {
        throw err;
    }

    // Returns the html document with embedded resources.
    const htmlDocument = mhtml2html.convert(input);

    // Output the html file.
    fs.writeFile('output.html', htmlDocument.documentElement.innerHTML, err => {
        if(err) {
            return console.log(err);
        }
    });
});
```

You can also use it from the command line by running:

`mhtml2html <path_to_mhtml_file> <output_file_path>`

### Browser

Include the mhtml2html script under the dist folder:

``` html
<script type="text/javascript" src="mhtml2html-min.js"></script>
<script>
    var reader = new FileReader();

    reader.addEventListener("loadend", function() {
        html = mhtml2html.parse(this.result);

        // Alternatively you could convert the result directly and have
        // it implicity parsed i.e html = mhtml2html.convert(this.result);

        console.log(mhtml2html.convert(html));
    });

    reader.readAsText(mhtmlBlob);
</script>
```

## API

### noConflict

`mhtml2html.noConflict();`

* Resets the module that was previously defined for browser conflict resolution.
* Returns a localized version of mhtml2html.

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

`mhtml2html.convert(mhtml_string or mhtml_object);`

* Accepts an MHTML String or parsed MHTML Object.
* Returns an html document element.

## Development

To build and test mhtml2html:

1. If node_modules haven't been installed already, run `npm install` from the root directory
2. Run `./node_modules/gulp/bin/gulp` to build the scripts and run tests.

## License

Released under the MIT License
