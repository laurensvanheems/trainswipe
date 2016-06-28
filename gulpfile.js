'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');

gulp.task('sass', function () {
  return gulp.src('src/assets/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dest/assets/scss'));
});

gulp.task('js', function () {
  return gulp.src('src/assets/javascript/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('dest/assets/javascript'))
})

gulp.task('default', function() {
  gulp.watch('src/assets/scss/**/*.scss', ['sass']);
  gulp.watch('src/assets/javascript/**/*.js', ['js']);
});
