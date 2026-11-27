// components/ErrorBoundary.jsx — Phase 24 §24d. Three levels (app / route / section), same reporting:
// Sentry.captureException + EV.ERROR_BOUNDARY_HIT, StateView fallback. Wrap SIBLINGS separately (not their
// shared parent) so a failing hero board never takes down the search panel beside it.
import { Component } from "react";
import * as Sentry from "@sentry/react";
import { track } from "../lib/analytics";
import { EV } from "../lib/analytics/events";
import StateView from "./StateView";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, {
      tags: { boundary: this.props.level, surface: this.props.surface },
      contexts: { react: { componentStack: info?.componentStack } },
    });
    track(EV.ERROR_BOUNDARY_HIT, {
      level: this.props.level || "section",
      surface: this.props.surface || null,
      message: error?.message?.slice(0, 120) || null,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <StateView
        variant="error"
        size={this.props.level === "app" ? "page" : this.props.level === "route" ? "page" : "section"}
        title={this.props.title ?? "This section didn’t load"}
        body={this.props.body ?? "Nothing you did caused this. Try again, and if it keeps happening the support assistant can log it."}
        primaryAction={{ label: "Try again", onClick: this.reset }}
        secondaryAction={{ label: "Get help", to: "/help" }}
      />
    );
  }
}
