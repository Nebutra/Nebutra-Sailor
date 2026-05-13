#!/usr/bin/env node

// Cleanup codemod: lucide-react → @nebutra/icons + fix lingering lucide names
// inside existing @nebutra/icons imports.
// Run from repo root: node scripts/migrate-lucide-to-geist.mjs

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

// ── Geist-resolvable mapping (lucide name → Geist name) ───────────────
const MAP = {
  // identity (no rename, just import-path swap)
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUpRight: "ArrowUpRight",
  ArrowDown: "ArrowDown",
  ArrowUp: "ArrowUp",
  BarChart: "BarChart",
  Bell: "Bell",
  Box: "Box",
  BookOpen: "BookOpen",
  Bug: "Bug",
  Calendar: "Calendar",
  Check: "Check",
  CheckCircle: "CheckCircle",
  ChevronDown: "ChevronDown",
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
  ChevronUp: "ChevronUp",
  Clock: "Clock",
  Cloud: "Cloud",
  Code: "Code",
  Coins: "Coins",
  Command: "Command",
  Compass: "Compass",
  Copy: "Copy",
  Cpu: "Cpu",
  CreditCard: "CreditCard",
  Database: "Database",
  Download: "Download",
  Droplet: "Droplet",
  Eye: "Eye",
  EyeOff: "EyeOff",
  File: "File",
  FileText: "FileText",
  Filter: "Filter",
  Fingerprint: "Fingerprint",
  FolderOpen: "FolderOpen",
  GitBranch: "GitBranch",
  GitCommit: "GitCommit",
  GitPullRequest: "GitPullRequest",
  Globe: "Globe",
  Hash: "Hash",
  Heart: "Heart",
  Home: "Home",
  Inbox: "Inbox",
  Image: "Image",
  Key: "Key",
  Layers: "Layers",
  Layout: "Layout",
  Lightning: "Lightning",
  Link: "Link",
  ListFilter: "ListFilter",
  LoaderCircle: "LoaderCircle",
  LockOpen: "LockOpen",
  Menu: "Menu",
  Minus: "Minus",
  Moon: "Moon",
  MoreHorizontal: "MoreHorizontal",
  MoreVertical: "MoreVertical",
  Music: "Music",
  Notification: "Notification",
  Pause: "Pause",
  Pen: "Pen",
  Pencil: "Pencil",
  Pin: "Pin",
  Play: "Play",
  PlayCircle: "PlayCircle",
  Plus: "Plus",
  Robot: "Robot",
  Route: "Route",
  Rss: "Rss",
  Shield: "Shield",
  ShieldCheck: "ShieldCheck",
  Sparkles: "Sparkles",
  Star: "Star",
  StopCircle: "StopCircle",
  Store: "Store",
  Sun: "Sun",
  Terminal: "Terminal",
  User: "User",
  Users: "Users",
  Variable: "Variable",
  Video: "Video",
  Workflow: "Workflow",
  Wrench: "Wrench",
  Bookmark: "Bookmark",
  LineChart: "LineChart",
  Paperclip: "Paperclip",
  Anchor: "Anchor",
  Function: "Function",
  Lambda: "Lambda",

  // renamed
  Activity: "ChartActivity",
  AlertCircle: "Warning",
  AlertTriangle: "Warning",
  AlertTriangleIcon: "Warning",
  AlignCenter: "AlignmentCenter",
  AlignLeft: "AlignmentLeft",
  AlignRight: "AlignmentRight",
  ArrowDownCircle: "ChevronCircleDown",
  ArrowRightIcon: "ArrowRight",
  AtSign: "Email",
  AtSignIcon: "Email",
  Award: "VerifiedCheck",
  BadgeCheck: "VerifiedCheck",
  BarChart3: "BarChart",
  BellDot: "BellSmall",
  BellRing: "Bell",
  Bold: "TextBold",
  Bot: "Robot",
  Boxes: "Box",
  BrainCog: "Brain",
  Building: "Buildings",
  Building2: "Buildings",
  Cable: "Connection",
  ChartSpline: "ChartTrendingUp",
  CheckCheck: "DoubleCheck",
  CheckCircle2: "CheckCircle",
  CheckCircleIcon: "CheckCircle",
  CheckIcon: "Check",
  ChevronLeftIcon: "ChevronLeft",
  ChevronsLeft: "ChevronDoubleLeft",
  ChevronsRight: "ChevronDoubleRight",
  ChevronsUpDown: "ChevronUpDown",
  Circle: "Status",
  CircleAlert: "Warning",
  CircleCheck: "CheckCircle",
  CircleDollarSign: "Dollar",
  CircleDotDashed: "ClockDashed",
  CircleX: "CrossCircle",
  CloudMoon: "Cloud",
  Code2: "Code",
  CopyIcon: "Copy",
  CornerDownRightIcon: "CornerDownRight",
  DatabaseZap: "Database",
  DollarSign: "Dollar",
  Edit2: "Pencil",
  ExternalLink: "External",
  ExternalLinkIcon: "External",
  EyeIcon: "Eye",
  EyeOffIcon: "EyeOff",
  FileCode: "FileText",
  FileCode2: "Code",
  FileJson: "AcronymJson",
  FileLock: "LockClosed",
  FileTerminal: "TerminalWindow",
  Folder: "FolderClosed",
  FolderCode: "FolderClosed",
  Frown: "FaceSad",
  Gift: "Sparkles",
  GitGraph: "GitBranch",
  Github: "LogoGithub",
  GithubIcon: "LogoGithub",
  Grid: "GridSquare",
  GripVertical: "MoreVertical",
  HeartHandshake: "Heart",
  HeartPulse: "ChartActivity",
  HelpCircle: "Question",
  ImageIcon: "Image",
  Info: "Information",
  Italic: "TextItalic",
  KeyRound: "Key",
  Keyboard: "Command",
  Landmark: "Buildings",
  Laptop: "DeviceDesktop",
  LayoutDashboard: "Layout",
  LayoutGrid: "GridSquare",
  LayoutPanelLeft: "SidebarLeft",
  Leaf: "Sparkles",
  LifeBuoy: "Lifebuoy",
  Linkedin: "LogoLinkedin",
  LinkIcon: "Link",
  List: "ListUnordered",
  Loader: "LoaderCircle",
  Loader2: "LoaderCircle",
  LoaderPinwheel: "LoaderCircle",
  Lock: "LockClosed",
  LogOut: "Logout",
  LogoGithub: "LogoGithub",
  LogoLinkedin: "LogoLinkedin",
  Mail: "Envelope",
  Map: "Globe",
  MapIcon: "Globe",
  MapPin: "Pin",
  Maximize2: "Fullscreen",
  Megaphone: "Notification",
  Meh: "FaceSmile",
  MessageCircle: "Message",
  MessageSquare: "Message",
  MessageSquarePlus: "Message",
  Mic: "Microphone",
  Monitor: "DeviceDesktop",
  MonitorDot: "DeviceDesktop",
  Mountain: "Layers",
  MoveRight: "ArrowRight",
  MoveUpRight: "ArrowUpRight",
  Network: "NetworkDevice",
  Package: "Box",
  Palette: "BlendMode",
  PanelLeftClose: "SidebarLeft",
  PanelLeftOpen: "SidebarLeft",
  PenTool: "Pen",
  Plug: "Connection",
  PlusIcon: "Plus",
  RadioTower: "Connection",
  Receipt: "Invoice",
  Recycle: "RefreshClockwise",
  RefreshCw: "RefreshClockwise",
  Rocket: "Lightning",
  RotateCcw: "RotateCounterClockwise",
  RotateCw: "RotateClockwise",
  Sailboat: "Anchor",
  Save: "FloppyDisk",
  ScrollText: "Notes",
  Search: "MagnifyingGlass",
  Send: "PaperAirplane",
  Server: "Servers",
  Settings: "SettingsGear",
  Settings2: "SettingsSlider",
  SettingsIcon: "SettingsGear",
  Share2: "Share",
  ShieldAlert: "ShieldOff",
  ShoppingBag: "Cart",
  Slack: "LogoSlack",
  Sliders: "SettingsSliders",
  Smartphone: "DevicePhone",
  Smile: "FaceSmile",
  SmilePlus: "FacePlus",
  StarIcon: "Star",
  TerminalSquare: "TerminalWindow",
  TextIcon: "TextFormat",
  ThumbsDown: "ThumbDown",
  ThumbsUp: "ThumbUp",
  Timer: "Stopwatch",
  ToyBrick: "Puzzle",
  Trash2: "Trash",
  TrendingDown: "ChartTrendingDown",
  TrendingUp: "ChartTrendingUp",
  TriangleAlert: "Warning",
  Twitter: "LogoTwitterX",
  Underline: "TextFormat",
  Upload: "CloudUpload",
  UserCircle: "User",
  UserRound: "User",
  Volume1: "SpeakerVolumeQuiet",
  Volume2: "SpeakerVolumeLoud",
  VolumeX: "SpeakerOff",
  Wand2: "Sparkles",
  X: "Cross",
  XCircle: "CrossCircle",
  XIcon: "Cross",
  Youtube: "LogoYoutubeSmall",
  Zap: "Lightning",

  // types
  LucideIcon: "Icon",
  LucideProps: "IconProps",
};

