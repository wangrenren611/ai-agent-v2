#!/usr/bin/env node

/**
 * Post-build script to fix ES module imports
 * 
 * TypeScript with 'moduleResolution: bundler' doesn't add .js extensions
 * This script adds .js extensions to all relative imports
 */

const fs = require('fs');
const path = require('path');

function isDirectory(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function fixImportsInDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let fixedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixedCount += fixImportsInDir(fullPath);
    } else if (file.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Match all relative imports: './xxx' or '../xxx'
      content = content.replace(
        /from (["'])((?:\.\/|\.\.\/)[^"']*?)\1/g,
        (match, quote, importPath) => {
          // Skip if already has extension
          if (importPath.match(/\.(js|ts|tsx|json)$/)) {
            return match;
          }
          // Check if it's a directory (same-name directory exists)
          const fullPathCheck = path.join(path.dirname(fullPath), importPath);
          if (isDirectory(fullPathCheck)) {
            return `from ${quote}${importPath}/index.js${quote}`;
          }
          // Otherwise add .js
          return `from ${quote}${importPath}.js${quote}`;
        }
      );
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  const count = fixImportsInDir(distDir);
  console.log(`Fixed ${count} files with ES module imports`);
} else {
  console.log('dist/ directory not found, skipping import fixes');
}
