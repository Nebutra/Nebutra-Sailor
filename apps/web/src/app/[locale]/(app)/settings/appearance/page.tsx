import { AnimateIn } from "@nebutra/ui/components";
import { getTranslations } from "next-intl/server";
import {
  AccentSwatchPicker,
  AppearanceSection,
  ColorPickerRow,
  ContrastSlider,
  DiffMarkerSegmented,
  FontFamilyPicker,
  FontSizeStepper,
  FontSmoothingToggle,
  MotionSegmented,
  PointerCursorToggle,
  ThemeModeSegmented,
  TransparencyToggle,
} from "@/components/appearance";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const t = await getTranslations("settings.appearance");

  return (
    <AnimateIn preset="fadeUp">
      <div className="space-y-6">
        <AppearanceSection
          title={t("theme.title")}
          description={t("theme.description")}
          action={<ThemeModeSegmented />}
        ></AppearanceSection>

        <AppearanceSection title={t("colors.title")} description={t("colors.description")}>
          <div className="space-y-4">
            <AccentSwatchPicker />
            <ColorPickerRow
              valueKey="backgroundColor"
              label={t("colors.background.label")}
              description={t("colors.background.description")}
            />
            <ColorPickerRow
              valueKey="foregroundColor"
              label={t("colors.foreground.label")}
              description={t("colors.foreground.description")}
            />
          </div>
        </AppearanceSection>

        <AppearanceSection title={t("typography.title")} description={t("typography.description")}>
          <div className="space-y-4">
            <FontFamilyPicker
              valueKey="uiFontFamily"
              label={t("fontFamily.uiLabel")}
              description={t("fontFamily.uiDescription")}
            />
            <FontFamilyPicker
              valueKey="codeFontFamily"
              label={t("fontFamily.codeLabel")}
              description={t("fontFamily.codeDescription")}
            />
            <FontSizeStepper
              valueKey="uiFontSize"
              min={12}
              max={18}
              label={t("typography.uiFontSize")}
              description={t("typography.uiFontSizeDescription")}
            />
            <FontSizeStepper
              valueKey="codeFontSize"
              min={10}
              max={18}
              label={t("typography.codeFontSize")}
              description={t("typography.codeFontSizeDescription")}
            />
          </div>
        </AppearanceSection>

        <AppearanceSection
          title={t("contrast.title")}
          description={t("contrast.description")}
          action={<ContrastSlider />}
        ></AppearanceSection>

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
        ></AppearanceSection>

        <AppearanceSection title={t("surface.title")} description={t("surface.description")}>
          <TransparencyToggle />
        </AppearanceSection>

        <AppearanceSection
          title={t("diffMarkers.title")}
          description={t("diffMarkers.description")}
          action={<DiffMarkerSegmented />}
        ></AppearanceSection>

        <AppearanceSection
          title={t("fontSmoothing.title")}
          description={t("fontSmoothing.description")}
        >
          <FontSmoothingToggle />
        </AppearanceSection>
      </div>
    </AnimateIn>
  );
}
