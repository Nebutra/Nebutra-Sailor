"use client";

import { AnimateIn } from "@nebutra/ui/components";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

const LOOKING_FOR_OPTIONS = [
  { value: "co-founder", label: "Co-founder" },
  { value: "designer", label: "Designer" },
  { value: "engineer", label: "Engineer" },
  { value: "early-users", label: "Early users" },
  { value: "angel-investor", label: "Angel investor" },
  { value: "industry-advisor", label: "Industry advisor" },
  { value: "sales-ops", label: "Sales / Ops" },
  { value: "nothing-solo", label: "Nothing — solo is the plan" },
] as const;

interface WizardStep4 {
  licenseKey: string;
}

// Role card component
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
    onClick={onClick}
    className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all duration-200 ${
      selected
        ? "border-[var(--blue-9)] bg-[var(--blue-3)]"
        : "border-[var(--neutral-7)] hover:border-[var(--neutral-11)]"
    }`}
  >
    <Icon className="h-6 w-6 text-[var(--neutral-12)]" />
    <span className="text-center text-sm font-medium text-[var(--neutral-12)]">{label}</span>
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
    onClick={onClick}
    className={`flex flex-col gap-2 rounded-xl border-2 p-5 text-left transition-all duration-200 ${
      selected
        ? "border-[var(--blue-9)] bg-[var(--blue-3)]"
        : "border-[var(--neutral-7)] hover:border-[var(--neutral-11)]"
    }`}
  >
    <p className="font-semibold text-[var(--neutral-12)]">{label}</p>
    <p className="text-sm text-[var(--neutral-11)]">{description}</p>
  </button>
);

// License tier card component
const LicenseTierCard = ({
  title,
  price,
  description,
  features,
  highlighted,
  selected,
  onClick,
  variant = "default",
  cta,
}: {
  title: string;
  price?: string;
  description: string;
  features: string[];
  highlighted: boolean;
  selected: boolean;
  onClick: () => void;
  variant?: "default" | "small";
  cta?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col gap-4 rounded-xl border-2 p-6 text-left transition-all duration-200 ${
      highlighted ? "ring-2 ring-[var(--brand-primary)] ring-offset-2" : ""
    } ${
      selected
        ? "border-[var(--blue-9)] bg-[var(--blue-3)]"
        : "border-[var(--neutral-7)] hover:border-[var(--neutral-11)]"
    }`}
  >
    <div>
      <p className="font-semibold text-[var(--neutral-12)]">{title}</p>
      {price && <p className="text-lg font-bold text-[var(--blue-9)]">{price}</p>}
    </div>
    <p className="text-sm text-[var(--neutral-11)]">{description}</p>
    {features.length > 0 && (
      <ul className="space-y-2 text-sm text-[var(--neutral-11)]">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 text-[var(--blue-9)]">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    )}
    {cta && <p className="text-xs font-medium text-[var(--blue-9)]">{cta}</p>}
  </button>
);

// Progress bar component
const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex gap-2">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div
        key={i}
        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
          i < currentStep ? "bg-[var(--blue-9)]" : "bg-[var(--neutral-7)]"
        }`}
      />
    ))}
  </div>
);

export function LicenseWizard() {
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

  // Determine license tier based on team size
  const determineLicenseTier = (
    teamSize: string | null,
  ): "INDIVIDUAL" | "OPC" | "STARTUP" | "ENTERPRISE" | null => {
    if (teamSize === "1") return "INDIVIDUAL";
    if (teamSize === "2-5" || teamSize === "6-20" || teamSize === "21-50") return "STARTUP";
    if (teamSize === "50+") return "ENTERPRISE";
    return null;
  };

  // Validate step 1
  const isStep1Valid = step1.role !== null && step1.teamSize !== null;

  // Validate step 2
  const isStep2Valid = step2.useCase !== null;

  // Validate step 3
  const isStep3Valid = step3.tier !== null && step3.referralSource !== null;

  // Handle next step
  const handleNext = async () => {
    if (currentStep === 1 && isStep1Valid) {
      // Auto-select tier for step 3
      const tier = determineLicenseTier(step1.teamSize);
      setStep3((prev) => ({ ...prev, tier }));
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid) {
      setCurrentStep(3);
    } else if (currentStep === 3 && isStep3Valid) {
      // Submit form
      await handleSubmit();
    }
  };

  // Handle previous step
  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isStep3Valid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: step1.role,
          teamSize: step1.teamSize,
          useCase: step2.useCase,
          buildingWhat: step2.buildingWhat || undefined,
          industry: step2.industry || undefined,
          tier: step3.tier,
          githubHandle: step3.githubHandle || undefined,
          twitterHandle: step3.twitterHandle || undefined,
          referralSource: step3.referralSource,
          lookingFor: step3.lookingFor,
          acceptedTerms: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create license");
      }

      // Store member number for Sleptons welcome overlay
      if (data.community?.memberNumber) {
        localStorage.setItem("sleptons_member_number", String(data.community.memberNumber));
      }

      setStep4({ licenseKey: data.license.licenseKey });
      setCurrentStep(4);

      // Redirect to Sleptons community after a short delay
      const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3002";
      setTimeout(() => {
        window.location.href = `${communityUrl}?welcome=true`;
      }, 2500);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <AnimateIn preset="emerge">
        {/* Progress bar */}
        <div className="mb-12">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Step 1: Tell us about yourself */}
        {currentStep === 1 && (
          <AnimateIn preset="fadeUp">
            <div className="space-y-8">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-[var(--neutral-12)]">
                  Tell us about yourself
                </h1>
                <p className="text-[var(--neutral-11)]">
                  Help us understand your role and team size to find the perfect license for you.
                </p>
              </div>

              {/* Role field */}
              <div>
                <label className="mb-4 block text-sm font-semibold text-[var(--neutral-12)]">
                  What's your role?
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <RoleCard
                    icon={() => <span className="text-lg">👨‍💻</span>}
                    label="Solo Developer"
                    selected={step1.role === "solo_developer"}
                    onClick={() => setStep1((prev) => ({ ...prev, role: "solo_developer" }))}
                  />
                  <RoleCard
                    icon={() => <span className="text-lg">🚀</span>}
                    label="Founder/CEO"
                    selected={step1.role === "founder"}
                    onClick={() => setStep1((prev) => ({ ...prev, role: "founder" }))}
                  />
                  <RoleCard
                    icon={() => <span className="text-lg">🏢</span>}
                    label="CTO/Tech Lead"
                    selected={step1.role === "cto"}
                    onClick={() => setStep1((prev) => ({ ...prev, role: "cto" }))}
                  />
                  <RoleCard
                    icon={() => <span className="text-lg">👥</span>}
                    label="Developer (at a company)"
                    selected={step1.role === "developer"}
                    onClick={() => setStep1((prev) => ({ ...prev, role: "developer" }))}
                  />
                  <RoleCard
                    icon={() => <span className="text-lg">❓</span>}
                    label="Other"
                    selected={step1.role === "other"}
                    onClick={() => setStep1((prev) => ({ ...prev, role: "other" }))}
                  />
                </div>
              </div>

              {/* Team size field */}
              <div>
                <label className="mb-4 block text-sm font-semibold text-[var(--neutral-12)]">
                  How big is your team?
                </label>
                <div className="space-y-3">
                  {["1", "2-5", "6-20", "21-50", "50+"].map((size) => (
                    <label key={size} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="teamSize"
                        value={size}
                        checked={step1.teamSize === (size as any)}
                        onChange={() => setStep1((prev) => ({ ...prev, teamSize: size as any }))}
                        className="h-4 w-4"
                      />
                      <span className="text-[var(--neutral-12)]">
                        {size === "1"
                          ? "Just me (1)"
                          : size === "50+"
                            ? "50+ people"
                            : `${size} people`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep1Valid}
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-opacity ${
                    isStep1Valid ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                  style={{ background: isStep1Valid ? "var(--brand-gradient)" : undefined }}
                >
                  Next
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
                <h1 className="mb-2 text-3xl font-bold text-[var(--neutral-12)]">
                  What are you building?
                </h1>
                <p className="text-[var(--neutral-11)]">Tell us about your project and industry.</p>
              </div>

              {/* Use case field */}
              <div>
                <label className="mb-4 block text-sm font-semibold text-[var(--neutral-12)]">
                  What's your primary use case?
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <UseCaseCard
                    label="SaaS Product"
                    description="Web or mobile software as a service"
                    selected={step2.useCase === "saas"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "saas" }))}
                  />
                  <UseCaseCard
                    label="AI Tool / Copilot"
                    description="AI-powered application or assistant"
                    selected={step2.useCase === "ai_tool"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "ai_tool" }))}
                  />
                  <UseCaseCard
                    label="Marketplace"
                    description="Multi-vendor or peer-to-peer platform"
                    selected={step2.useCase === "marketplace"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "marketplace" }))}
                  />
                  <UseCaseCard
                    label="Internal Tool"
                    description="Application for internal use only"
                    selected={step2.useCase === "internal_tool"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "internal_tool" }))}
                  />
                  <UseCaseCard
                    label="Agency Project"
                    description="Freelance or agency deliverable"
                    selected={step2.useCase === "agency"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "agency" }))}
                  />
                  <UseCaseCard
                    label="Other"
                    description="Something else"
                    selected={step2.useCase === "other"}
                    onClick={() => setStep2((prev) => ({ ...prev, useCase: "other" }))}
                  />
                </div>
              </div>

              {/* Building what field */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--neutral-12)]">
                  Describe what you're building (optional)
                </label>
                <textarea
                  value={step2.buildingWhat}
                  onChange={(e) =>
                    setStep2((prev) => ({
                      ...prev,
                      buildingWhat: e.target.value.slice(0, 500),
                    }))
                  }
                  placeholder="e.g. A financial management platform for freelancers..."
                  className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-3 text-[var(--neutral-12)] placeholder-[var(--neutral-11)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 focus:ring-offset-[var(--neutral-1)]"
                  rows={4}
                />
                <p className="mt-1 text-xs text-[var(--neutral-11)]">
                  {step2.buildingWhat.length}/500 characters
                </p>
              </div>

              {/* Industry field */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--neutral-12)]">
                  Industry (optional)
                </label>
                <input
                  type="text"
                  value={step2.industry}
                  onChange={(e) => setStep2((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g. Fintech, Healthcare, Dev Tools..."
                  className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-3 text-[var(--neutral-12)] placeholder-[var(--neutral-11)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 focus:ring-offset-[var(--neutral-1)]"
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 rounded-lg border border-[var(--neutral-7)] px-6 py-3 font-semibold text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-opacity ${
                    isStep2Valid ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                  style={{ background: isStep2Valid ? "var(--brand-gradient)" : undefined }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Step 3: License selection */}
        {currentStep === 3 && (
          <AnimateIn preset="fadeUp">
            <div className="space-y-8">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-[var(--neutral-12)]">
                  Choose your license
                </h1>
                <p className="text-[var(--neutral-11)]">
                  Based on your team size, we recommend the license below.
                </p>
              </div>

              {/* License tier selection */}
              <div>
                {step1.teamSize === "1" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-4">
                      <p className="text-sm text-[var(--neutral-11)]">
                        If you're a registered one-person company or OPC, you can select either
                        Individual or OPC license below.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <LicenseTierCard
                        title="Individual Free License"
                        description="Perfect for solopreneurs and hobbyists"
                        features={[
                          "Free forever (no expiration)",
                          "Full framework access",
                          "Community support",
                          "License key for personal use",
                        ]}
                        highlighted={true}
                        selected={step3.tier === "INDIVIDUAL"}
                        onClick={() => setStep3((prev) => ({ ...prev, tier: "INDIVIDUAL" }))}
                      />
                      <LicenseTierCard
                        title="OPC Free License"
                        description="For one-person companies"
                        features={[
                          "Free forever (no expiration)",
                          "Full framework access",
                          "Community support",
                          "License key for your company",
                        ]}
                        highlighted={false}
                        selected={step3.tier === "OPC"}
                        onClick={() => setStep3((prev) => ({ ...prev, tier: "OPC" }))}
                      />
                    </div>
                  </div>
                )}

                {(step1.teamSize === "2-5" ||
                  step1.teamSize === "6-20" ||
                  step1.teamSize === "21-50") && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-[var(--status-warning)] bg-yellow-50 p-4">
                      <p className="text-sm text-[var(--neutral-12)] font-medium">
                        Your team is too large for a free license. Let's find the right commercial
                        plan.
                      </p>
                    </div>
                    <LicenseTierCard
                      title="Startup Commercial License"
                      price="$799/year"
                      description="For teams of 2–50 people"
                      features={[
                        "Includes 1 year of updates",
                        "Community support",
                        "Commercial usage rights",
                        "License key for your team",
                      ]}
                      highlighted={true}
                      selected={step3.tier === "STARTUP"}
                      onClick={() => setStep3((prev) => ({ ...prev, tier: "STARTUP" }))}
                    />
                  </div>
                )}

                {step1.teamSize === "50+" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-[var(--status-info)] bg-blue-50 p-4">
                      <p className="text-sm text-[var(--neutral-12)] font-medium">
                        For enterprises with 50+ people, let's connect with our sales team to find
                        the perfect fit.
                      </p>
                    </div>
                    <LicenseTierCard
                      title="Enterprise License"
                      description="Custom pricing and support"
                      features={[
                        "Unlimited team members",
                        "Dedicated support",
                        "Custom SLAs",
                        "Volume pricing available",
                      ]}
                      highlighted={true}
                      selected={step3.tier === "ENTERPRISE"}
                      onClick={() => setStep3((prev) => ({ ...prev, tier: "ENTERPRISE" }))}
                      cta="Contact enterprise@nebutra.dev"
                    />
                  </div>
                )}
              </div>

              {/* Contact fields */}
              {step3.tier !== "ENTERPRISE" && (
                <div className="space-y-4">
                  {/* Looking for — seeds Sleptons matching */}
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[var(--neutral-12)]">
                      What do you need most right now? (optional)
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
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-sm text-[var(--neutral-12)]">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--neutral-12)]">
                      GitHub username (optional)
                    </label>
                    <input
                      type="text"
                      value={step3.githubHandle}
                      onChange={(e) =>
                        setStep3((prev) => ({ ...prev, githubHandle: e.target.value }))
                      }
                      placeholder="your-github-username"
                      className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-3 text-[var(--neutral-12)] placeholder-[var(--neutral-11)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 focus:ring-offset-[var(--neutral-1)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--neutral-12)]">
                      Twitter/X handle (optional)
                    </label>
                    <input
                      type="text"
                      value={step3.twitterHandle}
                      onChange={(e) =>
                        setStep3((prev) => ({ ...prev, twitterHandle: e.target.value }))
                      }
                      placeholder="your-twitter-handle"
                      className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-3 text-[var(--neutral-12)] placeholder-[var(--neutral-11)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 focus:ring-offset-[var(--neutral-1)]"
                    />
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-semibold text-[var(--neutral-12)]">
                      How did you hear about us? *
                    </label>
                    <select
                      value={step3.referralSource || ""}
                      onChange={(e) =>
                        setStep3((prev) => ({ ...prev, referralSource: e.target.value as any }))
                      }
                      className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-3 text-[var(--neutral-12)] focus:border-[var(--blue-9)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2 focus:ring-offset-[var(--neutral-1)]"
                    >
                      <option value="">Select an option...</option>
                      <option value="twitter">Twitter/X</option>
                      <option value="github">GitHub</option>
                      <option value="product_hunt">Product Hunt</option>
                      <option value="friend">A Friend</option>
                      <option value="search">Search</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="flex gap-3 rounded-lg border border-[var(--status-danger)] bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-[var(--status-danger)]" />
                  <p className="text-sm text-[var(--status-danger)]">{submitError}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 rounded-lg border border-[var(--neutral-7)] px-6 py-3 font-semibold text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep3Valid || isSubmitting}
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-opacity ${
                    isStep3Valid && !isSubmitting
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  style={{
                    background: isStep3Valid && !isSubmitting ? "var(--brand-gradient)" : undefined,
                  }}
                >
                  {isSubmitting ? "Creating..." : "Get License"}
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
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--blue-3)]">
                <CheckCircle2 className="h-12 w-12 text-[var(--blue-9)]" />
              </div>

              <div>
                <h1 className="mb-3 text-3xl font-bold text-[var(--neutral-12)]">
                  Welcome to Sleptons!
                </h1>
                <p className="text-lg text-[var(--neutral-11)]">
                  {step3.tier === "INDIVIDUAL" || step3.tier === "OPC"
                    ? "Your free license is active. Your Sleptons profile is live."
                    : "Your commercial license is ready. Let's build something remarkable."}
                </p>
                <p className="mt-2 text-sm text-[var(--neutral-11)]">
                  Redirecting you to Sleptons community…
                </p>
              </div>

              {/* License key */}
              <div className="w-full max-w-md">
                <p className="mb-3 text-sm font-semibold text-[var(--neutral-12)]">
                  Your License Key
                </p>
                <div className="relative flex items-center rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-2)] px-4 py-3">
                  <code className="flex-1 font-mono text-sm text-[var(--neutral-12)]">
                    {step4.licenseKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(step4.licenseKey);
                    }}
                    className="ml-2 text-xs font-medium text-[var(--blue-9)] hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex w-full max-w-md flex-col gap-3">
                <a
                  href={`${process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3002"}?welcome=true`}
                  className="rounded-lg px-6 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Explore Sleptons Community →
                </a>
                <a
                  href="https://app.nebutra.com/dashboard"
                  className="rounded-lg border border-[var(--neutral-7)] px-6 py-3 text-center font-semibold text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                >
                  Go to Console
                </a>
              </div>
            </div>
          </AnimateIn>
        )}
      </AnimateIn>
    </section>
  );
}
