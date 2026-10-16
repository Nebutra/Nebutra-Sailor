import { SecuritySettingsClient } from "@/components/settings/security/security-settings-client";
import { SettingsPageHeader } from "../settings-page-header";

export const metadata = {
  title: "Security — Settings",
};

export default function SecuritySettingsPage() {
  return (
    <>
      <SettingsPageHeader section="security" />
      <SecuritySettingsClient />
    </>
  );
}
