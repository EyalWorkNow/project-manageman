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
  let changed = false;
  
  // This regex matches a self-closing or opening tag and its attributes
  // e.g. <Magicpen variant="Linear" color="currentColor" size={14} color="#0073EA" variant="Bold" />
  content = content.replace(/<([A-Z][a-zA-Z0-9]*)\s+([^>]+)>/g, (match, tag, attrsStr) => {
    // Only process if it has multiple color= or variant=
    if (attrsStr.split('color=').length > 2 || attrsStr.split('variant=').length > 2) {
      changed = true;
      let newAttrs = attrsStr;
      
      // If there are multiple colors, keep the LAST one (which is the original one since we injected at the start)
      // Actually we injected `<Icon color="currentColor" variant="Linear" ...`
      // So we want to remove the FIRST `color="currentColor"` and `variant="Linear"`
      newAttrs = newAttrs.replace('variant="Linear" ', '');
      newAttrs = newAttrs.replace('color="currentColor" ', '');
      
      return `<${tag} ${newAttrs}>`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed duplicates in', f);
  }
});
