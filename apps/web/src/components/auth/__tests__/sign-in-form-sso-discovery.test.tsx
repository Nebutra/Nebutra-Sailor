// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  cloneElement,
  createContext,
  type InputHTMLAttributes,
  isValidElement,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldValues,
  FormProvider,
  type UseFormReturn,
} from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

const messages: Record<string, string> = {
  "auth.signIn.title": "Log in to Nebutra",
  "auth.signIn.subtitle": "Choose how you want to sign in.",
  "auth.signIn.dividerOr": "Or continue with email",
  "auth.signIn.emailLabel": "Email",
  "auth.signIn.emailPlaceholder": "you@example.com",
  "auth.signIn.passwordLabel": "Password",
  "auth.signIn.passwordPlaceholder": "Enter your password",
  "auth.signIn.forgotPassword": "Forgot password?",
  "auth.signIn.showPassword": "Show password",
  "auth.signIn.hidePassword": "Hide password",
  "auth.signIn.submit": "Log in",
  "auth.signIn.submitLoading": "Signing in…",
  "auth.signIn.continueWithProvider": "Continue with {provider}",
  "auth.signIn.newToProduct": "New to Nebutra?",
  "auth.signIn.signUpLink": "Sign up",
  "auth.signIn.signInFailed": "Sign in failed",
  "auth.signIn.genericError": "An error occurred. Please try again.",
  "auth.signIn.captchaError": "Bot verification failed. Refresh the page and try again.",
  "auth.signIn.passkeyUnsupported": "This browser does not support passkeys.",
  "auth.signIn.passkeyError": "Passkey sign-in failed. Try another method.",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const template = messages[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
  },
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: () => null,
}));

vi.mock("@nebutra/icons", () => ({
  Warning: () => <span aria-hidden />,
  Eye: () => <span aria-hidden />,
  EyeOff: () => <span aria-hidden />,
  Key: () => <span aria-hidden />,
  Envelope: () => <span aria-hidden />,
}));

vi.mock("@nebutra/ui/primitives", () => {
  const FieldNameContext = createContext<string>("field");
  return {
    Button: ({
      children,
      type,
      variant: _variant,
      ...props
    }: {
      children?: ReactNode;
      type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
      variant?: string;
    } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
      <button type={type ?? "button"} {...props}>
        {children}
      </button>
    ),
    Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    // biome-ignore lint/a11y/noLabelWithoutControl: test double forwards htmlFor from the component.
    Label: (props: LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />,
    Separator: () => <hr />,
    Form: ({ children, ...form }: UseFormReturn<FieldValues> & { children?: ReactNode }) => (
      <FormProvider {...form}>{children}</FormProvider>
    ),
    FormField: ({
      control,
      name,
      render,
    }: {
      control: Control<FieldValues>;
      name: string;
      render: (renderProps: { field: ControllerRenderProps<FieldValues, string> }) => ReactElement;
    }) => (
      <FieldNameContext.Provider value={name}>
        <Controller control={control} name={name} render={render} />
      </FieldNameContext.Provider>
    ),
    FormItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    FormControl: ({ children }: { children?: ReactNode }) => {
      const name = useContext(FieldNameContext);
      if (isValidElement(children)) {
        return cloneElement(children as ReactElement<{ id?: string }>, { id: name });
      }
      return <>{children}</>;
    },
    FormLabel: ({ children }: { children?: ReactNode }) => {
      const name = useContext(FieldNameContext);
      return <label htmlFor={name}>{children}</label>;
    },
    FormMessage: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  };
});

vi.mock("@/lib/auth/passkey-client", () => ({
  enablePasskeyConditionalUI: vi.fn(),
  isPasskeySupported: () => false,
  signInWithPasskey: vi.fn(),
}));

vi.mock("../oauth-buttons", () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons" />,
}));

import { SignInForm } from "../sign-in-form";

describe("SignInForm SSO discovery", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("hides OAuth entrypoints while invite-only access is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ACCESS_GATE_MODE", "invite");

    render(<SignInForm enabledOAuthProviders={["google"]} />);

    expect(screen.queryByTestId("oauth-buttons")).not.toBeInTheDocument();
  });

  it("surfaces the enterprise SSO handoff after email domain discovery", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: {
            domain: "acme.com",
            id: "acme-okta",
            name: "Acme Okta",
            type: "saml",
            loginUrl: "/api/auth/sso/acme-okta?returnUrl=%2Fdashboard",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SignInForm returnUrl="/dashboard" />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "owner@acme.com");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/sso/discovery?email=owner%40acme.com&returnUrl=%2Fdashboard",
        { credentials: "include" },
      );
    });
    expect(
      await screen.findByRole("button", { name: "Continue with Acme Okta" }),
    ).toBeInTheDocument();
  });

  it("keeps password sign-in available when SSO discovery returns null", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ provider: null }), { status: 200 })),
    );

    render(<SignInForm />);

    const emailInput = screen.getByLabelText("Email");
    await user.type(emailInput, "user@example.com");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Continue with/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });
});
