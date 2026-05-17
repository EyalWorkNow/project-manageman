import fs from "fs";
import path from "path";

const dir = "src";
const files = [];
const getFiles = (d) => {
  fs.readdirSync(d).forEach(f => {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) getFiles(full);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) files.push(full);
  });
};
getFiles(dir);

const allIcons = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, "utf-8");
  const match = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);
  if (match) {
    match[1].split(",").forEach(i => {
      const name = i.trim().split(" as ")[0].trim();
      if (name) allIcons.add(name);
    });
  }
});
console.log(Array.from(allIcons).sort().join(", "));
