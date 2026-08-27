import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberCard } from "@/components/MemberCard";

const mockMember = {
  id: "m1",
  member_number: 42,
  slug: "alice-42",
  display_name: "Alice",
  bio: "Building fintech",
  avatar_url: null,
  product_name: "FinFlow",
  product_tagline: "Finance for freelancers",
  tech_stack: ["Next.js"],
  looking_for: ["early-users"],
  tier: "V1" as const,
  is_public: true,
  github_handle: "alice",
  created_at: new Date(),
  products: [],
};

describe("MemberCard", () => {
  it("renders member name and product tagline", () => {
    render(<MemberCard member={mockMember} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Finance for freelancers")).toBeInTheDocument();
  });

  it("shows member number", () => {
    render(<MemberCard member={mockMember} />);
    expect(screen.getByText(/#42/)).toBeInTheDocument();
  });

  it("renders looking_for tags", () => {
    render(<MemberCard member={mockMember} />);
    expect(screen.getByText(/early-users/i)).toBeInTheDocument();
  });
});
