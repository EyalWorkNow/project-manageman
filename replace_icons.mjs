import fs from "fs";
import path from "path";
import * as iconsax from "iconsax-react";

const availableIcons = new Set(Object.keys(iconsax));

const mapping = {
  Activity: "Activity",
  AlertCircle: "InfoCircle",
  AlertTriangle: "Warning2",
  ArrowRight: "ArrowRight",
  ArrowUpRight: "ArrowUp2",
  BarChart3: "Chart",
  BookOpen: "Book",
  Bot: "Cpu",
  Calendar: "Calendar",
  CheckCircle2: "TickCircle",
  ChevronDown: "ArrowDown2",
  ChevronLeft: "ArrowLeft2",
  ChevronRight: "ArrowRight2",
  ClipboardList: "ClipboardText",
  Clock: "Clock",
  Database: "Data",
  ExternalLink: "Export",
  Eye: "Eye",
  EyeOff: "EyeSlash",
  Filter: "Filter",
  FolderKanban: "Folder2",
  HelpCircle: "MessageQuestion",
  Image: "Image",
  Info: "InfoCircle",
  Languages: "Global",
  LayoutDashboard: "Element4",
  ListChecks: "TaskSquare",
  Loader2: "Refresh2",
  Menu: "HambergerMenu",
  MessageSquare: "Message",
  MessageSquareMore: "Messages2",
  Mic: "Microphone2",
  MousePointer2: "Mouse",
  Paperclip: "Paperclip2",
  Play: "Play",
  PlayCircle: "PlayCircle",
  PlusCircle: "AddCircle",
  RefreshCw: "Refresh2",
  RotateCcw: "RotateLeft",
  Route: "Routing",
  Save: "Save2",
  Search: "SearchNormal1",
  Send: "Send2",
  Shield: "Shield",
  ShieldCheck: "ShieldTick",
  Sparkles: "Magicpen",
  StopCircle: "StopCircle",
  Target: "Target",
  Terminal: "Code",
  TrendingUp: "TrendUp",
  User: "User",
  UserPlus: "UserAdd",
  Users: "Profile2User",
  Wand2: "Magicpen",
  X: "CloseCircle",
  Zap: "Flash"
};

// Verify mapping
for (const [lucide, iconax] of Object.entries(mapping)) {
  if (!availableIcons.has(iconax)) {
    // try to find alternative
    const alt = [...availableIcons].find(i => i.toLowerCase() === iconax.toLowerCase() || i.includes(iconax));
    if (alt) {
      mapping[lucide] = alt;
    } else {
      console.warn("MISSING:", iconax, "for", lucide);
      mapping[lucide] = "Box"; // fallback
    }
  }
}

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

let totalReplaced = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, "utf-8");
  
  // Find lucide imports
  const match = content.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"];?/);
  if (match) {
    const importedLucideIcons = match[1].split(",").map(i => i.trim()).filter(Boolean);
    const newImports = [];
    
    let newContent = content;
    importedLucideIcons.forEach(i => {
      let originalName = i;
      let aliasName = i;
      if (i.includes(" as ")) {
        [originalName, aliasName] = i.split(" as ").map(s => s.trim());
      }
      
      const mapped = mapping[originalName] || "Box";
      if (!newImports.includes(mapped)) {
        // If there was an alias (e.g. Image as ImageIcon), iconsax-react also supports aliases
        if (aliasName !== originalName) {
           newImports.push(`${mapped} as ${aliasName}`);
        } else {
           newImports.push(mapped);
        }
      }
      
      // We don't need to rename in the body if we use alias matching exactly the original!
      // Wait, if it's NO ALIAS (e.g. `FolderKanban`), we should rename `<FolderKanban` to `<Folder2` in the code!
      if (aliasName === originalName) {
         // Replace component usage
         newContent = newContent.replace(new RegExp(`<${originalName}`, "g"), `<${mapped}`);
         newContent = newContent.replace(new RegExp(`</${originalName}>`, "g"), `</${mapped}>`);
         // Replace usages as variables (e.g. icon={<FolderKanban />})
         newContent = newContent.replace(new RegExp(`\\b${originalName}\\b`, "g"), mapped);
      }
    });
    
    // Create new import statement
    const newImportStatement = `import { ${[...new Set(newImports)].join(", ")} } from "iconsax-react";`;
    newContent = newContent.replace(match[0], newImportStatement);
    
    fs.writeFileSync(f, newContent);
    totalReplaced++;
  }
});

console.log(`Replaced icons in ${totalReplaced} files.`);
