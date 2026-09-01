import { resolveOrbitSrc, skuSampleSrc } from "./resources";

export type OrbitTile = {
  name: string;
  label: string;
  href?: string;
  live?: boolean;
};

export const ORBIT_TILES: readonly OrbitTile[] = [
  { name: "01.jpg", label: "今晚的我", href: "/create", live: true },
  { name: "02.jpg", label: "城市夜", href: "/create" },
  { name: "03.jpg", label: "咖啡桌边", href: "/create" },
  { name: "04.jpg", label: "街头", href: "/create" },
  { name: "05.jpg", label: "海边", href: "/create" },
  { name: "06.jpg", label: "酒店", href: "/create" },
  { name: "07.jpg", label: "街拍", href: "/create" },
  { name: "08.jpg", label: "领证照", href: "/create/id-photo", live: true },
  { name: "09.jpg", label: "如果我在那里", href: "/create" },
  { name: "10.jpg", label: "夜", href: "/create" },
  { name: "11.jpg", label: "远方", href: "/create" },
  { name: "12.jpg", label: "镜头感", href: "/create" },
];

export const HOME_ORBIT = [
  {
    name: "01.jpg",
    x: 5,
    y: 14,
    w: 150,
    rot: -8,
    opacity: 0.95,
    blur: 0,
    href: "/create",
    label: "今晚的我",
  },
  {
    name: "02.jpg",
    x: 76,
    y: 8,
    w: 180,
    rot: 6,
    opacity: 0.5,
    blur: 2,
    href: "/create",
    label: "城市夜",
  },
  {
    name: "08.jpg",
    x: 16,
    y: 56,
    w: 164,
    rot: 4,
    opacity: 1,
    blur: 0,
    href: "/create/id-photo",
    label: "领证照",
    sampleSku: "cn-2in-white",
  },
  {
    name: "04.jpg",
    x: 70,
    y: 60,
    w: 156,
    rot: -5,
    opacity: 0.9,
    blur: 0,
    href: "/create",
    label: "街头",
  },
  {
    name: "03.jpg",
    x: 3,
    y: 38,
    w: 110,
    rot: 10,
    opacity: 0.38,
    blur: 3,
    href: "/create",
    label: "咖啡",
  },
  {
    name: "06.jpg",
    x: 86,
    y: 34,
    w: 124,
    rot: -3,
    opacity: 0.42,
    blur: 2,
    href: "/create",
    label: "酒店",
  },
  {
    name: "12.jpg",
    x: 36,
    y: 6,
    w: 104,
    rot: 7,
    opacity: 0.32,
    blur: 4,
    href: "/create",
    label: "镜头",
  },
  {
    name: "07.jpg",
    x: 56,
    y: 12,
    w: 118,
    rot: -10,
    opacity: 0.48,
    blur: 2,
    href: "/create",
    label: "街拍",
  },
  {
    name: "05.jpg",
    x: 8,
    y: 78,
    w: 132,
    rot: 3,
    opacity: 0.4,
    blur: 3,
    href: "/create",
    label: "海边",
  },
  {
    name: "10.jpg",
    x: 82,
    y: 78,
    w: 108,
    rot: -7,
    opacity: 0.36,
    blur: 3,
    href: "/create",
    label: "夜",
  },
  {
    name: "09.jpg",
    x: 46,
    y: 74,
    w: 148,
    rot: 5,
    opacity: 0.72,
    blur: 0,
    href: "/create",
    label: "远方",
  },
  {
    name: "11.jpg",
    x: 27,
    y: 84,
    w: 92,
    rot: -4,
    opacity: 0.28,
    blur: 5,
    href: "/create",
    label: "山",
  },
] as const;

export function orbitSrc(name: string): string {
  return resolveOrbitSrc(name);
}

export function homeOrbitSrc(tile: { name: string; sampleSku?: string }): string {
  return tile.sampleSku ? skuSampleSrc(tile.sampleSku) : orbitSrc(tile.name);
}
