/**
 * Webpack Config
 *
 * @Author : Mayank Sindwani
 * @Date   : 2019-09-07
 *
 * @Description : Webpack configuration for browser builds.
 **/

const path = require('path');

module.exports = {
    entry: path.join(__dirname, 'src', 'mhtml2html.js'),
    externals: {
        jsdom: 'jsdom'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js']
    },
    output: {
        path: path.join(__dirname, 'dist'),
        globalObject: 'typeof self !== \'undefined\' ? self : this',
        filename: 'mhtml2html.js',
        library: 'mhtml2html',
        libraryTarget: 'umd'
    }
};
