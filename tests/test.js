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

import mhtml2html from '../dist/mhtml2html-min';
import chai       from 'chai';
import fs         from 'fs';

function readMHTML(file, callback) {
    fs.readFile(`tests/templates/${file}`, 'utf8', function (err, data) {
        if (err) {
            throw err;
        }
        callback(data);
    });
}

describe('Test parsing MHTML', function () {

    it("Should parse valid MHTML", function(done) {
        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.parse(data);
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

    it("Should raise an exception for invalid MHTML (Missing Headers)", function(done) {
        readMHTML('missing_headers.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data); }).to.throw('ID or location header not provided;  Line 26');
            done();
        });
    });

    it("Should raise an exception for invalid MHTML (Missing Boundary Header)", function(done) {
        readMHTML('missing_boundary_header.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data); }).to.throw('Missing boundary from document headers; Line 7');
            done();
        });
    });

    it("Should raise an exception for invalid MHTML (Missing Asset Boundary)", function(done) {
        readMHTML('missing_boundary.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data); }).to.throw('Expected boundary; Line 10');
            done();
        });
    });

    it("Should raise an exception for invalid MHTML (Unexpected EOF)", function(done) {
        readMHTML('unexpected_eof.mhtml', (data) => {
            chai.expect(() => { mhtml2html.parse(data); }).to.throw('Unexpected EOF');
            done();
        });
    });

});

describe('Test converting MHTML to HTML', function () {

    it("Should convert valid MHTML from string", function(done) {
        this.timeout(5000);

        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.convert(data);
            chai.expect(doc).to.be.a('object');
            chai.expect(doc).to.have.property('documentElement');
            done();
        });
    });

    it("Should convert valid MHTML from parsed object", function(done) {
        this.timeout(5000);

        readMHTML('portfolio.mhtml', (data) => {
            let doc;

            doc = mhtml2html.parse(data);
            doc = mhtml2html.convert(doc);

            chai.expect(doc).to.have.property('documentElement');
            done();
        });
    });

    it("Should raise an exception for invalid MHTML string (Missing Boundary Header)", function(done) {
        readMHTML('missing_boundary_header.mhtml', (data) => {
            chai.expect(() => { mhtml2html.convert(data); }).to.throw('Missing boundary from document headers; Line 7');
            done();
        });
    });

    it("Should raise an exception for invalid MHTML object", function(done) {
        chai.expect(() => { mhtml2html.convert({ }); }).to.throw('MHTML error: invalid frames');
        done();
    });

});

