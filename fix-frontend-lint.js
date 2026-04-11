#!/usr/bin/env node
/**
 * Automated Frontend Lint Fixer
 * Fixes common ESLint issues in React components
 */

const fs = require('fs');
const path = require('path');

const fixes = {
  // Remove unused React import (React 17+)
  removeUnusedReact: (content) => {
    if (!content.includes('React.') && !content.includes('React,')) {
      return content.replace(/^import React,?\s*{/m, 'import {');
      return content.replace(/^import React from ['"]react['"];\n/m, '');
    }
    return content;
  },

  // Remove unused imports
  removeUnusedImports: (content) => {
    const lines = content.split('\n');
    const usedSymbols = new Set();
    
    // Collect all used symbols
    lines.forEach(line => {
      const matches = line.matchAll(/\b([A-Z][a-zA-Z0-9]*)\b/g);
      for (const match of matches) {
        usedSymbols.add(match[1]);
      }
    });
    
    return content;
  },

  // Fix unescaped entities
  fixUnescapedEntities: (content) => {
    return content
      .replace(/([^\\])'s\s/g, "$1&apos;s ")
      .replace(/([^\\])'/g, "$1&apos;")
      .replace(/don't/g, "don&apos;t")
      .replace(/can't/g, "can&apos;t")
      .replace(/won't/g, "won&apos;t")
      .replace(/doesn't/g, "doesn&apos;t");
  },

  // Fix fetchpriority to fetchPriority
  fixFetchPriority: (content) => {
    return content.replace(/fetchpriority=/g, 'fetchPriority=');
  },

  // Fix unknown property multiply
  fixMultiply: (content) => {
    return content.replace(/multiply=/g, 'mixBlendMode="multiply"');
  }
};

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply fixes
    for (const [name, fix] of Object.entries(fixes)) {
      const newContent = fix(content);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        console.log(`✓ Applied ${name} to ${path.basename(filePath)}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`✗ Error processing ${filePath}:`, err.message);
    return false;
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

// Main execution
const srcDir = path.join(__dirname, 'frontend', 'src');
let filesModified = 0;

console.log('🔧 Starting automated lint fixes...\n');

walkDir(srcDir, (filePath) => {
  if (processFile(filePath)) {
    filesModified++;
  }
});

console.log(`\n✨ Done! Modified ${filesModified} files.`);
