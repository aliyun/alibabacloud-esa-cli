const fs = require('fs');
const path = require('path');

const translationRegex =
  /t\(\s*['"]([^'"]+)['"](?:\s*,\s*\{[^}]*\})?\s*\)\.d\(\s*(['"`])(.*?)\2\s*\)/g;
const outputPath = './src/i18n/locales.json';
let translations = {};

if (fs.existsSync(outputPath)) {
  translations = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
}
const parseFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  let match;
  while ((match = translationRegex.exec(content)) !== null) {
    const [_, key, __, msg] = match;
    if (!translations[key]) {
      translations[key] = {
        en: msg,
        zh_CN: ''
      };
    } else {
      translations[key].en = msg;
    }
  }
};

const traverseDirectory = (dirPath) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (stat.isFile()) {
      parseFile(fullPath);
    }
  });
};

const writeTranslationsToFile = () => {
  const jsonContent = JSON.stringify(translations, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');
};

traverseDirectory(path.join(__dirname, 'src'));

writeTranslationsToFile();

console.log('Locale file generated!');
