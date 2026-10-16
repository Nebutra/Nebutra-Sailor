"use client";

import {
  Warning as AlertCircle,
  CheckCircle as CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { emitBrowserEvent } from "@/lib/analytics/emit";

// Type definitions
interface WizardStep1 {
  role: "solo_developer" | "founder" | "cto" | "developer" | "other" | null;
  teamSize: "1" | "2-5" | "6-20" | "21-50" | "50+" | null;
}

interface WizardStep2 {
  useCase: "saas" | "ai_tool" | "marketplace" | "internal_tool" | "agency" | "other" | null;
  buildingWhat: string;
  industry: string;
}

interface WizardStep3 {
  tier: "INDIVIDUAL" | "OPC" | "STARTUP" | "ENTERPRISE" | null;
  githubHandle: string;
  twitterHandle: string;
  referralSource: "twitter" | "github" | "product_hunt" | "friend" | "search" | "other" | null;
  lookingFor: string[];
}

// Values are API payload and stay as they are; labels live in en.json.
const LOOKING_FOR_OPTIONS = [
  { value: "co-founder", labelKey: "step3.lookingFor.coFounder" },
  { value: "designer", labelKey: "step3.lookingFor.designer" },
  { value: "engineer", labelKey: "step3.lookingFor.engineer" },
  { value: "early-users", labelKey: "step3.lookingFor.earlyUsers" },
  { value: "angel-investor", labelKey: "step3.lookingFor.angelInvestor" },
  { value: "industry-advisor", labelKey: "step3.lookingFor.industryAdvisor" },
  { value: "sales-ops", labelKey: "step3.lookingFor.salesOps" },
  { value: "nothing-solo", labelKey: "step3.lookingFor.nothingSolo" },
] as const;

interface WizardStep4 {
  licenseKey: string;
}

interface LicenseApiResponse {
  error?: string;
  community?: {
    memberNumber?: number | string;
  };
  requireCheckout?: boolean;
  sessionId?: string;
  url?: string;
  license?: {
    licenseKey?: string;
  };
}

type TeamSize = NonNullable<WizardStep1["teamSize"]>;
type ReferralSource = NonNullable<WizardStep3["referralSource"]>;

const TEAM_SIZE_OPTIONS = [
  "1",
  "2-5",
  "6-20",
  "21-50",
  "50+",
] as const satisfies readonly TeamSize[];
const REFERRAL_SOURCE_OPTIONS = [
  { value: "twitter", labelKey: "referralSource.twitter" },
  { value: "github", labelKey: "referralSource.github" },
  { value: "product_hunt", labelKey: "referralSource.productHunt" },
  { value: "friend", labelKey: "referralSource.friend" },
  { value: "search", labelKey: "referralSource.search" },
  { value: "other", labelKey: "referralSource.other" },
] as const satisfies readonly { value: ReferralSource; labelKey: string }[];

const ROLE_OPTIONS = [
  { value: "solo_developer", emoji: "👨‍💻", labelKey: "step1.roles.soloDeveloper" },
  { value: "founder", emoji: "🚀", labelKey: "step1.roles.founder" },
  { value: "cto", emoji: "🏢", labelKey: "step1.roles.cto" },
  { value: "developer", emoji: "👥", labelKey: "step1.roles.developer" },
  { value: "other", emoji: "❓", labelKey: "step1.roles.other" },
] as const satisfies readonly {
  value: NonNullable<WizardStep1["role"]>;
  emoji: string;
  labelKey: string;
}[];

const USE_CASE_OPTIONS = [
  { value: "saas", key: "saas" },
  { value: "ai_tool", key: "aiTool" },
  { value: "marketplace", key: "marketplace" },
  { value: "internal_tool", key: "internalTool" },
  { value: "agency", key: "agency" },
  { value: "other", key: "other" },
] as const satisfies readonly { value: NonNullable<WizardStep2["useCase"]>; key: string }[];

const WIZARD_STEP_MARKERS = [
  { id: "step-1", value: 1 },
  { id: "step-2", value: 2 },
  { id: "step-3", value: 3 },
  { id: "step-4", value: 4 },
] as const;

interface LicenseWizardProps {
  redirectToCheckout?: (url: string) => void;
}

function defaultRedirectToCheckout(url: string): void {
  window.location.href = url;
}

/**
 * Pre-select a sensible default plan from team size.
 *
 * Team size does NOT gate anything: everything is Apache-2.0, so commercial use
 * is free at every size. The tier values are API enums kept from the retired
 * licence tiers; they now mean Community (INDIVIDUAL / OPC), Team support
 * (STARTUP) and Enterprise. Paid plans sell support, SLAs, indemnity, and a
 * trademark licence, so larger orgs are merely *more likely* to want them.
 * Every plan stays selectable regardless of what this returns.
 */
function determineLicenseTier(
  teamSize: TeamSize | null,
): "INDIVIDUAL" | "OPC" | "STARTUP" | "ENTERPRISE" | null {
  if (teamSize === "1") return "INDIVIDUAL";
  if (teamSize === "2-5" || teamSize === "6-20" || teamSize === "21-50") return "STARTUP";
  if (teamSize === "50+") return "ENTERPRISE";
  return null;
}

// Role card component
/** Enterprise plans are negotiated by the founder (docs/legal/commercial-support.md). */
const ENTERPRISE_CONTACT = "tseka@nebutra.com";

const RoleCard = ({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-2 p-4 transition-colors duration-200 ${
      selected ? "border-primary bg-blue-3" : "border-border hover:border-muted-foreground"
    }`}
  >
    <Icon className="h-6 w-6 text-foreground" />
    <span className="text-center text-sm font-medium text-foreground">{label}</span>
  </button>
);

// Use case card component
const UseCaseCard = ({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`flex flex-col gap-2 rounded-[var(--radius-xl)] border-2 p-5 text-left transition-colors duration-200 ${
      selected ? "border-primary bg-blue-3" : "border-border hover:border-muted-foreground"
    }`}
  >
    <p className="font-semibold text-foreground">{label}</p>
    <p className="text-sm text-muted-foreground">{description}</p>
  </button>
);

// Plan card component
const LicenseTierCard = ({
  title,
  price,
  description,
  features,
  highlighted,
  selected,
  onClick,
  cta,
}: {
  title: string;
  price?: string;
  description: string;
  features: string[];
  highlighted: boolean;
  selected: boolean;
  onClick: () => void;
  cta?: string;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`flex flex-col gap-4 rounded-[var(--radius-xl)] border-2 p-6 text-left transition-colors duration-200 ${
      highlighted ? "ring-2 ring-primary ring-offset-2" : ""
    } ${selected ? "border-primary bg-blue-3" : "border-border hover:border-muted-foreground"}`}
  >
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      {price && <p className="text-lg font-bold text-primary">{price}</p>}
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
    {features.length > 0 && (
      <ul className="space-y-2 text-sm text-muted-foreground">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-1 text-primary">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    )}
    {cta && <p className="text-xs font-medium text-primary">{cta}</p>}
  </button>
);

// Progress bar component
const ProgressBar = ({
  currentStep,
  totalSteps,
  label,
}: {
  currentStep: number;
  totalSteps: number;
  label: string;
}) => (
  <div>
    <progress aria-label={label} className="sr-only" max={totalSteps} value={currentStep} />
    <div aria-hidden="true" className="flex gap-2">
      {WIZARD_STEP_MARKERS.slice(0, totalSteps).map((step) => (
        <div
          key={step.id}
          className={`h-2 flex-1 rounded-[var(--radius-full)] transition-colors duration-300 ${
            step.value <= currentStep ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  </div>
);

export function LicenseWizard({
  redirectToCheckout = defaultRedirectToCheckout,
}: LicenseWizardProps = {}) {
  const t = useTranslations("licenseWizard");
  const [currentStep, setCurrentStep] = useState(1);
  const [step1, setStep1] = useState<WizardStep1>({ role: null, teamSize: null });
  const [step2, setStep2] = useState<WizardStep2>({
    useCase: null,
    buildingWhat: "",
    industry: "",
  });
  const [step3, setStep3] = useState<WizardStep3>({
    tier: null,
    githubHandle: "",
    twitterHandle: "",
    referralSource: null,
    lookingFor: [],
  });
  const [step4, setStep4] = useState<WizardStep4>({ licenseKey: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Phase 0 analytics — wizard started (mount only).
  useEffect(() => {
    emitBrowserEvent("license.wizard", { step: "started" });
  }, []);

  // Validate step 1
  const isStep1Valid = step1.role !== null && step1.teamSize !== null;

  // Validate step 2
  const isStep2Valid = step2.useCase !== null;

  // Validate step 3
  const isStep3Valid = step3.tier !== null && step3.referralSource !== null;

  // Handle next step
  const handleNext = async () => {
    if (currentStep === 1 && isStep1Valid) {
      emitBrowserEvent("license.wizard", {
        step: "step_completed",
        step_number: 1,
        step_name: "team_profile",
        role: step1.role,
        team_size: step1.teamSize,
      });
      // Auto-select tier for step 3
      const tier = determineLicenseTier(step1.teamSize);
      setStep3((prev) => ({ ...prev, tier }));
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid) {
      emitBrowserEvent("license.wizard", {
        step: "step_completed",
        step_number: 2,
        step_name: "use_case",
        use_case: step2.useCase,
      });
      setCurrentStep(3);
    } else if (currentStep === 3 && isStep3Valid) {
      emitBrowserEvent("license.wizard", {
        step: "step_completed",
        step_number: 3,
        step_name: "license_selection",
        tier: step3.tier,
      });
      // Submit form
      await handleSubmit();
    }
  };

  // Handle previous step
  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const failSubmission = (errorMessage: string) => {
    setSubmitError(errorMessage);
    setIsSubmitting(false);
    emitBrowserEvent("license.wizard", {
      step: "failed",
      tier: step3.tier,
      error_code: "submission_failed",
      error_message: errorMessage.slice(0, 200),
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isStep3Valid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const requestBody = JSON.stringify({
      role: step1.role,
      teamSize: step1.teamSize,
      useCase: step2.useCase,
      buildingWhat: step2.buildingWhat ? step2.buildingWhat : undefined,
      industry: step2.industry ? step2.industry : undefined,
      tier: step3.tier,
      githubHandle: step3.githubHandle ? step3.githubHandle : undefined,
      twitterHandle: step3.twitterHandle ? step3.twitterHandle : undefined,
      referralSource: step3.referralSource,
      lookingFor: step3.lookingFor,
      acceptedTerms: true,
    });

    let response: Response;
    try {
      response = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("errors.generic");
      failSubmission(errorMessage);
      return;
    }

    const data = (await response.json()) as LicenseApiResponse;

    if (!response.ok) {
      failSubmission(data.error ? data.error : t("errors.failed"));
      return;
    }

    if (data.requireCheckout) {
      if (!data.url) {
        failSubmission(t("errors.missingCheckout"));
        return;
      }

      emitBrowserEvent("license.wizard", {
        step: "submitted",
        tier: step3.tier,
        referral_source: step3.referralSource,
        team_size: step1.teamSize,
      });
      emitBrowserEvent("checkout", {
        action: "started",
        checkout_session_id: data.sessionId,
        payment_method: "stripe",
        referral_source: step3.referralSource,
        team_size: step1.teamSize,
        tier: step3.tier,
      });
      redirectToCheckout(data.url);
      setIsSubmitting(false);
      return;
    }

    const licenseKey = data.license?.licenseKey;
    if (!licenseKey) {
      failSubmission(t("errors.invalidResponse"));
      return;
    }

    // Store member number for the community welcome overlay
    if (data.community?.memberNumber) {
      localStorage.setItem("sleptons_member_number", String(data.community.memberNumber));
    }

    setStep4({ licenseKey });
    setCurrentStep(4);

    emitBrowserEvent("license.wizard", {
      step: "submitted",
      tier: step3.tier,
      referral_source: step3.referralSource,
      team_size: step1.teamSize,
    });

    // Redirect to the community hub after a short delay
    const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3002";
    setTimeout(() => {
      window.location.href = `${communityUrl}?welcome=true`;
    }, 2500);
    setIsSubmitting(false);
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <AnimateIn preset="emerge">
        {/* Progress bar */}
        <div className="mb-12">
          <ProgressBar currentStep={currentStep} totalSteps={4} label={t("progressLabel")} />
        </div>

        {/* Step 1: Tell us about yourself */}
        {currentStep === 1 && (
          <AnimateIn preset="fadeUp">
            <div className="space-y-8">
              <div>
                <h1 className="mb-2 text-3xl text-foreground">{t("step1.title")}</h1>
                <p className="text-muted-foreground">{t("step1.lead")}</p>
              </div>

              {/* Role field */}
              <fieldset>
                <legend className="mb-4 block text-sm font-semibold text-foreground">
                  {t("step1.roleLegend")}
                </legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ROLE_OPTIONS.map((role) => (
                    <RoleCard
                      key={role.value}
                      icon={() => <span className="text-lg">{role.emoji}</span>}
                      label={t(role.labelKey)}
                      selected={step1.role === role.value}
                      onClick={() => setStep1((prev) => ({ ...prev, role: role.value }))}
                    />
                  ))}
                </div>
              </fieldset>

              {/* Team size field */}
              <fieldset>
                <legend className="mb-4 block text-sm font-semibold text-foreground">
                  {t("step1.teamLegend")}
                </legend>
                <div className="space-y-3">
                  {TEAM_SIZE_OPTIONS.map((size) => (
                    <label key={size} className="flex items-center gap-3 cursor-pointer">
                      <input
                        data-allow-native
                        type="radio"
                        name="teamSize"
                        value={size}
                        checked={step1.teamSize === size}
                        onChange={() => setStep1((prev) => ({ ...prev, teamSize: size }))}
                        className="h-4 w-4"
                      />
                      <span className="text-foreground">
                        {size === "1"
                          ? t("step1.teamSizes.one")
                          : size === "50+"
                            ? t("step1.teamSizes.large")
                            : t("step1.teamSizes.range", { size })}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Navigation */}
              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep1Valid}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] px-6 py-3 font-semibold text-primary-foreground transition-opacity ${
                    isStep1Valid ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                  style={{ background: isStep1Valid ? "hsl(var(--primary))" : undefined }}
                >
                  {t("nav.next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Step 2: What are you building? */}
        {currentStep === 2 && (
          <AnimateIn preset="fadeUp">
            <div className="space-y-8">
              <div>
                <h1 className="mb-2 text-3xl text-foreground">{t("step2.title")}</h1>
                <p className="text-muted-foreground">{t("step2.lead")}</p>
              </div>

              {/* Use case field */}
              <fieldset>
                <legend className="mb-4 block text-sm font-semibold text-foreground">
                  {t("step2.useCaseLegend")}
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {USE_CASE_OPTIONS.map((useCase) => (
                    <UseCaseCard
                      key={useCase.value}
                      label={t(`step2.useCases.${useCase.key}.label`)}
                      description={t(`step2.useCases.${useCase.key}.description`)}
                      selected={step2.useCase === useCase.value}
                      onClick={() => setStep2((prev) => ({ ...prev, useCase: useCase.value }))}
                    />
                  ))}
                </div>
              </fieldset>

              {/* Building what field */}
              <div>
                <label
                  htmlFor="license-building-what"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  {t("step2.buildingWhatLabel")}
                </label>
                <Textarea
                  id="license-building-what"
                  name="buildingWhat"
                  autoComplete="off"
                  value={step2.buildingWhat}
                  onChange={(e) =>
                    setStep2((prev) => ({
                      ...prev,
                      buildingWhat: e.target.value.slice(0, 500),
                    }))
                  }
                  placeholder={t("step2.buildingWhatPlaceholder")}
                  rows={4}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("step2.charCount", { count: step2.buildingWhat.length })}
                </p>
              </div>

              {/* Industry field */}
              <div>
                <label
                  htmlFor="license-industry"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  {t("step2.industryLabel")}
                </label>
                <Input
                  id="license-industry"
                  type="text"
                  name="industry"
                  autoComplete="off"
                  value={step2.industry}
                  onChange={(e) => setStep2((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder={t("step2.industryPlaceholder")}
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted `}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("nav.back")}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] px-6 py-3 font-semibold text-primary-foreground transition-opacity ${
                    isStep2Valid ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                  style={{ background: isStep2Valid ? "hsl(var(--primary))" : undefined }}
                >
                  {t("nav.next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Step 3: Plan selection */}
        {currentStep === 3 && (
          <AnimateIn preset="fadeUp">
            <div className="space-y-8">
              <div>
                <h1 className="mb-2 text-3xl text-foreground">{t("step3.title")}</h1>
                <p className="text-muted-foreground">{t("step3.lead")}</p>
              </div>

              {/* Plan selection — never gated by team size. */}
              <div className="space-y-4">
                <div className="rounded-[var(--radius-lg)] bg-muted p-4">
                  <p className="text-sm text-foreground font-medium">{t("step3.freeNoteTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("step3.freeNoteBody")}</p>
                </div>

                <div className="grid gap-4">
                  <LicenseTierCard
                    title={t("tiers.individualFree")}
                    price={t("step3.community.price")}
                    description={t("step3.community.description")}
                    features={[
                      t("step3.community.f1"),
                      t("step3.community.f2"),
                      t("step3.community.f3"),
                      t("step3.community.f4"),
                    ]}
                    highlighted={step3.tier === "INDIVIDUAL" || step3.tier === "OPC"}
                    selected={step3.tier === "INDIVIDUAL"}
                    onClick={() => setStep3((prev) => ({ ...prev, tier: "INDIVIDUAL" }))}
                  />
                  <LicenseTierCard
                    title={t("tiers.startupCommercial")}
                    price={t("step3.team.price")}
                    description={t("step3.team.description")}
                    features={[
                      t("step3.team.f1"),
                      t("step3.team.f2"),
                      t("step3.team.f3"),
                      t("step3.team.f4"),
                    ]}
                    highlighted={step3.tier === "STARTUP"}
                    selected={step3.tier === "STARTUP"}
                    onClick={() => setStep3((prev) => ({ ...prev, tier: "STARTUP" }))}
                  />
                  <LicenseTierCard
                    title={t("tiers.enterprise")}
                    price={t("step3.enterprise.price")}
                    description={t("step3.enterprise.description")}
                    features={[
                      t("step3.enterprise.f1"),
                      t("step3.enterprise.f2"),
                      t("step3.enterprise.f3"),
                      t("step3.enterprise.f4"),
                    ]}
                    highlighted={step3.tier === "ENTERPRISE"}
                    selected={step3.tier === "ENTERPRISE"}
                    onClick={() => setStep3((prev) => ({ ...prev, tier: "ENTERPRISE" }))}
                    cta={t("step3.enterprise.cta", { email: ENTERPRISE_CONTACT })}
                  />
                </div>
              </div>

              {/* Contact fields */}
              {step3.tier !== "ENTERPRISE" && (
                <div className="space-y-4">
                  {/* Looking for — seeds community matching */}
                  <div>
                    <p className="mb-3 text-sm font-semibold text-foreground">
                      {t("step3.lookingForTitle")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {LOOKING_FOR_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          htmlFor={`looking-for-${opt.value}`}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            id={`looking-for-${opt.value}`}
                            type="checkbox"
                            value={opt.value}
                            checked={step3.lookingFor.includes(opt.value)}
                            onChange={(e) => {
                              setStep3((prev) => ({
                                ...prev,
                                lookingFor: e.target.checked
                                  ? [...prev.lookingFor, opt.value]
                                  : prev.lookingFor.filter((v) => v !== opt.value),
                              }));
                            }}
                            className="h-4 w-4 rounded-[var(--radius-sm)]"
                          />
                          <span className="text-sm text-foreground">{t(opt.labelKey)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="license-github-handle"
                      className="mb-2 block text-sm font-semibold text-foreground"
                    >
                      {t("step3.githubLabel")}
                    </label>
                    <Input
                      id="license-github-handle"
                      type="text"
                      name="githubHandle"
                      autoComplete="off"
                      spellCheck={false}
                      value={step3.githubHandle}
                      onChange={(e) =>
                        setStep3((prev) => ({ ...prev, githubHandle: e.target.value }))
                      }
                      placeholder={t("step3.githubPlaceholder")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="license-twitter-handle"
                      className="mb-2 block text-sm font-semibold text-foreground"
                    >
                      {t("step3.twitterLabel")}
                    </label>
                    <Input
                      id="license-twitter-handle"
                      type="text"
                      name="twitterHandle"
                      autoComplete="off"
                      spellCheck={false}
                      value={step3.twitterHandle}
                      onChange={(e) =>
                        setStep3((prev) => ({ ...prev, twitterHandle: e.target.value }))
                      }
                      placeholder={t("step3.twitterPlaceholder")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="license-referral-source"
                      className="mb-3 block text-sm font-semibold text-foreground"
                    >
                      {t("step3.referralLabel")}
                    </label>
                    <Select
                      name="referralSource"
                      value={step3.referralSource ?? ""}
                      onValueChange={(value) =>
                        setStep3((prev) => ({
                          ...prev,
                          referralSource: value ? (value as ReferralSource) : null,
                        }))
                      }
                    >
                      <SelectTrigger id="license-referral-source">
                        <SelectValue placeholder={t("referralSource.selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {submitError && (
                <div
                  aria-live="polite"
                  className="flex gap-3 rounded-[var(--radius-lg)] border border-destructive bg-destructive/10 p-4"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive-strong" />
                  <p className="text-sm text-destructive-strong">{submitError}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted `}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("nav.back")}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep3Valid || isSubmitting}
                  className={`flex items-center gap-2 rounded-[var(--radius-lg)] px-6 py-3 font-semibold text-primary-foreground transition-opacity ${
                    isStep3Valid && !isSubmitting
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  style={{
                    background: isStep3Valid && !isSubmitting ? "hsl(var(--primary))" : undefined,
                  }}
                >
                  {isSubmitting ? t("nav.submitting") : t("nav.submit")}
                  {!isSubmitting && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <AnimateIn preset="fadeUp">
            <div className="flex flex-col items-center gap-8 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-full)] bg-blue-3">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>

              <div>
                <h1 className="mb-3 text-3xl text-foreground">{t("step4.title")}</h1>
                <p className="text-lg text-muted-foreground">
                  {step3.tier === "INDIVIDUAL" || step3.tier === "OPC"
                    ? t("step4.free")
                    : t("step4.paid")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t("step4.redirecting")}</p>
              </div>

              {/* Registration key — the API still calls it a licence key; it grants nothing. */}
              <div className="w-full max-w-md">
                <p className="mb-3 text-sm font-semibold text-foreground">{t("step4.keyLabel")}</p>
                <div className="relative flex items-center rounded-[var(--radius-lg)] bg-muted px-4 py-3">
                  <code className="flex-1 font-mono text-sm text-foreground">
                    {step4.licenseKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(step4.licenseKey);
                    }}
                    className="ml-2 text-xs font-medium text-primary hover:underline"
                  >
                    {t("step4.copy")}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex w-full max-w-md flex-col gap-3">
                <a
                  href={`${process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3002"}?welcome=true`}
                  className="rounded-[var(--radius-lg)] bg-primary px-6 py-3 text-center font-semibold text-primary-foreground transition-[background-color] hover:bg-primary/90"
                >
                  {t("step4.community")}
                </a>
                <a
                  href="https://app.nebutra.com/workspace"
                  className="rounded-[var(--radius-lg)] border border-border px-6 py-3 text-center font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  {t("step4.console")}
                </a>
              </div>
            </div>
          </AnimateIn>
        )}
      </AnimateIn>
    </section>
  );
}
