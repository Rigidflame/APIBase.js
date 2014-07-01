var gulp = require('gulp');

var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('scripts', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src('apibase.js')
    .pipe(uglify())
    .pipe(rename("apibase.min.js"))
    .pipe(gulp.dest('.'));
});


// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts']);	