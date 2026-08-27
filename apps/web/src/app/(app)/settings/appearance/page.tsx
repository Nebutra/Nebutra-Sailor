import { getTranslations } from "next-intl/server";
import {
  AppearanceSection,
  DiffMarkerSegmented,
  FontSizeStepper,
  FontSmoothingToggle,
  MotionSegmented,
  PointerCursorToggle,
  ThemeEditorCard,
  ThemeModeSegmented,
} from "@/components/appearance";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const t = await getTranslations("settings.appearance");

  return (
    <div className="space-y-6">
      <AppearanceSection
        title={t("theme.title")}
        description={t("theme.description")}
        action={<ThemeModeSegmented />}
      />

      {/* Consolidated theme editor — preset selector + import/copy + per-token rows. */}
      <ThemeEditorCard />

      <AppearanceSection
        title={t("pointerCursor.title")}
        description={t("pointerCursor.description")}
      >
        <PointerCursorToggle />
      </AppearanceSection>

      <AppearanceSection
        title={t("motion.title")}
        description={t("motion.description")}
        action={<MotionSegmented />}
      />

      <AppearanceSection title={t("typography.title")} description={t("typography.description")}>
        <div className="space-y-4">
          <FontSizeStepper
            valueKey="uiFontSize"
            min={12}
            max={18}
            defaultPx={14}
            label={t("typography.uiFontSize")}
            description={t("typography.uiFontSizeDescription")}
          />
          <FontSizeStepper
            valueKey="codeFontSize"
            min={10}
            max={18}
            defaultPx={12}
            label={t("typography.codeFontSize")}
            description={t("typography.codeFontSizeDescription")}
          />
        </div>
      </AppearanceSection>

      <AppearanceSection
        title={t("diffMarkers.title")}
        description={t("diffMarkers.description")}
        action={<DiffMarkerSegmented />}
      />

      <AppearanceSection
        title={t("fontSmoothing.title")}
        description={t("fontSmoothing.description")}
      >
        <FontSmoothingToggle />
      </AppearanceSection>
    </div>
  );
}
