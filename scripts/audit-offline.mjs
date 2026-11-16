import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`Build directory not found: ${distDir}`);
  process.exit(1);
}

const forbiddenPatterns = [
  /cdn\.tailwindcss\.com/i,
  /cdnjs\.cloudflare\.com/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /<script[^>]+src=["']https?:\/\//i,
  /<link[^>]+href=["']https?:\/\//i,
];

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (/\.(html|css|js|mjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walkFiles(distDir);
if (files.length === 0) {
  console.error('No built HTML/CSS/JS files found in dist/.');
  process.exit(1);
}

const violations = [];
for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of forbiddenPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        file: path.relative(distDir, filePath),
        match: match[0],
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Offline audit FAILED! Found external references in dist/:');
  for (const v of violations) {
    console.error(` - ${v.file}: ${v.match}`);
  }
  process.exit(1);
}

const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
if (!indexHtml.includes('<script') || !indexHtml.includes('<link rel="stylesheet"')) {
  console.error('Offline audit FAILED! Built dist/index.html is missing bundled script or stylesheet.');
  process.exit(1);
}

console.log(`Offline audit PASSED across ${files.length} built files (0 external CDN dependencies).`);
