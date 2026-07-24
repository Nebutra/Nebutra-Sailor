/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, type ButtonHTMLAttributes, type InputHTMLAttributes, type SVGProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferWaitlistForm, type ReferWaitlistFormCopy } from "../refer-waitlist-form";

expect.extend(matchers);

vi.mock("@nebutra/ui/primitives", () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@nebutra/icons", () => ({
  ArrowRight: (props: SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />,
  Check: (props: SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />,
  Copy: (props: SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />,
  Share: (props: SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...props} />,
}));

const copy: ReferWaitlistFormCopy = {
  emailLabel: "Work email",
  emailPlaceholder: "you@example.com",
  codeLabel: "Referral code",
  codePlaceholder: "Optional code",
  submit: "Join waitlist",
  submitting: "Joining",
  invalidEmail: "Enter a valid email.",
  error: "Could not join right now.",
  successTitle: "You are on the list",
  successDescription: "Your private share link is ready.",
  positionLabel: "Queue position",
  referralCodeLabel: "Your code",
  referralUrlLabel: "Your share link",
  copyLink: "Copy link",
  copied: "Copied",
  share: "Share",
  shareTitle: "Join the founding loop",
  shareText: "Use my invite link to join.",
  directMode: "Direct access mode",
  codeMode: "Referral attributed if the code exists",
};

describe("ReferWaitlistForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits an arbitrary initial referral code to the waitlist API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        entry: {
          email: "founder@example.com",
          position: 42,
          referralCode: "NX7Q2P9A",
          referralUrl: "https://nebutra.com/refer?code=NX7Q2P9A",
          referralCount: 0,
          referredBy: null,
          status: "waiting",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferWaitlistForm copy={copy} initialCode="ABCD2345" />);
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), {
        target: { value: "founder@example.com" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Join waitlist/i }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "founder@example.com",
            code: "ABCD2345",
            landingPage: window.location.href,
          }),
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent("You are on the list");
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("copies the issued referral URL after a successful signup", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          entry: {
            email: "founder@example.com",
            position: 1,
            referralCode: "NX7Q2P9A",
            referralUrl: "https://nebutra.com/refer?code=NX7Q2P9A",
            referralCount: 0,
            referredBy: null,
            status: "waiting",
          },
        }),
      }),
    );

    render(<ReferWaitlistForm copy={copy} initialCode={null} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), {
      target: { value: "founder@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Join waitlist/i }));
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));
    });

    expect(writeText).toHaveBeenCalledWith("https://nebutra.com/refer?code=NX7Q2P9A");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("shows an accessible error state when the API rejects the join", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<ReferWaitlistForm copy={copy} initialCode={null} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), {
      target: { value: "founder@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Join waitlist/i }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not join right now.");
  });
});
