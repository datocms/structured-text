const fs = require('fs');
const path = require('path');

const REPO_PREFIX =
  'https://github.com/datocms/structured-text/blob/main/packages/utils/';

const readmePath = path.join(process.cwd(), 'README.md');
let readme = fs.readFileSync(readmePath, 'utf-8');

// Matches: [`symbol`](https://.../file#L123)
const linkRegex = new RegExp(
  '\\[`([^`]+)`\\]\\(' + REPO_PREFIX + '([^#)]+)#L\\d+\\)',
  'g',
);

function findLineNumber(filePath, symbol) {
  const content = fs.readFileSync(filePath, 'utf-8').split('\n');

  // Look for `function foo`, `class Foo`, or `const foo =`
  const regex = new RegExp(
    `\\b(?:function|class|const|let|var)\\s+${symbol}\\b`,
  );

  for (let i = 0; i < content.length; i++) {
    if (regex.test(content[i])) {
      return i + 1; // GitHub is 1-indexed
    }
  }
  return null;
}

readme = readme.replace(linkRegex, (full, symbol, file) => {
  const absPath = path.join(process.cwd(), file);
  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️ File not found: ${file}`);
    return full;
  }

  const newLine = findLineNumber(absPath, symbol);
  if (!newLine) {
    console.warn(`⚠️ Could not locate ${symbol} in ${file}`);
    return full;
  }

  return `[\`${symbol}\`](${REPO_PREFIX}${file}#L${newLine})`;
});

fs.writeFileSync(readmePath, readme);
console.log('✅ README GitHub links updated!');
