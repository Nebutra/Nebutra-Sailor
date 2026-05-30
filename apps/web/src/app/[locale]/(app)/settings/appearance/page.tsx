import { AnimateIn } from "@nebutra/ui/components";
import { getTranslations } from "next-intl/server";
import {
  AccentSwatchPicker,
  AppearanceSection,
  FontSizeStepper,
  MotionSegmented,
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
        >
          <></>
        </AppearanceSection>

        <AppearanceSection title={t("accent.title")} description={t("accent.description")}>
          <AccentSwatchPicker />
        </AppearanceSection>

        <AppearanceSection title={t("typography.title")} description={t("typography.description")}>
          <div className="space-y-4">
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
          title={t("motion.title")}
          description={t("motion.description")}
          action={<MotionSegmented />}
        >
          <></>
        </AppearanceSection>

        <AppearanceSection title={t("surface.title")} description={t("surface.description")}>
          <TransparencyToggle />
        </AppearanceSection>
      </div>
    </AnimateIn>
  );
}
