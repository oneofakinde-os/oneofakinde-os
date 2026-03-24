"use client";

import type { CreateWorldResult } from "@/app/(creator)/create/world/actions";
import { useState, useTransition } from "react";

type CreateWorldStepperProps = {
  createWorldAction: (formData: FormData) => Promise<CreateWorldResult>;
};

const STEPS = ["title", "synopsis", "identity", "rules", "review"] as const;
type Step = (typeof STEPS)[number];

const ENTRY_RULES = [
  { value: "open", label: "open", description: "anyone can browse and collect" },
  { value: "membership", label: "membership", description: "requires an active membership to access" },
  { value: "patron", label: "patron", description: "exclusive to your patrons" }
] as const;

const RELEASE_MODES = [
  { value: "continuous", label: "continuous", description: "drops publish whenever they're ready" },
  { value: "seasons", label: "seasons", description: "organized into distinct seasons" },
  { value: "chapters", label: "chapters", description: "sequential chapters with reading order" }
] as const;

export function CreateWorldStepper({ createWorldAction }: CreateWorldStepperProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [colorPrimary, setColorPrimary] = useState("#0b132b");
  const [entryRule, setEntryRule] = useState("open");
  const [releaseMode, setReleaseMode] = useState("continuous");
  const [lore, setLore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex] ?? "title";

  function canAdvance(): boolean {
    switch (step) {
      case "title":
        return title.trim().length > 0;
      case "synopsis":
        return synopsis.trim().length > 0;
      default:
        return true;
    }
  }

  function next() {
    if (stepIndex < STEPS.length - 1 && canAdvance()) {
      setError(null);
      setStepIndex(stepIndex + 1);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setError(null);
      setStepIndex(stepIndex - 1);
    }
  }

  function handleSubmit() {
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("synopsis", synopsis.trim());
    formData.set("colorPrimary", colorPrimary);
    formData.set("entryRule", entryRule);
    formData.set("releaseMode", releaseMode);
    if (lore.trim()) formData.set("lore", lore.trim());

    startTransition(async () => {
      const result = await createWorldAction(formData);
      if (!result.ok && result.error) {
        setError(result.error);
      }
    });
  }

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="create-stepper">
      {/* progress bar */}
      <div className="create-stepper-progress" aria-label="step progress">
        <div
          className="create-stepper-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="slice-meta" style={{ textAlign: "center", marginBottom: "1rem" }}>
        step {stepIndex + 1} of {STEPS.length} — {step}
      </p>

      {error ? (
        <div className="slice-toast slice-toast-error" role="alert">
          {error}
        </div>
      ) : null}

      {/* step: title */}
      {step === "title" ? (
        <section className="create-stepper-step" aria-label="world title">
          <h2 className="slice-title">name your world</h2>
          <p className="slice-copy">
            a world is a thematic home for your drops. give it a name that
            captures its essence.
          </p>
          <input
            className="identity-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="dark matter"
            maxLength={200}
            autoFocus
          />
        </section>
      ) : null}

      {/* step: synopsis */}
      {step === "synopsis" ? (
        <section className="create-stepper-step" aria-label="world synopsis">
          <h2 className="slice-title">describe your world</h2>
          <p className="slice-copy">
            what&apos;s the vision? this appears on the world detail page and
            helps collectors understand the theme.
          </p>
          <textarea
            className="identity-input identity-textarea"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="cinematic drops exploring identity and memory."
            maxLength={2000}
            rows={4}
            autoFocus
          />
          <p className="slice-meta" style={{ textAlign: "right" }}>
            {synopsis.length}/2000
          </p>

          <label className="identity-field" style={{ marginTop: "1rem" }}>
            <span className="slice-meta">lore (optional)</span>
            <textarea
              className="identity-input identity-textarea"
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              placeholder="deeper backstory or world-building notes..."
              maxLength={2000}
              rows={3}
            />
          </label>
        </section>
      ) : null}

      {/* step: visual identity */}
      {step === "identity" ? (
        <section className="create-stepper-step" aria-label="visual identity">
          <h2 className="slice-title">visual identity</h2>
          <p className="slice-copy">
            choose a primary color for your world. you can add cover art later
            from the workshop.
          </p>
          <div className="create-stepper-color-row">
            <label className="identity-field">
              <span className="slice-meta">primary color</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  style={{ width: 48, height: 48, border: "none", cursor: "pointer" }}
                />
                <input
                  className="identity-input"
                  type="text"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  placeholder="#0b132b"
                  style={{ flex: 1 }}
                />
              </div>
            </label>
          </div>
          <div
            className="create-stepper-color-preview"
            style={{ background: colorPrimary }}
          >
            <span className="create-stepper-color-preview-title">
              {title || "your world"}
            </span>
          </div>
        </section>
      ) : null}

      {/* step: rules */}
      {step === "rules" ? (
        <section className="create-stepper-step" aria-label="world rules">
          <h2 className="slice-title">access and structure</h2>

          <div style={{ marginBottom: "1.5rem" }}>
            <p className="slice-copy" style={{ marginBottom: "0.5rem" }}>
              who can access this world?
            </p>
            <div className="create-stepper-option-grid">
              {ENTRY_RULES.map((rule) => (
                <button
                  key={rule.value}
                  type="button"
                  className={`create-stepper-option-card${entryRule === rule.value ? " selected" : ""}`}
                  onClick={() => setEntryRule(rule.value)}
                >
                  <span className="create-stepper-option-label">{rule.label}</span>
                  <span className="slice-meta">{rule.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="slice-copy" style={{ marginBottom: "0.5rem" }}>
              how are drops released?
            </p>
            <div className="create-stepper-option-grid">
              {RELEASE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`create-stepper-option-card${releaseMode === mode.value ? " selected" : ""}`}
                  onClick={() => setReleaseMode(mode.value)}
                >
                  <span className="create-stepper-option-label">{mode.label}</span>
                  <span className="slice-meta">{mode.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* step: review */}
      {step === "review" ? (
        <section className="create-stepper-step" aria-label="review and create">
          <h2 className="slice-title">review your world</h2>
          <p className="slice-copy">
            ready to bring this world to life?
          </p>
          <div className="create-stepper-review">
            <div className="create-stepper-review-row">
              <span className="slice-meta">title</span>
              <span className="slice-copy">{title}</span>
            </div>
            <div className="create-stepper-review-row">
              <span className="slice-meta">synopsis</span>
              <span className="slice-copy">{synopsis}</span>
            </div>
            {lore ? (
              <div className="create-stepper-review-row">
                <span className="slice-meta">lore</span>
                <span className="slice-copy">{lore}</span>
              </div>
            ) : null}
            <div className="create-stepper-review-row">
              <span className="slice-meta">color</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: colorPrimary
                  }}
                />
                <span className="slice-copy">{colorPrimary}</span>
              </span>
            </div>
            <div className="create-stepper-review-row">
              <span className="slice-meta">access</span>
              <span className="slice-copy">{entryRule}</span>
            </div>
            <div className="create-stepper-review-row">
              <span className="slice-meta">release structure</span>
              <span className="slice-copy">{releaseMode}</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* navigation */}
      <div className="create-stepper-nav">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="slice-button ghost"
            onClick={back}
            disabled={pending}
          >
            back
          </button>
        ) : (
          <span />
        )}

        {step === "review" ? (
          <button
            type="button"
            className="slice-button"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? "creating..." : "create world"}
          </button>
        ) : (
          <button
            type="button"
            className="slice-button"
            onClick={next}
            disabled={!canAdvance()}
          >
            next
          </button>
        )}
      </div>
    </div>
  );
}
