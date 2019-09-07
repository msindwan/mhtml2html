#!/usr/bin/env node

/**
 * index.js
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-09-05
 * @Description : CLI for mhtml2html.
 *
 * The MIT License(MIT)
 * Copyright(c) 2016 Mayank Sindwani
 **/

const serializeDocument = require("jsdom").serializeDocument;
const mhtml2html        = require('./dist/mhtml2html');
const fs                = require('fs');

// Ensure that an input and output path is provided.
if (process.argv[2] === undefined || process.argv[3] === undefined) {
    throw new Error("Path is required. Usage : mhtml2html <input.mhtml> <output.html>");
}

// Read the file provided and return the html document as a string.
fs.readFile(process.argv[2], 'utf8',  (err, data) => {
    if (err) {
        throw err;
    }

    fs.writeFile(process.argv[3], serializeDocument(mhtml2html.convert(data)), err => {
        if(err) {
            return console.log(err);
        }
    });
});
