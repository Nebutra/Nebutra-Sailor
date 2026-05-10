# @nebutra/brand

云毓智能品牌资产与识别系统 / Centralized brand assets and identity for Nebutra.

> 基于《云毓智能品牌视觉识别手册》 (Nebutra Brand Visual Identity Manual)

## Installation

```bash
pnpm add @nebutra/brand
```

## Usage

### React Components

```tsx
import { Logo, Logomark, Wordmark } from "@nebutra/brand";

// Full logo with text
<Logo variant="color" size={120} />
<Logo variant="inverse" className="h-8 w-auto" />

// Icon only
<Logomark size={32} variant="color" />

// Text only
<Wordmark size={100} variant="mono" />
```

### Brand Metadata

```tsx
import { brand, colors, typography } from "@nebutra/brand";

// Brand info
console.log(brand.name);        // "Nebutra"
console.log(brand.nameCn);      // "云毓智能"
console.log(brand.domains.app); // "app.nebutra.com"

// Colors - 云毓蓝 & 云毓青
const primary = colors.primary[500]; // "#0033FE" 云毓蓝
const accent = colors.accent[500];   // "#0BF1C3" 云毓青
const gradient = colors.gradient.primary; // "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)"

// Typography
const fontCn = typography.fontFamily.cn; // vivo Sans
const fontEn = typography.fontFamily.en; // Poppins
```

### Brand Guidelines (品牌使用规范)

```tsx
import { 
  brandGuidelines,
  logoSafetyZone,
  logoMinSize,
  logoProhibitedUses,
  nebutraBlue,
  nebutraCyan,
  brandGradient,
  colorProhibitedUses,
} from "@nebutra/brand";

// Logo safety zone calculation
const logoHeight = 100;
const safeZone = logoSafetyZone.calculate(logoHeight);
// { margin: 25, totalWidth: 150, totalHeight: 150 }

// Minimum logo sizes
console.log(logoMinSize.digital.minHeightPx); // 35px
console.log(logoMinSize.print.minHeightMm);   // 6mm

// Brand colors with semantic info
console.log(nebutraBlue.hex);     // "#0033FE"
console.log(nebutraBlue.meaning); // "象征科技与信任..."

// Check prohibited uses
logoProhibitedUses.forEach(rule => {
  console.log(`${rule.name}: ${rule.description}`);
});
```

### Static Assets

```tsx
import { logoAssets, faviconAssets } from "@nebutra/brand";

// Access paths
// node_modules/@nebutra/brand/assets/logo/logo-color.svg
// node_modules/@nebutra/brand/assets/favicon/favicon.ico
```

## Asset Structure

```
assets/
├── logo/
│   ├── logo-color.svg       # 彩色渐变标志 (Default)
│   ├── logo-inverse.svg     # 反白标志 (Dark backgrounds)
│   ├── logo-mono.svg        # 墨稿标志 (Monochrome)
│   ├── logo-en.svg          # 英文品牌名
│   ├── logo-zh.svg          # 中文品牌名 (云毓智能)
│   ├── logo-zh-en.svg       # 中英文组合
│   ├── logo-horizontal-*.svg # 左右组合 (横向空间)
│   └── logo-vertical-*.svg   # 上下组合 (纵向空间)
└── favicon/
    ├── favicon.ico
    ├── favicon.svg
    ├── apple-touch-icon.png
    └── android-chrome-*.png
```

## Brand Colors (品牌色彩)

### 云毓蓝 (Nebutra Blue) - Primary
- **HEX:** `#0033FE`
- **RGB:** 0, 51, 254
- **寓意:** 象征科技与信任，契合AI-SaaS与云端数据智能领域的专业定位

### 云毓青 (Nebutra Cyan) - Secondary
- **HEX:** `#0BF1C3`
- **RGB:** 11, 241, 195
- **寓意:** 象征信息的清晰与算法的灵动

### 品牌渐变 (Brand Gradient)
```css
linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)
```

### Semantic
- Success: `#22c55e`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Info: `#0033FE` (品牌蓝)

## Typography (品牌字体)

### 中文 - vivo Sans
- Light (300) / Regular (400) / Medium (500) / DemiBold (600) / Bold (700)

### 英文 - Poppins
- Regular (400) / Medium (500) / SemiBold (600)

## Logo Usage Rules (标志使用规范)

### 安全空间 (Safety Zone)
- 最小边距不小于标志高度的 **1/4**

### 最小尺寸 (Minimum Size)
- 印刷媒体: 高度 ≥ **6mm**
- 数字媒体: 高度 ≥ **35px**

### 禁用规则 (Prohibited Uses)
- ❌ 拉伸变形
- ❌ 旋转标志
- ❌ 添加描边/投影
- ❌ 修改渐变色彩
- ❌ 随意换色
- ❌ 部分使用
- ❌ 低对比度背景
- ❌ 复杂背景上使用反白标识

## Color Usage Rules (色彩使用规范)

### 允许使用
- ✅ 品牌渐变背景 + 白色文字
- ✅ 白色背景 + 云毓蓝文字
- ✅ 深色背景 + 云毓青强调

### 禁止使用
- ❌ 高饱和度背景与颜色重叠
- ❌ 明度过高的重叠颜色
- ❌ 修改品牌标准色
- ❌ 非品牌标准的渐变组合
