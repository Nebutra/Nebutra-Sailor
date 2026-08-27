/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

const messages: Record<string, string> = {
  "footer.newsletterPlaceholder": "you@example.com",
  "footer.newsletterSubscribe": "Subscribe",
  "footer.newsletterSuccess": "Thanks for subscribing!",
  "footer.newsletterError": "Something went wrong",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { NewsletterForm } from "../NewsletterForm";

describe("NewsletterForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not call the API for empty submissions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterForm />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "you@example.com" })).toBeInTheDocument();
  });

  it("shows a success state after the API accepts a subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterForm />);
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "you@example.com" }), {
        target: { value: "test@example.com" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/newsletter",
        expect.objectContaining({
          body: JSON.stringify({ email: "test@example.com" }),
          method: "POST",
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks for subscribing!");
  });

  it("shows an accessible error state after the API rejects a subscription", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    render(<NewsletterForm />);
    act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: "you@example.com" }), {
        target: { value: "test@example.com" },
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("fills a narrow sidebar instead of locking a 20rem row that overflows the card", () => {
    render(<NewsletterForm />);

    const form = screen.getByTestId("newsletter-form");
    expect(form.className.split(" ")).toEqual(
      expect.arrayContaining(["w-full", "min-w-0", "max-w-[20rem]"]),
    );
    expect(form.className).not.toMatch(/sm:w-auto/);

    const fieldGroup = form.querySelector("div");
    expect(fieldGroup).not.toBeNull();
    expect(fieldGroup?.className.split(" ")).toEqual(expect.arrayContaining(["w-full", "min-w-0"]));
    expect(fieldGroup?.className).not.toMatch(/sm:w-\[20rem\]/);
  });
});
