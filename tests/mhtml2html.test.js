/**
 * test.js
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-09-05
 * @Description : Tests for mhtml2html.
 *
 * The MIT License(MIT)
 * Copyright(c) 2016 Mayank Sindwani
 **/

'use strict';

var parseDOM;
var mhtml2html;
var readMHTML;
var chai;
var fs;

if (typeof module !== 'undefined' && module.exports) {
    // Node.js dependencies.
    const { JSDOM } = require('jsdom');
    mhtml2html = require('../src/mhtml2html');
    parseDOM = (html) => new JSDOM(html);
    chai = require('chai');
    fs = require('fs');

    readMHTML = function(file, callback) {
        fs.readFile(`tests/templates/${file}`, 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            callback(data);
        });
    }
} else {
    // Browser dependencies.
    mhtml2html = window.mhtml2html;
    chai = window.chai;

    readMHTML = function readMHTML(file, callback) {
        // Fetch from the running web server.
        fetch('/templates/' + file).then(function(response) {
            return response.blob();
        }).then(function(mhtmlBlob) {
            // Read the mhtml template as a string.
            var reader = new FileReader();
            reader.addEventListener("loadend", function() {
                callback(this.result);
            });
            reader.readAsText(mhtmlBlob);
        });
    }
}

describe('Test parsing MHTML', function () {

    it('Should parse valid MHTML', function(done) {
        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.parse(data, { parseDOM });
            chai.expect(doc).to.be.a('object');
            chai.expect(doc).to.have.property('index', 'http://msindwan.bitbucket.org/');
            chai.expect(doc).to.have.property('media');

            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/ext/font-awesome/fonts/fontawesome-webfont.woff?v=4.2.0');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/ext/font-awesome/fonts/fontawesome-webfont.woff?v=4.2.0');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/ext/font-awesome/css/font-awesome.min.css');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/ext/bootstrap/bootstrap.min.css');
            chai.expect(doc.media).to.have.property('https://fonts.gstatic.com/s/roboto/v15/2tsd397wLxj96qwHyNIkxPesZW2xOQ-xsNqO47m55DA.woff2');
            chai.expect(doc.media).to.have.property('https://fonts.gstatic.com/s/roboto/v15/CWB0XYA8bzo0kSThX0UTuA.woff2');
            chai.expect(doc.media).to.have.property('https://fonts.googleapis.com/css?family=Roboto:400,100');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/images/html5.png');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/images/flux.png');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/images/node.png');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/images/mongodb.png');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/images/react.png');
            chai.expect(doc.media).to.have.property('http://msindwan.bitbucket.org/css/design.css');

            done();
        });
    });

    it('Should raise an exception for invalid MHTML (Missing Headers)', function(done) {
        readMHTML('missing_headers.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data, { parseDOM }); }).to.throw('ID or location header not provided;  Line 26');
            done();
        });
    });

    it('Should raise an exception for invalid MHTML (Missing Boundary Header)', function(done) {
        readMHTML('missing_boundary_header.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data, { parseDOM }); }).to.throw('Missing boundary from document headers; Line 7');
            done();
        });
    });

    it('Should raise an exception for invalid MHTML (Missing Asset Boundary)', function(done) {
        readMHTML('missing_boundary.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data, { parseDOM }); }).to.throw('Expected boundary; Line 9');
            done();
        });
    });

    it('Should raise an exception for invalid MHTML (Unexpected EOF)', function(done) {
        readMHTML('unexpected_eof.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data, { parseDOM }); }).to.throw('Unexpected EOF');
            done();
        });
    });

});

describe('Test converting MHTML to HTML', function () {

    it('Should convert valid MHTML from string', function(done) {
        this.timeout(10000);

        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.convert(data, { parseDOM });
            chai.expect(typeof doc).to.equal('object');
            chai.expect(doc).to.have.property('window');
            done();
        });
    });

    it('Should convert valid MHTML from parsed object', function(done) {
        this.timeout(10000);

        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.parse(data, { parseDOM });
            doc = mhtml2html.convert(doc, { parseDOM });

            chai.expect(doc).to.have.property('window');
            done();
        });
    });

    it('Should convert valid MHTML with iframes disabled', function(done) {
        this.timeout(10000);

        readMHTML('iframes.mhtml', (data) => {
            const doc = mhtml2html.convert(data, { parseDOM, convertIframes: false });
            const iframe = doc.window.document.querySelector('iframe.result');
            chai.expect(iframe.src.startsWith('cid')).to.be.true;
            done();
        });
    });

    it('Should convert valid MHTML with iframes enabled', function(done) {
        this.timeout(10000);

        readMHTML('iframes.mhtml', (data) => {
            const doc = mhtml2html.convert(data, { parseDOM, convertIframes: true });
            const iframe = doc.window.document.querySelector('iframe.result');
            chai.expect(iframe.src.startsWith('data:text/html;charset=utf-8,')).to.be.true;
            done();
        });
    });

    it('Should raise an exception for invalid MHTML string (Missing Boundary Header)', function(done) {
        readMHTML('missing_boundary_header.mhtml', (data) => {
            chai.expect(() => { mhtml2html.convert(data, { parseDOM }); }).to.throw('Missing boundary from document headers; Line 7');
            done();
        });
    });

    it('Should raise an exception for invalid MHTML object', function(done) {
        chai.expect(() => { mhtml2html.convert({ }, { parseDOM }); }).to.throw('MHTML error: invalid frames');
        done();
    });

});
