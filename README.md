# mhtml2html.js

[![npm version](https://badge.fury.io/js/mhtml2html.svg)](https://badge.fury.io/js/mhtml2html) [![circleci](https://circleci.com/gh/msindwan/mhtml2html.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/msindwan/mhtml2html)

`mhtml2html` converts `MHTML` files to a single `HTML` file using javascript.

## Usage

`mhtml2html` is compatible with Node >= v4.3.2.
**It has only been tested with MHTML files built and used with the latest versions of Chrome**

### Node.js

``` js
var mhtml2html = require('mhtml2html');

fs.readFile('input.mhtml', 'utf8', function (err, input) {
    var parsedMhtml,
        htmlDocument;


    if (err) {
        throw err;
    }

    // Returns the html document with embedded resources.
    htmlDocument = mhtml2html.convert(input);

    // Output the html file.
    fs.writeFile('output.html', htmlDocument.documentElement.innerHTML, function(err) {
        if(err) {
            return console.log(err);
        }
    });
});
```

You can also use it from the command line by running:

`mhtml2html <path_to_mhtml_file> <output_file_path>`

### Browser

Include ```mhtml2html-min.js``` from the dist folder.

``` js
var reader = new FileReader();

reader.addEventListener("loadend", function() {
    html = mhtml2html.parse(this.result);

    // Alternatively you could convert the result directly and have
    // it implicity parsed i.e html = mhtml2html.convert(this.result);

    console.log(mhtml2html.convert(html));
});

reader.readAsText(mhtmlBlob);
```

## API

`mhtml2html.noConflict()`

* Returns any previously defined module with the same name.

`mhtml2html.parse(mhtml_string, html_only = false);`

* Accepts an MHTML String.
* If html_only === true, returns the html document without resources
* Else returns an MHTML parsed object:

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

`mhtml2html.convert(mhtml_string or mhtml_object);`

* Accepts an MHTML String or parsed MHTML Object
* Returns an html document element.


## License

Released under the MIT License
