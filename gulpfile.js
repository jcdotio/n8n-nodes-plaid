const { src, dest } = require('gulp');

function buildIcons() {
  return src('icons/**/*')
    .pipe(dest('dist/icons/'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons; 