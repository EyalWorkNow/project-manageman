import fs from 'fs';
import path from 'path';

const dir = 'src';
const getFiles = (d) => {
  let files = [];
  fs.readdirSync(d).forEach(f => {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(getFiles(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full);
  });
  return files;
};

getFiles(dir).forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  const match = content.match(/import\s+{([^}]+)}\s+from\s+['"]iconsax-react['"];?/);
  if (match) {
    const importedIcons = match[1].split(',').map(s => s.trim().split(' as ')[1] || s.trim().split(' as ')[0]).filter(Boolean);
    
    let changed = false;
    importedIcons.forEach(icon => {
      // Find tags like <IconName or <IconName>
      const regex = new RegExp(`<${icon}(\\s|>)`, 'g');
      content = content.replace(regex, (match) => {
        let newTag = match;
        if (!newTag.includes('color=')) {
          newTag = newTag.replace(`<${icon}`, `<${icon} color="currentColor"`);
          changed = true;
        }
        if (!newTag.includes('variant=')) {
          newTag = newTag.replace(`<${icon}`, `<${icon} variant="Linear"`);
          changed = true;
        }
        return newTag;
      });
    });
    if (changed) {
      fs.writeFileSync(f, content);
      console.log('Injected props in', f);
    }
  }
});
