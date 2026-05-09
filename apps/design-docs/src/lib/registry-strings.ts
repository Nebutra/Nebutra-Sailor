/**
 * Registry-surface translations for ui.nebutra.com.
 *
 * Independent of Fumadocs `i18n.ts` (which only covers en/zh for MDX docs
 * chrome). The registry is a brand-facing component marketplace and matches
 * the 7-language coverage of apps/landing-page.
 */

export const REGISTRY_LANGS = ["en", "zh", "ja", "ko", "de", "es", "fr"] as const;
export type RegistryLang = (typeof REGISTRY_LANGS)[number];

export interface RegistryStrings {
  // Index page
  title: string;
  subtitle: string;
  intro: string;
  empty: string;
  backToDocs: string;
  // Detail page
  allComponents: string;
  install: string;
  installHelper: string;
  npmDependencies: string;
  registryDependencies: string;
  cssVariables: string;
  source: string;
  viewRawJson: string;
}

const TRANSLATIONS: Record<RegistryLang, RegistryStrings> = {
  en: {
    title: "Nebutra UI Registry",
    subtitle: "Copy-paste components, wired to the Nebutra design system.",
    intro:
      "Every component below ships as a shadcn registry manifest with its source, dependencies, and the CSS variables it consumes. Run the install command in any Next.js project that has shadcn-cli configured.",
    empty:
      "No registry items found. Run pnpm --filter @nebutra/ui build:registry to populate apps/design-docs/public/r/.",
    backToDocs: "Back to design system docs",
    allComponents: "All components",
    install: "Install",
    installHelper:
      "Make sure your Next.js project has been initialised with shadcn init and has a components.json.",
    npmDependencies: "npm dependencies",
    registryDependencies: "Registry dependencies",
    cssVariables: "CSS variables",
    source: "Source",
    viewRawJson: "View raw JSON",
  },
  zh: {
    title: "Nebutra UI 组件市集",
    subtitle: "复制即用的组件，原生绑定 Nebutra 设计系统。",
    intro:
      "每个组件都以 shadcn registry 清单的形式发布，附带源码、依赖和 CSS 变量。在配置好 shadcn-cli 的 Next.js 项目中运行下方安装命令即可使用。",
    empty:
      "暂无 registry 条目，请运行 pnpm --filter @nebutra/ui build:registry 生成 apps/design-docs/public/r/ 下的清单。",
    backToDocs: "返回设计系统文档",
    allComponents: "全部组件",
    install: "安装",
    installHelper: "确保你的 Next.js 项目已经运行过 shadcn init 并配置了 components.json。",
    npmDependencies: "npm 依赖",
    registryDependencies: "Registry 依赖",
    cssVariables: "CSS 变量",
    source: "源码",
    viewRawJson: "查看原始 JSON",
  },
  ja: {
    title: "Nebutra UI レジストリ",
    subtitle: "コピー＆ペーストで使えるコンポーネント、Nebutra デザインシステムと連動。",
    intro:
      "下記の各コンポーネントは shadcn registry マニフェストとして配信され、ソース・依存関係・CSS 変数を含みます。shadcn-cli が設定済みの Next.js プロジェクトで以下のインストールコマンドを実行してください。",
    empty:
      "レジストリ項目が見つかりません。pnpm --filter @nebutra/ui build:registry を実行して apps/design-docs/public/r/ を生成してください。",
    backToDocs: "デザインシステム文書へ戻る",
    allComponents: "すべてのコンポーネント",
    install: "インストール",
    installHelper:
      "Next.js プロジェクトで shadcn init が実行され、components.json が用意されていることを確認してください。",
    npmDependencies: "npm 依存関係",
    registryDependencies: "Registry 依存関係",
    cssVariables: "CSS 変数",
    source: "ソース",
    viewRawJson: "JSON を表示",
  },
  ko: {
    title: "Nebutra UI 레지스트리",
    subtitle: "복사 붙여넣기로 바로 쓰는 컴포넌트, Nebutra 디자인 시스템과 연동.",
    intro:
      "아래 모든 컴포넌트는 shadcn registry 매니페스트로 제공되며, 소스 코드와 의존성, CSS 변수를 포함합니다. shadcn-cli가 설정된 Next.js 프로젝트에서 아래 설치 명령을 실행하세요.",
    empty:
      "레지스트리 항목이 없습니다. pnpm --filter @nebutra/ui build:registry 를 실행하여 apps/design-docs/public/r/ 를 채우세요.",
    backToDocs: "디자인 시스템 문서로 돌아가기",
    allComponents: "모든 컴포넌트",
    install: "설치",
    installHelper:
      "Next.js 프로젝트에서 shadcn init이 실행되었고 components.json이 있는지 확인하세요.",
    npmDependencies: "npm 의존성",
    registryDependencies: "Registry 의존성",
    cssVariables: "CSS 변수",
    source: "소스",
    viewRawJson: "원본 JSON 보기",
  },
  de: {
    title: "Nebutra UI Registry",
    subtitle: "Copy-paste-Komponenten, nahtlos mit dem Nebutra Design-System verbunden.",
    intro:
      "Jede Komponente unten wird als shadcn-Registry-Manifest mit Quellcode, Abhängigkeiten und genutzten CSS-Variablen ausgeliefert. Führe den Install-Befehl in einem Next.js-Projekt mit konfiguriertem shadcn-CLI aus.",
    empty:
      "Keine Registry-Einträge gefunden. Führe pnpm --filter @nebutra/ui build:registry aus, um apps/design-docs/public/r/ zu befüllen.",
    backToDocs: "Zurück zur Design-System-Dokumentation",
    allComponents: "Alle Komponenten",
    install: "Installation",
    installHelper:
      "Stelle sicher, dass dein Next.js-Projekt mit shadcn init initialisiert wurde und eine components.json besitzt.",
    npmDependencies: "npm-Abhängigkeiten",
    registryDependencies: "Registry-Abhängigkeiten",
    cssVariables: "CSS-Variablen",
    source: "Quellcode",
    viewRawJson: "JSON anzeigen",
  },
  es: {
    title: "Registro de componentes Nebutra UI",
    subtitle: "Componentes copy-paste, integrados con el sistema de diseño Nebutra.",
    intro:
      "Cada componente se publica como un manifiesto de shadcn registry con su código fuente, dependencias y variables CSS. Ejecuta el comando de instalación en cualquier proyecto Next.js que tenga shadcn-cli configurado.",
    empty:
      "No se encontraron entradas de registro. Ejecuta pnpm --filter @nebutra/ui build:registry para poblar apps/design-docs/public/r/.",
    backToDocs: "Volver a la documentación del sistema de diseño",
    allComponents: "Todos los componentes",
    install: "Instalación",
    installHelper:
      "Asegúrate de que tu proyecto Next.js fue inicializado con shadcn init y tiene un components.json.",
    npmDependencies: "Dependencias npm",
    registryDependencies: "Dependencias del registro",
    cssVariables: "Variables CSS",
    source: "Código fuente",
    viewRawJson: "Ver JSON sin procesar",
  },
  fr: {
    title: "Registre des composants Nebutra UI",
    subtitle: "Composants copy-paste, connectés au design system Nebutra.",
    intro:
      "Chaque composant ci-dessous est publié sous forme de manifeste shadcn registry avec son code source, ses dépendances et ses variables CSS. Exécutez la commande d'installation dans tout projet Next.js configuré avec shadcn-cli.",
    empty:
      "Aucune entrée de registre trouvée. Exécutez pnpm --filter @nebutra/ui build:registry pour générer apps/design-docs/public/r/.",
    backToDocs: "Retour à la documentation du design system",
    allComponents: "Tous les composants",
    install: "Installation",
    installHelper:
      "Assurez-vous que votre projet Next.js a été initialisé avec shadcn init et possède un components.json.",
    npmDependencies: "Dépendances npm",
    registryDependencies: "Dépendances du registre",
    cssVariables: "Variables CSS",
    source: "Code source",
    viewRawJson: "Voir le JSON brut",
  },
};

export function getRegistryStrings(lang: string): RegistryStrings {
  return TRANSLATIONS[lang as RegistryLang] ?? TRANSLATIONS.en;
}
