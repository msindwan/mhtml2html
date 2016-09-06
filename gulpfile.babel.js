/**
 * gulpfile.babel.js
 *
 * @Author : Mayank Sindwani
 * @Date   : 2016-09-05
 * @Description : Build script.
 *
 * The MIT License(MIT)
 * Copyright(c) 2016 Mayank Sindwani
 **/

import eslint from 'gulp-eslint';
import min    from 'gulp-minify';
import babel  from 'gulp-babel';
import mocha  from 'gulp-mocha';
import help   from 'gulp-help';
import tasks  from 'gulp';
import del    from 'del';

let gulp = help(tasks);

gulp.task('build', 'Creates the distribution scripts', () => {
    // Transpile es6 to es5 and output debug + production scripts.
    return gulp.src('src/mhtml2html.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('dist'))
        .pipe(min())
        .pipe(gulp.dest('dist'));
});

gulp.task('clean', 'Removes the distribution folder', (cb) => {
    // Delete the distribution folder.
    del('dist', cb);
});

gulp.task('lint', 'Lints the scripts', () => {
    // Lint the src script.
    return gulp.src(['src/mhtml2html.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', 'Runs tests for mhtml2html', () => {
    // Run mocha tests.
    return gulp
        .src(['tests/**/*.js'], { read: false })
        .pipe(mocha({
            useColors: true
        }));
});

gulp.task('default', 'Runs the default build process', ['build']);
