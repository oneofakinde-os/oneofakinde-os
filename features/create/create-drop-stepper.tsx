"use client";

import type { CreateDropResult } from "@/app/(creator)/create/drop/actions";
import type { World } from "@/lib/domain/contracts";
import { useState, useTransition } from "react";

type CreateDropStepperProps = {
  worlds: World[];
  createDropAction: (formData: FormData) => Promise<CreateDropResult>;
};

const STEPS = ["title", "world", "synopsis", "pricing", "review"] as const;
type Step = (typeof STEPS)[number];

export function CreateDropStepper({
  worlds,
  createDropAction
}: CreateDropStepperProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [worldId, setWorldId] = useState(worlds[0]?.id ?? "");
  const [synopsis, setSynopsis] = useState("");
  const [priceUsd, setPriceUsd] = useState("1.99");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [episodeLabel, setEpisodeLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex] ?? "title";

  function canAdvance(): boolean {
    switch (step) {
      case "title":
        return title.trim().length > 0;
      case "world":
        return worldId.length > 0;
      case "synopsis":
        return synopsis.trim().length > 0;
      case "pricing":
        return Number.isFinite(Number.parseFloat(priceUsd)) && Number.parseFloat(priceUsd) >= 0;
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
    formData.set("worldId", worldId);
    formData.set("synopsis", synopsis.trim());
    formData.set("priceUsd", priceUsd);
    if (seasonLabel.trim()) formData.set("seasonLabel", seasonLabel.trim());
    if (episodeLabel.trim()) formData.set("episodeLabel", episodeLabel.trim());

    startTransition(async () => {
      const result = await createDropAction(formData);
      if (!result.ok && result.error) {
        setError(result.error);
      }
    });
  }

  const selectedWorld = worlds.find((w) => w.id === worldId);
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
        <section className="create-stepper-step" aria-label="drop title">
          <h2 className="slice-title">what&apos;s this drop called?</h2>
          <p className="slice-copy">
            the title is the first thing collectors see. make it count.
          </p>
          <input
            className="identity-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="drop title"
            maxLength={200}
            autoFocus
          />
          <div className="create-stepper-optional">
            <label className="identity-field">
              <span className="slice-meta">season label (optional)</span>
              <input
                className="identity-input"
                type="text"
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                placeholder="season one"
              />
            </label>
            <label className="identity-field">
              <span className="slice-meta">episode label (optional)</span>
              <input
                className="identity-input"
                type="text"
                value={episodeLabel}
                onChange={(e) => setEpisodeLabel(e.target.value)}
                placeholder="episode one"
              />
            </label>
          </div>
        </section>
      ) : null}

      {/* step: world */}
      {step === "world" ? (
        <section className="create-stepper-step" aria-label="select world">
          <h2 className="slice-title">which world does this drop belong to?</h2>
          <p className="slice-copy">
            drops live inside worlds — thematic collections that give your work context.
          </p>
          <div className="create-stepper-world-grid">
            {worlds.map((world) => (
              <button
                key={world.id}
                type="button"
                className={`create-stepper-world-card${worldId === world.id ? " selected" : ""}`}
                onClick={() => setWorldId(world.id)}
                style={{
                  borderColor: worldId === world.id
                    ? world.visualIdentity?.colorPrimary ?? "var(--accent)"
                    : undefined
                }}
              >
                <span className="create-stepper-world-title">{world.title}</span>
                <span className="slice-meta">{world.synopsis}</span>
              </button>
            ))}
          </div>
          <p className="slice-meta" style={{ marginTop: "0.5rem" }}>
            need a new world?{" "}
            <a href="/create/world" className="slice-link">
              create one first
            </a>
          </p>
        </section>
      ) : null}

      {/* step: synopsis */}
      {step === "synopsis" ? (
        <section className="create-stepper-step" aria-label="drop synopsis">
          <h2 className="slice-title">describe your drop</h2>
          <p className="slice-copy">
            write a compelling synopsis. this appears on the drop detail page
            and in search results.
          </p>
          <textarea
            className="identity-input identity-textarea"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="through the dark, stardust traces identity in motion..."
            maxLength={2000}
            rows={5}
            autoFocus
          />
          <p className="slice-meta" style={{ textAlign: "right" }}>
            {synopsis.length}/2000
          </p>
        </section>
      ) : null}

      {/* step: pricing */}
      {step === "pricing" ? (
        <section className="create-stepper-step" aria-label="pricing">
          <h2 className="slice-title">set your price</h2>
          <p className="slice-copy">
            how much should collectors pay to own this drop? set $0 for a free drop.
          </p>
          <div className="create-stepper-price-row">
            <span className="create-stepper-price-currency">$</span>
            <input
              className="identity-input"
              type="number"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              min="0"
              step="0.01"
              placeholder="1.99"
              autoFocus
            />
            <span className="slice-meta">USD</span>
          </div>
        </section>
      ) : null}

      {/* step: review */}
      {step === "review" ? (
        <section className="create-stepper-step" aria-label="review and publish">
          <h2 className="slice-title">review your drop</h2>
          <p className="slice-copy">
            everything look good? hit publish to make it live.
          </p>
          <div className="create-stepper-review">
            <div className="create-stepper-review-row">
              <span className="slice-meta">title</span>
              <span className="slice-copy">{title}</span>
            </div>
            <div className="create-stepper-review-row">
              <span className="slice-meta">world</span>
              <span className="slice-copy">{selectedWorld?.title ?? worldId}</span>
            </div>
            {seasonLabel ? (
              <div className="create-stepper-review-row">
                <span className="slice-meta">season</span>
                <span className="slice-copy">{seasonLabel}</span>
              </div>
            ) : null}
            {episodeLabel ? (
              <div className="create-stepper-review-row">
                <span className="slice-meta">episode</span>
                <span className="slice-copy">{episodeLabel}</span>
              </div>
            ) : null}
            <div className="create-stepper-review-row">
              <span className="slice-meta">synopsis</span>
              <span className="slice-copy">{synopsis}</span>
            </div>
            <div className="create-stepper-review-row">
              <span className="slice-meta">price</span>
              <span className="slice-copy">${Number.parseFloat(priceUsd).toFixed(2)}</span>
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
            {pending ? "publishing..." : "publish drop"}
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
