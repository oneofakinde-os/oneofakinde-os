"use client";

import { useState } from "react";

export type CurationSortMode = "collected_date" | "title" | "price" | "world";
export type CurationGroupMode = "none" | "world" | "media_type";

type CollectionCurationToolbarProps = {
  onSortChange: (sort: CurationSortMode) => void;
  onGroupChange: (group: CurationGroupMode) => void;
  onShowcaseToggle: (dropId: string) => void;
  showcasedDropIds: Set<string>;
  totalDrops: number;
};

const SORT_OPTIONS: { value: CurationSortMode; label: string }[] = [
  { value: "collected_date", label: "date collected" },
  { value: "title", label: "title a-z" },
  { value: "price", label: "price" },
  { value: "world", label: "world" }
];

const GROUP_OPTIONS: { value: CurationGroupMode; label: string }[] = [
  { value: "none", label: "no grouping" },
  { value: "world", label: "by world" },
  { value: "media_type", label: "by media" }
];

export function CollectionCurationToolbar({
  onSortChange,
  onGroupChange,
  onShowcaseToggle,
  showcasedDropIds,
  totalDrops
}: CollectionCurationToolbarProps) {
  const [activeSort, setActiveSort] = useState<CurationSortMode>("collected_date");
  const [activeGroup, setActiveGroup] = useState<CurationGroupMode>("none");

  return (
    <section className="slice-panel" data-testid="collection-curation-toolbar">
      <p className="slice-label">
        curation · {totalDrops} drops · {showcasedDropIds.size} showcased
      </p>

      <div className="slice-button-row" style={{ flexWrap: "wrap" }}>
        <span className="slice-meta" style={{ marginRight: "0.5rem" }}>sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`slice-button ${activeSort === opt.value ? "" : "ghost"}`}
            onClick={() => {
              setActiveSort(opt.value);
              onSortChange(opt.value);
            }}
            type="button"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="slice-button-row" style={{ flexWrap: "wrap", marginTop: "0.25rem" }}>
        <span className="slice-meta" style={{ marginRight: "0.5rem" }}>group:</span>
        {GROUP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`slice-button ${activeGroup === opt.value ? "" : "ghost"}`}
            onClick={() => {
              setActiveGroup(opt.value);
              onGroupChange(opt.value);
            }}
            type="button"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ShowcaseToggle({
  dropId,
  isShowcased,
  onToggle
}: {
  dropId: string;
  isShowcased: boolean;
  onToggle: (dropId: string) => void;
}) {
  return (
    <button
      className={`slice-button ${isShowcased ? "" : "ghost"}`}
      onClick={() => onToggle(dropId)}
      type="button"
      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
      data-testid="showcase-toggle"
    >
      {isShowcased ? "★ showcased" : "☆ showcase"}
    </button>
  );
}
