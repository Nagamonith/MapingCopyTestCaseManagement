const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ node_modules not found. Run `npm install` first.');
  process.exit(1);
}

const requirements = [];

const folders = fs.readdirSync(nodeModulesPath).filter(folder => folder !== '.bin');

folders.forEach(folder => {
  if (folder.startsWith('@')) {
    const scopedPath = path.join(nodeModulesPath, folder);
    const scopedPackages = fs.readdirSync(scopedPath);
    scopedPackages.forEach(pkg => {
      const packageJsonPath = path.join(scopedPath, pkg, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = require(packageJsonPath);
        requirements.push(`${folder}/${pkg}@${packageJson.version}`);
      }
    });
  } else {
    const packageJsonPath = path.join(nodeModulesPath, folder, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      requirements.push(`${folder}@${packageJson.version}`);
    }
  }
});

fs.writeFileSync('angular-requirements.txt', requirements.join('\n'));
console.log('✅ angular-requirements.txt generated successfully.');


// node generate-angular-requirements.js
