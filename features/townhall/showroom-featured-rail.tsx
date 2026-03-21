"use client";

import { formatUsd } from "@/features/shared/format";
import type { Drop } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedReason = "studio_pin" | "market_signal" | "recent_release" | "sustained_interest";

type ShowroomFeaturedEntry = {
  drop: Drop;
  rank: number;
  reasons: FeaturedReason[];
  telemetry: {
    collectIntents: number;
    completions: number;
    watchTimeSeconds: number;
  };
  collect: {
    lane: string;
    listingType: string;
    latestOfferState: string;
    offerCount: number;
  } | null;
};

type ShowroomFeaturedLane = {
  laneKey: "featured";
  generatedAt: string;
  limit: number;
  entries: ShowroomFeaturedEntry[];
};

type ShowroomFeaturedRailProps = {
  initialEntries?: ShowroomFeaturedEntry[];
};

function formatReasonLabel(reason: FeaturedReason): string {
  if (reason === "studio_pin") return "studio pick";
  if (reason === "market_signal") return "trending";
  if (reason === "recent_release") return "new";
  return "enduring";
}

export function ShowroomFeaturedRail({ initialEntries }: ShowroomFeaturedRailProps) {
  const [entries, setEntries] = useState<ShowroomFeaturedEntry[]>(initialEntries ?? []);
  const [isLoading, setIsLoading] = useState(!initialEntries);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialEntries && initialEntries.length > 0) return;

    let cancelled = false;
    setIsLoading(true);
    fetch("/api/v1/showroom/featured?limit=12")
      .then((res) => res.json())
      .then((data: { featured: ShowroomFeaturedLane }) => {
        if (!cancelled) {
          setEntries(data.featured?.entries ?? []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("could not load featured drops");
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [initialEntries]);

  if (isLoading) {
    return (
      <div className="showroom-featured-rail showroom-featured-rail-loading" aria-label="loading featured drops">
        <p>loading featured...</p>
      </div>
    );
  }

  if (error || entries.length === 0) {
    return null;
  }

  return (
    <section
      className="showroom-featured-rail"
      aria-label="featured campaign drops"
      data-testid="showroom-featured-rail"
    >
      <div className="showroom-featured-rail-header">
        <h2 className="showroom-featured-rail-title">featured</h2>
        <Link href={routes.showroomFeatured()} className="showroom-featured-rail-see-all">
          see all
        </Link>
      </div>
      <div className="showroom-featured-rail-scroll" role="list">
        {entries.map((entry) => (
          <Link
            key={entry.drop.id}
            href={routes.drop(entry.drop.id)}
            className="showroom-featured-card"
            role="listitem"
            data-testid={`showroom-featured-card-${entry.drop.id}`}
          >
            {entry.drop.previewMedia?.watch?.posterSrc ? (
              <img
                className="showroom-featured-card-poster"
                src={entry.drop.previewMedia.watch.posterSrc}
                alt={entry.drop.title}
                loading="lazy"
              />
            ) : (
              <div className="showroom-featured-card-poster showroom-featured-card-poster-placeholder">
                <span>{entry.drop.title.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="showroom-featured-card-info">
              <p className="showroom-featured-card-rank">#{entry.rank}</p>
              <p className="showroom-featured-card-title">{entry.drop.title}</p>
              <p className="showroom-featured-card-meta">
                @{entry.drop.studioHandle} · {formatUsd(entry.drop.priceUsd)}
              </p>
              <div className="showroom-featured-card-reasons">
                {entry.reasons.map((reason) => (
                  <span key={reason} className={`showroom-featured-reason showroom-featured-reason-${reason}`}>
                    {formatReasonLabel(reason)}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
