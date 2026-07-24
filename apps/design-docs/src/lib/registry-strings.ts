import { brand } from "@nebutra/brand/metadata";
/**
 * Registry-surface translations for brand design host.
 *
 * Independent of Fumadocs `i18n.ts` (which only covers en/zh for MDX docs
 * chrome). The registry is a brand-facing component marketplace and matches
 * the 7-language coverage of apps/landing.
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
  maturity: {
    title: string;
    subtitle: string;
    componentCountLabel: string;
    canonical: string;
    stable: string;
    beta: string;
    experimental: string;
    canonicalDescription: string;
    stableDescription: string;
    betaDescription: string;
    experimentalDescription: string;
    canonicalRailTitle: string;
  };
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
    title: `${brand.name} UI Registry`,
    subtitle: `Copy-paste components, wired to the ${brand.name} design system.`,
    intro:
      "Every component below ships as a shadcn registry manifest with its source, dependencies, and the CSS variables it consumes. Run the install command in any Next.js project that has shadcn-cli configured.",
    empty:
      "No registry items found. Run pnpm --filter @nebutra/ui build:registry to populate apps/design-docs/public/r/.",
    backToDocs: "Back to design system docs",
    maturity: {
      title: "Maturity matrix",
      subtitle: "Distribution is generated from registry metadata, not hand-written page copy.",
      componentCountLabel: "items",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription:
        "Reference implementation with complete docs, stories, registry, and API contract.",
      stableDescription:
        "Production-safe API that still needs canonical examples or governance hardening.",
      betaDescription: "Usable surface with an explicit migration path before it can be promoted.",
      experimentalDescription:
        "Discovery or showcase surface; do not treat as a default primitive choice.",
      canonicalRailTitle: "Canonical starting points",
    },
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
    title: `${brand.name} UI 组件市集`,
    subtitle: `复制即用的组件，原生绑定 ${brand.name} 设计系统。`,
    intro:
      "每个组件都以 shadcn registry 清单的形式发布，附带源码、依赖和 CSS 变量。在配置好 shadcn-cli 的 Next.js 项目中运行下方安装命令即可使用。",
    empty:
      "暂无 registry 条目，请运行 pnpm --filter @nebutra/ui build:registry 生成 apps/design-docs/public/r/ 下的清单。",
    backToDocs: "返回设计系统文档",
    maturity: {
      title: "成熟度矩阵",
      subtitle: "分布来自 registry metadata，而不是页面手写文案。",
      componentCountLabel: "项",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription: "参考实现，已具备完整文档、Storybook、registry 与 API 契约。",
      stableDescription: "生产可用 API，但仍需要 canonical 示例或治理加固。",
      betaDescription: "可用表面，晋级前必须保留明确迁移路径。",
      experimentalDescription: "探索或展示表面，不应作为默认 primitive 选择。",
      canonicalRailTitle: "Canonical 起点",
    },
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
    title: `${brand.name} UI レジストリ`,
    subtitle: `コピー＆ペーストで使えるコンポーネント、${brand.name} デザインシステムと連動。`,
    intro:
      "下記の各コンポーネントは shadcn registry マニフェストとして配信され、ソース・依存関係・CSS 変数を含みます。shadcn-cli が設定済みの Next.js プロジェクトで以下のインストールコマンドを実行してください。",
    empty:
      "レジストリ項目が見つかりません。pnpm --filter @nebutra/ui build:registry を実行して apps/design-docs/public/r/ を生成してください。",
    backToDocs: "デザインシステム文書へ戻る",
    maturity: {
      title: "成熟度マトリクス",
      subtitle: "分布は手書きコピーではなく registry metadata から生成されます。",
      componentCountLabel: "件",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription: "完全な docs、stories、registry、API 契約を持つ参照実装。",
      stableDescription: "本番利用可能な API。canonical 例や治理強化はまだ必要です。",
      betaDescription: "利用可能な surface。昇格前に明確な移行経路が必要です。",
      experimentalDescription:
        "探索または showcase surface。既定 primitive として扱わないでください。",
      canonicalRailTitle: "Canonical の開始点",
    },
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
    title: `${brand.name} UI 레지스트리`,
    subtitle: `복사 붙여넣기로 바로 쓰는 컴포넌트, ${brand.name} 디자인 시스템과 연동.`,
    intro:
      "아래 모든 컴포넌트는 shadcn registry 매니페스트로 제공되며, 소스 코드와 의존성, CSS 변수를 포함합니다. shadcn-cli가 설정된 Next.js 프로젝트에서 아래 설치 명령을 실행하세요.",
    empty:
      "레지스트리 항목이 없습니다. pnpm --filter @nebutra/ui build:registry 를 실행하여 apps/design-docs/public/r/ 를 채우세요.",
    backToDocs: "디자인 시스템 문서로 돌아가기",
    maturity: {
      title: "성숙도 매트릭스",
      subtitle: "분포는 손으로 쓴 문구가 아니라 registry metadata 에서 생성됩니다.",
      componentCountLabel: "개",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription: "문서, Storybook, registry, API 계약을 모두 갖춘 기준 구현입니다.",
      stableDescription:
        "프로덕션 사용이 가능한 API이며 canonical 예시나 거버넌스 보강이 남아 있습니다.",
      betaDescription: "사용 가능한 surface 이지만 승격 전 명확한 마이그레이션 경로가 필요합니다.",
      experimentalDescription:
        "탐색 또는 showcase surface 이며 기본 primitive 로 선택하지 않습니다.",
      canonicalRailTitle: "Canonical 시작점",
    },
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
    title: `${brand.name} UI Registry`,
    subtitle: `Copy-paste-Komponenten, nahtlos mit dem ${brand.name} Design-System verbunden.`,
    intro:
      "Jede Komponente unten wird als shadcn-Registry-Manifest mit Quellcode, Abhängigkeiten und genutzten CSS-Variablen ausgeliefert. Führe den Install-Befehl in einem Next.js-Projekt mit konfiguriertem shadcn-CLI aus.",
    empty:
      "Keine Registry-Einträge gefunden. Führe pnpm --filter @nebutra/ui build:registry aus, um apps/design-docs/public/r/ zu befüllen.",
    backToDocs: "Zurück zur Design-System-Dokumentation",
    maturity: {
      title: "Maturity-Matrix",
      subtitle: "Die Verteilung wird aus Registry-Metadaten generiert, nicht aus Seitentext.",
      componentCountLabel: "Einträge",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription:
        "Referenzimplementierung mit vollständigen Docs, Stories, Registry und API-Vertrag.",
      stableDescription:
        "Produktionssichere API, braucht aber noch canonical Beispiele oder Governance.",
      betaDescription: "Nutzbare Oberfläche mit klarem Migrationspfad vor der Beförderung.",
      experimentalDescription:
        "Discovery- oder Showcase-Oberfläche; nicht als Default-Primitive verwenden.",
      canonicalRailTitle: "Canonical Startpunkte",
    },
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
    title: `Registro de componentes ${brand.name} UI`,
    subtitle: `Componentes copy-paste, integrados con el sistema de diseño ${brand.name}.`,
    intro:
      "Cada componente se publica como un manifiesto de shadcn registry con su código fuente, dependencias y variables CSS. Ejecuta el comando de instalación en cualquier proyecto Next.js que tenga shadcn-cli configurado.",
    empty:
      "No se encontraron entradas de registro. Ejecuta pnpm --filter @nebutra/ui build:registry para poblar apps/design-docs/public/r/.",
    backToDocs: "Volver a la documentación del sistema de diseño",
    maturity: {
      title: "Matriz de madurez",
      subtitle: "La distribución se genera desde metadata del registry, no desde texto manual.",
      componentCountLabel: "ítems",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription:
        "Implementación de referencia con docs, stories, registry y contrato API completos.",
      stableDescription:
        "API segura para producción que aún necesita ejemplos canonical o más gobernanza.",
      betaDescription: "Superficie usable con ruta de migración explícita antes de promocionarse.",
      experimentalDescription:
        "Superficie de exploración o showcase; no debe ser la primitive por defecto.",
      canonicalRailTitle: "Puntos de partida canonical",
    },
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
    title: `Registre des composants ${brand.name} UI`,
    subtitle: `Composants copy-paste, connectés au design system ${brand.name}.`,
    intro:
      "Chaque composant ci-dessous est publié sous forme de manifeste shadcn registry avec son code source, ses dépendances et ses variables CSS. Exécutez la commande d'installation dans tout projet Next.js configuré avec shadcn-cli.",
    empty:
      "Aucune entrée de registre trouvée. Exécutez pnpm --filter @nebutra/ui build:registry pour générer apps/design-docs/public/r/.",
    backToDocs: "Retour à la documentation du design system",
    maturity: {
      title: "Matrice de maturité",
      subtitle: "La distribution provient des métadonnées du registry, pas du texte des pages.",
      componentCountLabel: "éléments",
      canonical: "Canonical",
      stable: "Stable",
      beta: "Beta",
      experimental: "Experimental",
      canonicalDescription:
        "Implémentation de référence avec docs, stories, registry et contrat API complets.",
      stableDescription:
        "API sûre en production, avec exemples canonical ou gouvernance à renforcer.",
      betaDescription: "Surface utilisable avec un chemin de migration explicite avant promotion.",
      experimentalDescription:
        "Surface de découverte ou de showcase; ne pas choisir comme primitive par défaut.",
      canonicalRailTitle: "Points de départ canonical",
    },
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
