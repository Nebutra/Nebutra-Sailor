import { MacbookPro } from "@nebutra/ui/primitives";

const DEMO_SCREEN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f8fafc"/>
  <rect x="56" y="56" width="1488" height="788" rx="28" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="96" y="96" width="320" height="708" rx="20" fill="#f1f5f9"/>
  <rect x="128" y="136" width="152" height="18" rx="9" fill="#182033"/>
  <rect x="128" y="196" width="224" height="12" rx="6" fill="#8a94a6"/>
  <rect x="128" y="236" width="248" height="44" rx="12" fill="#ffffff" stroke="#d7dde8"/>
  <rect x="128" y="304" width="248" height="44" rx="12" fill="#ffffff" stroke="#d7dde8"/>
  <rect x="128" y="372" width="248" height="44" rx="12" fill="#ffffff" stroke="#d7dde8"/>
  <rect x="128" y="688" width="248" height="76" rx="16" fill="#e9f1fb"/>
  <rect x="456" y="96" width="612" height="188" rx="24" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="496" y="136" width="220" height="18" rx="9" fill="#182033"/>
  <rect x="496" y="180" width="492" height="14" rx="7" fill="#c5cedb"/>
  <rect x="496" y="216" width="148" height="32" rx="16" fill="#dbe7ff"/>
  <rect x="668" y="216" width="148" height="32" rx="16" fill="#dff3ed"/>
  <rect x="856" y="216" width="96" height="32" rx="16" fill="#eef2f7"/>
  <rect x="1108" y="96" width="340" height="188" rx="24" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <circle cx="1180" cy="190" r="54" fill="#dff3ed"/>
  <circle cx="1180" cy="190" r="34" fill="#ffffff"/>
  <rect x="1264" y="150" width="116" height="14" rx="7" fill="#182033"/>
  <rect x="1264" y="186" width="144" height="12" rx="6" fill="#a6b0bf"/>
  <rect x="456" y="324" width="468" height="480" rx="24" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="500" y="372" width="144" height="16" rx="8" fill="#182033"/>
  <rect x="500" y="712" width="340" height="18" rx="9" fill="#d7dde8"/>
  <rect x="500" y="672" width="276" height="18" rx="9" fill="#b6d5ff"/>
  <rect x="500" y="632" width="388" height="18" rx="9" fill="#d7dde8"/>
  <path d="M504 552 C568 492 620 584 688 520 C756 456 812 488 880 430" fill="none" stroke="#7397c8" stroke-width="18" stroke-linecap="round"/>
  <path d="M504 584 C576 536 640 604 708 564 C776 524 812 548 880 508" fill="none" stroke="#91c9b9" stroke-width="18" stroke-linecap="round"/>
  <rect x="964" y="324" width="484" height="480" rx="24" fill="#ffffff" stroke="#d7dde8" stroke-width="2"/>
  <rect x="1008" y="372" width="164" height="16" rx="8" fill="#182033"/>
  <rect x="1008" y="424" width="360" height="76" rx="18" fill="#f1f5f9"/>
  <rect x="1008" y="532" width="360" height="76" rx="18" fill="#f1f5f9"/>
  <rect x="1008" y="640" width="360" height="76" rx="18" fill="#f1f5f9"/>
  <circle cx="1048" cy="462" r="16" fill="#91c9b9"/>
  <circle cx="1048" cy="570" r="16" fill="#b6d5ff"/>
  <circle cx="1048" cy="678" r="16" fill="#c5cedb"/>
  <rect x="1088" y="448" width="196" height="12" rx="6" fill="#7f8a9b"/>
  <rect x="1088" y="476" width="124" height="10" rx="5" fill="#c5cedb"/>
  <rect x="1088" y="556" width="228" height="12" rx="6" fill="#7f8a9b"/>
  <rect x="1088" y="584" width="148" height="10" rx="5" fill="#c5cedb"/>
  <rect x="1088" y="664" width="184" height="12" rx="6" fill="#7f8a9b"/>
  <rect x="1088" y="692" width="136" height="10" rx="5" fill="#c5cedb"/>
</svg>
`)}`;

export function MacbookProDemo() {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl items-center justify-center p-8">
      <MacbookPro src={DEMO_SCREEN} className="h-auto w-full" />
    </div>
  );
}
