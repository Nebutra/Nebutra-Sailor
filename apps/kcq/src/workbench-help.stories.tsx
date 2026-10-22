import { WorkbenchHelp } from "./workbench-help";
export default { title: "Products/KCQ/Help", component: WorkbenchHelp };
export const Guide = {
  args: {
    section: "guide",
    signedIn: false,
    signInUrl: "https://auth.nebutra.com/sign-in",
    analyticsConsent: false,
    diagnostics: { chartRevision: "eb21bb3c", theme: "light", viewport: "wide" },
    onClose: () => {},
    onConsentChange: () => true,
  },
};
export const Feedback = { args: { ...Guide.args, section: "feedback" } };
