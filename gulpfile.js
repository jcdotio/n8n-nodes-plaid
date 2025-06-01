const { src, dest } = require('gulp');

function buildIcons() {
  // Copy to main icons directory
  src('icons/**/*').pipe(dest('dist/icons/'));
  
  // Copy plaid.svg to the node directory for proper community node icon resolution
  return src('icons/plaid.svg')
    .pipe(dest('dist/nodes/Plaid/'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons; 