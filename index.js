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

const mhtml2html = require('./dist/mhtml2html');
const { JSDOM } = require('jsdom');
const yargs = require('yargs');
const fs = require('fs');

yargs
    .command('$0 <input> <output>', 'Converts an mhtml file to a single html file', (yargs) => {
        yargs.positional('input', {
            describe: 'The path to the input mhtml file',
            type: 'string',
        }).positional('output', {
            describe: 'The path to the output html file',
            type: 'string'
        })
    }, (argv) => {
        fs.readFile(argv.input, 'utf8',  (err, data) => {
            if (err) {
                throw err;
            }

            const doc = mhtml2html.convert(data, { convertIframes: argv.convertIframes, parseDOM: (html) => new JSDOM(html) });
            fs.writeFile(argv.output, doc.serialize(), err => {
                if (err) {
                    return console.log(err);
                }
            });
        });
    })
    .option('convertIframes', {
        alias: 'i',
        type: 'boolean',
        description: 'Include iframes in the converted output'
    })
    .argv
