// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type ButtonHTMLAttributes,
  cloneElement,
  createContext,
  type InputHTMLAttributes,
  isValidElement,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
} from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("invite=neb_prefilled&tenantId=tenant_1"),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    htmlType,
    type: _type,
    ...props
  }: {
    children?: ReactNode;
    htmlType?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
    type?: string;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) => (
    <button type={htmlType ?? "button"} {...props}>
      {children}
    </button>
  ),
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

// Lightweight passthrough doubles for the react-hook-form primitives. We must
// NOT spread importActual("@nebutra/ui/primitives") — that eagerly loads the
// heavy real barrel (THREE.js / Lobe UI) and hangs the jsdom run. These doubles
// faithfully reproduce the two behaviours the component relies on:
//   1. FormField binds to RHF via Controller so typed values flow into submit.
//   2. FormLabel/FormControl share an id so getByLabelText() resolves the input.
const FormItemIdContext = createContext<string>("");

vi.mock("@nebutra/ui/primitives", () => ({
  Form: FormProvider,
  FormField: ({
    name,
    render,
  }: {
    control?: unknown;
    name: string;
    render: (args: {
      field: { name: string; value: unknown; onChange: (...a: unknown[]) => void; ref: unknown };
    }) => ReactElement;
  }) => {
    const { control } = useFormContext();
    return <Controller control={control} name={name} render={({ field }) => render({ field })} />;
  },
  FormItem: ({ children }: { children: ReactNode }) => {
    const id = useId();
    return <FormItemIdContext.Provider value={id}>{children}</FormItemIdContext.Provider>;
  },
  FormControl: ({ children }: { children: ReactNode }) => {
    const id = useContext(FormItemIdContext);
    if (isValidElement(children)) {
      return cloneElement(children as ReactElement<{ id?: string }>, { id });
    }
    return <>{children}</>;
  },
  FormLabel: ({ children }: { children: ReactNode }) => {
    const id = useContext(FormItemIdContext);
    return <label htmlFor={id}>{children}</label>;
  },
  // biome-ignore lint/a11y/noLabelWithoutControl: this test double forwards htmlFor from the component under test.
  Label: (props: LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />,
  Separator: () => <hr />,
}));

vi.mock("../oauth-buttons", () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons" />,
}));

describe("SignUpForm access gate", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubEnv("NEXT_PUBLIC_ACCESS_GATE_MODE", "invite");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requires and submits an invite code when invite mode is enabled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { SignUpForm } = await import("../sign-up-form");

    render(<SignUpForm />);

    expect(screen.getByLabelText("Invite code")).toBeRequired();
    expect(screen.getByLabelText("Invite code")).toHaveValue("neb_prefilled");
    expect(screen.queryByTestId("oauth-buttons")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.type(screen.getByLabelText("Last name"), "Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-up/email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "correct horse battery staple",
          accessInviteCode: "neb_prefilled",
          tenantId: "tenant_1",
        }),
      }),
    );
    expect(pushMock).toHaveBeenCalledWith("/onboarding");
  });
});
