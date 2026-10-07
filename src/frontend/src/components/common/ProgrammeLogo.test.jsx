// ProgrammeLogo.test.jsx — Phase 23. The programme mark: brand logo when a logoUrl loads, else a clean
// initials tile in the brand colour. Real logic worth testing (the fallback path), not styling.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProgrammeLogo from "./ProgrammeLogo.jsx";

describe("ProgrammeLogo", () => {
  it("shows the initials fallback when there is no logoUrl", () => {
    render(<ProgrammeLogo programme={{ initials: "BA", brandColor: "#1d4ed8", displayName: "BA Avios" }} />);
    expect(screen.getByText("BA")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the logo image with an accessible alt when a logoUrl is present", () => {
    render(<ProgrammeLogo programme={{ logoUrl: "https://cdn/x.png", initials: "WH", displayName: "World of Hyatt" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn/x.png");
    expect(img).toHaveAttribute("alt", "World of Hyatt logo");
  });

  it("falls back to initials if the logo image fails to load", () => {
    render(<ProgrammeLogo programme={{ logoUrl: "https://cdn/broken.png", initials: "WH", displayName: "World of Hyatt" }} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("WH")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a '?' when neither logo nor initials are provided", () => {
    render(<ProgrammeLogo programme={{}} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