// ── Phosphor escape hatch (Geist truly has no equivalent) ─────────────
// Light weight, AI brand thin aesthetic. Used only where Geist lacks a sane match.
const PHOSPHOR_MAP = {
  Wallet: "Wallet",
  Languages: "Translate",
  GraduationCap: "GraduationCap",
  Paintbrush: "PaintBrush",
  Scale: "Scales",
  Square: "Square",
};

// ── enumerate target files ────────────────────────────────────────────
const filesRaw = execSync(
  `grep -rlE "(from|export[[:space:]]*\\{[^}]*\\}[[:space:]]*from)[[:space:]]*[\\"']lucide-react[\\"']|from[[:space:]]*[\\"']@nebutra/icons[\\"']" --include='*.tsx' --include='*.ts' apps packages 2>/dev/null | grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/'`,
  { encoding: "utf-8" },
).trim();
const files = filesRaw.split("\n").filter(Boolean);

const stats = { changed: 0, unchanged: 0, unmapped: new Map(), phosphorFiles: new Set() };

const parseItem = (item) => {
  const m = item.match(/^(type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
  if (!m) return null;
  return { isType: !!m[1], orig: m[2], alias: m[3] };
};

// Rewrite the contents of an import body. `enforceRename` = true ensures
// names already in @nebutra/icons (but actually lucide-style) get fixed.
const rewriteBody = (body, file, mode) => {
  const items = body
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const geistItems = [];
  const phosphorItems = [];
  for (const item of items) {
    const p = parseItem(item);
    if (!p) {
      geistItems.push(item);
      continue;
    }
    const phosphor = PHOSPHOR_MAP[p.orig];
    if (phosphor) {
      const alias = p.alias ?? p.orig;
      phosphorItems.push(`${phosphor}${alias !== phosphor ? ` as ${alias}` : ""}`);
      stats.phosphorFiles.add(file);
      continue;
    }
    const mapped = MAP[p.orig];
    if (!mapped) {
      // In @nebutra/icons mode, treat names already valid as-is. (Geist export list check
      // skipped here — second-pass rewrite is alias-preserving so any pre-resolved name
      // stays untouched.)
      geistItems.push(item);
      if (mode === "lucide") {
        const arr = stats.unmapped.get(p.orig) ?? [];
        arr.push(file);
        stats.unmapped.set(p.orig, arr);
      }
      continue;
    }
    // Apply mapping. If user already aliased, preserve user alias.
    // Otherwise, when mapped name differs from original, add alias = original.
    const finalAlias = p.alias ?? (mapped !== p.orig ? p.orig : undefined);
    const head = (p.isType ? "type " : "") + mapped;
    geistItems.push(finalAlias ? `${head} as ${finalAlias}` : head);
  }
  return { geist: geistItems.join(", "), phosphor: phosphorItems.join(", ") };
};

const buildImports = (file, leadingType, geist, phosphor) => {
  const lines = [];
  if (geist) lines.push(`import ${leadingType}{ ${geist} } from "@nebutra/icons"`);
  if (phosphor) lines.push(`import { ${phosphor} } from "@phosphor-icons/react/dist/ssr"`);
  return lines.join(";\n");
};

for (const file of files) {
  let src = readFileSync(file, "utf-8");
  const before = src;

  // Pass 1: rewrite `import { ... } from "lucide-react"` (strict — no brace cross)
  src = src.replace(
    /import\s+(type\s+)?\{([^{}]+?)\}\s+from\s+["']lucide-react["']/g,
    (full, leadingType, body) => {
      const { geist, phosphor } = rewriteBody(body, file, "lucide");
      return buildImports(file, leadingType ?? "", geist, phosphor);
    },
  );

  // Pass 2: clean up `import { ... } from "@nebutra/icons"` (fix lingering lucide names)
  src = src.replace(
    /import\s+(type\s+)?\{([^{}]+?)\}\s+from\s+["']@nebutra\/icons["']/g,
    (full, leadingType, body) => {
      const { geist, phosphor } = rewriteBody(body, file, "icons");
      return buildImports(file, leadingType ?? "", geist, phosphor);
    },
  );

  // Pass 3: handle `export { ... } from "lucide-react"` in facade
  src = src.replace(/export\s+\{([^{}]+?)\}\s+from\s+["']lucide-react["']/g, (full, body) => {
    const { geist } = rewriteBody(body, file, "lucide");
    return geist ? `export { ${geist} } from "@nebutra/icons"` : "";
  });

  if (src !== before) {
    writeFileSync(file, src, "utf-8");
    stats.changed += 1;
  } else {
    stats.unchanged += 1;
  }
}

process.stdout.write(`\n✅ Migrated ${stats.changed} files (${stats.unchanged} skipped)\n`);
if (stats.phosphorFiles.size > 0) {
  process.stdout.write(
    `📦 ${stats.phosphorFiles.size} file(s) introduced @phosphor-icons/react/dist/ssr — ensure dep is installed.\n`,
  );
}
if (stats.unmapped.size > 0) {
  process.stdout.write(`\n⚠ Unmapped lucide identifiers (need manual review):\n`);
  for (const [name, paths] of [...stats.unmapped.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    process.stdout.write(`  ${name}  (${paths.length} file${paths.length === 1 ? "" : "s"})\n`);
  }
}
