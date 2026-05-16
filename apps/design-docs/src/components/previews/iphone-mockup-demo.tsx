import { IphoneMockup } from "@nebutra/ui/primitives";

const DEMO_SCREEN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600">
  <rect width="900" height="1600" fill="#f8fafc"/>
  <rect x="64" y="72" width="772" height="1456" rx="64" fill="#ffffff" stroke="#d7dde8" stroke-width="3"/>
  <rect x="112" y="140" width="260" height="22" rx="11" fill="#182033"/>
  <rect x="112" y="204" width="360" height="16" rx="8" fill="#8a94a6"/>
  <rect x="112" y="268" width="676" height="168" rx="36" fill="#e9f1fb"/>
  <rect x="152" y="316" width="252" height="18" rx="9" fill="#182033"/>
  <rect x="152" y="366" width="464" height="14" rx="7" fill="#a6b0bf"/>
  <rect x="152" y="402" width="220" height="14" rx="7" fill="#c5cedb"/>
  <rect x="112" y="484" width="316" height="228" rx="36" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="152" y="532" width="112" height="14" rx="7" fill="#182033"/>
  <circle cx="220" cy="620" r="48" fill="#dff3ed"/>
  <circle cx="220" cy="620" r="29" fill="#ffffff"/>
  <rect x="300" y="588" width="72" height="12" rx="6" fill="#8a94a6"/>
  <rect x="300" y="622" width="92" height="12" rx="6" fill="#c5cedb"/>
  <rect x="472" y="484" width="316" height="228" rx="36" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="512" y="532" width="128" height="14" rx="7" fill="#182033"/>
  <rect x="512" y="648" width="212" height="16" rx="8" fill="#b6d5ff"/>
  <rect x="512" y="608" width="176" height="16" rx="8" fill="#d7dde8"/>
  <rect x="512" y="568" width="236" height="16" rx="8" fill="#91c9b9"/>
  <rect x="112" y="764" width="676" height="560" rx="36" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="152" y="820" width="184" height="16" rx="8" fill="#182033"/>
  <rect x="152" y="888" width="596" height="104" rx="28" fill="#f1f5f9"/>
  <rect x="152" y="1032" width="596" height="104" rx="28" fill="#f1f5f9"/>
  <rect x="152" y="1176" width="596" height="104" rx="28" fill="#f1f5f9"/>
  <circle cx="204" cy="940" r="20" fill="#91c9b9"/>
  <circle cx="204" cy="1084" r="20" fill="#b6d5ff"/>
  <circle cx="204" cy="1228" r="20" fill="#c5cedb"/>
  <rect x="252" y="920" width="264" height="14" rx="7" fill="#7f8a9b"/>
  <rect x="252" y="958" width="184" height="12" rx="6" fill="#c5cedb"/>
  <rect x="252" y="1064" width="332" height="14" rx="7" fill="#7f8a9b"/>
  <rect x="252" y="1102" width="204" height="12" rx="6" fill="#c5cedb"/>
  <rect x="252" y="1208" width="292" height="14" rx="7" fill="#7f8a9b"/>
  <rect x="252" y="1246" width="172" height="12" rx="6" fill="#c5cedb"/>
  <rect x="252" y="1400" width="396" height="20" rx="10" fill="#d7dde8"/>
</svg>
`)}`;

export function IphoneMockupDemo() {
  return (
    <div className="mx-auto w-full max-w-xs px-4 py-8">
      <IphoneMockup className="w-full" src={DEMO_SCREEN} />
    </div>
  );
}
