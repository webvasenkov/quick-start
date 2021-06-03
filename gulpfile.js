const { parallel, src, dest, series, watch, task } = require('gulp');
const browserSync = require('browser-sync').create();
const fileInclude = require('gulp-file-include');
const del = require('del');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const groupCss = require('gulp-group-css-media-queries');
const cleanCss = require('gulp-clean-css');
const rename = require('gulp-rename');
const uglifyES = require('gulp-uglify-es').default;
const babel = require('gulp-babel');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const webpHTML = require('gulp-webp-html');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const pathNode = require('path');
const tildeImporter = require('node-sass-tilde-importer');

const source = './src/';
const prod = `./${pathNode.basename(__dirname)}/`;

const path = {
  source: {
    html: `${source}index.html`,
    templates: `${source}templates/**.*.html`,
    styles: `${source}styles/style.scss`,
    scripts: `${source}scripts/index.js`,
    assets: {
      images: `${source}assets/images/**/*.{jpg,png,svg,gif,webp}`,
      fonts: `${source}assets/fonts/**/*.ttf`,
    },
  },
  prod: {
    html: prod,
    styles: `${prod}styles/`,
    scripts: `${prod}scripts/`,
    assets: {
      images: `${prod}assets/images/`,
      fonts: `${prod}assets/fonts/`,
    },
  },
  watch: {
    html: `${source}index.html`,
    templates: `${source}templates/**/*.html`,
    styles: `${source}styles/**/*.scss`,
    scripts: `${source}scripts/**/*.js`,
    assets: {
      images: `${source}assets/images/**/*.{jpg,png,svg,gif,webp}`,
    },
  },
  clean: prod,
};

// All Tasks
const server = () => {
  browserSync.init({
    server: {
      baseDir: prod,
    },
    port: 3000,
    notify: false,
  });
};

const html = () =>
  src(path.source.html)
    .pipe(fileInclude({ prefix: '@@', basepath: '@file' }))
    .pipe(webpHTML())
    .pipe(dest(path.prod.html))
    .pipe(browserSync.stream());

const css = () =>
  src(path.source.styles)
    .pipe(sass({ outputStyle: 'expanded', importer: tildeImporter }))
    .pipe(groupCss())
    .pipe(autoprefixer({ overrideBrowserslist: ['last 5 versions'], cascade: true }))
    .pipe(dest(path.prod.styles))
    .pipe(cleanCss())
    .pipe(rename({ extname: '.min.css' }))
    .pipe(dest(path.prod.styles))
    .pipe(browserSync.stream());

const js = () =>
  src(path.source.scripts)
    .pipe(fileInclude({ prefix: '@@', basepath: '@file' }))
    .pipe(dest(path.prod.scripts))
    .pipe(babel({ presets: ['@babel/env'] }))
    .pipe(uglifyES())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest(path.prod.scripts))
    .pipe(browserSync.stream());

const img = () =>
  src(path.source.assets.images)
    .pipe(webp({ quality: 70 }))
    .pipe(dest(path.prod.assets.images))
    .pipe(src(path.source.assets.images))
    .pipe(
      imagemin({
        interlaced: true,
        progressive: true,
        svgoPlugins: [{ removeViewBox: false }],
        optimizationLevel: 3,
      })
    )
    .pipe(dest(path.prod.assets.images))
    .pipe(browserSync.stream());

const fonts = () => {
  src(path.source.assets.fonts).pipe(ttf2woff()).pipe(dest(path.prod.assets.fonts));
  return src(path.source.assets.fonts).pipe(ttf2woff2()).pipe(dest(path.prod.assets.fonts));
};

task('svgSprite', () =>
  src([`${source}assets/iconsSprite/*.svg`])
    .pipe(
      svgSprite({
        mode: {
          stack: { sprite: '../icons/icons.svg' },
          example: true,
        },
      })
    )
    .pipe(dest(path.prod.assets.images))
);

const watchFiles = () => {
  watch([path.watch.html, path.watch.templates], html);
  watch([path.watch.styles], css);
  watch([path.watch.scripts], js);
  watch([path.source.assets.images], img);
};

const clean = () => del(path.clean);

// Custom Tasks
const fontsStyle = () => {
  const pathFonts = `${source}styles/_fonts.scss`;
  const content = fs.readFileSync(pathFonts, { encoding: 'utf8' });
  if (content.length) return;

  return fs.readdir(path.prod.assets.fonts, (err, items) => {
    if (err) console.warn(err);

    if (items.length) {
      let currentFontName;

      items.forEach((item) => {
        const [fontName] = item.split('.');
        if (currentFontName !== fontName) {
          fs.appendFile(
            pathFonts,
            `@include font('${fontName}', '${fontName}', '400', 'normal');\n`,
            () => {}
          );
        }
        currentFontName = fontName;
      });
    } else return;
  });
};

exports.default = parallel(
  series(clean, parallel(js, css, html, img, fonts), fontsStyle),
  watchFiles,
  server
);
