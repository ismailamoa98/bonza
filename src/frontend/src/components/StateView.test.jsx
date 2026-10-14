// StateView.test.jsx — Phase 24 §24e. One component for empty/error/degraded/offline. Verifies the content,
// actions and the degraded partial-results behaviour (not styling).
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StateView, { COPY } from "./StateView.jsx";

// Mock react-router's Link to a plain anchor — a real Router's UMD build pulls a second React copy in jsdom.
vi.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
}));

const wrap = (ui) => render(ui);

describe("StateView", () => {
  it("renders title + body and runs a primary action", () => {
    const onClick = vi.fn();
    wrap(<StateView variant="empty" title="Nothing here" body="Add something" primaryAction={{ label: "Add", onClick }} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add something")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders a secondary link action", () => {
    wrap(<StateView variant="error" title="Oops" secondaryAction={{ label: "Get help", to: "/help" }} />);
    expect(screen.getByRole("link", { name: "Get help" })).toHaveAttribute("href", "/help");
  });

  it("marks the error variant as an alert", () => {
    wrap(<StateView variant="error" title="Broken" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows partial results below the message for the degraded variant", () => {
    wrap(
      <StateView variant="degraded" title="Award space last checked 2h ago">
        <div>cash results</div>
      </StateView>
    );
    expect(screen.getByText("cash results")).toBeInTheDocument();
  });

  it("ships written empty-state copy", () => {
    expect(COPY.bookings_empty.title).toMatch(/no bookings/i);
    expect(COPY.points_no_programmes.body).toMatch(/points and cash/i);
  });
});
