var _ = require('lodash');

var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var minifyCSS = require('gulp-minify-css');
var gulpif = require('gulp-if');

var config = {
	debugMode: false
};

var path = {
	libRoots: [`./public/js/lib/`]
	, jsComponent: _.map(['common'], function(srcPath) { return `./public/js/${srcPath}/`; })
	, jsDist: `./public/js/dist/`
	, cssSource: [`./public/css/common/`]

	, cssDist: `./public/css/dist/`
};

var cssEntry = {
	name: 'lib-css'
	, file: _.map(path.cssSource, function(cssPath) { return `${cssPath}*.css`; })
};

var jsEntry = _.map(['common'], function(srcPath) { return { name: `${srcPath}-components`, file: [`./public/js/${srcPath}/*.js`]}; });

gulp.task('default', ['dist-js', 'dist-css']);

gulp.task('clean-css', function() {
	return gulp.src([path.cssDist]).pipe(clean({force: true}));
});

gulp.task('dist-css', ['clean-css'], function() {
	gulp.src(cssEntry.file)
	.pipe(concat(cssEntry.name + '.min.css'))
	.pipe(minifyCSS({keepSpecialComments: '*'}))
	.pipe(gulp.dest(path.cssDist));
});

gulp.task('clean-js', function() {
	return gulp.src([path.jsDist]).pipe(clean({force: true}));
});

gulp.task('dist-js', ['clean-js'], function() {
	_.forEach(jsEntry, function(entry) {
		gulp.src(entry.file)
		.pipe(sourcemaps.init())
		.pipe(concat(entry.name + '.min.js'))
		.pipe(gulpif(!config.debugMode, uglify()))
		.pipe(gulpif(config.debugMode, sourcemaps.write()))
		.pipe(gulp.dest(path.jsDist));
	});
});

gulp.task('watch', ['default'], function() {
	var watchFiles = _.concat(_.map(path.cssSource, function(cssPath) { return `${cssPath}*.css`; }), _.map(path.jsComponent, function(jsComponent) { return `${jsComponent}*.js`; }));

	var watch = gulp.watch(watchFiles, ['default']);
	watch.on('change', function(event) {
		console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
	});
});
