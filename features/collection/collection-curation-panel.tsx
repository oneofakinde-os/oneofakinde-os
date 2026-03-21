"use client";

import type { OwnedDrop } from "@/lib/domain/contracts";
import { useCallback, useState } from "react";
import {
  CollectionCurationToolbar,
  ShowcaseToggle,
  type CurationGroupMode,
  type CurationSortMode
} from "./collection-curation-toolbar";

type CollectionCurationPanelProps = {
  ownedDrops: OwnedDrop[];
  renderDrop: (drop: OwnedDrop, extras: { isShowcased: boolean; onShowcaseToggle: (dropId: string) => void }) => React.ReactNode;
};

function sortDrops(drops: OwnedDrop[], mode: CurationSortMode): OwnedDrop[] {
  const sorted = [...drops];
  switch (mode) {
    case "title":
      return sorted.sort((a, b) => a.drop.title.localeCompare(b.drop.title));
    case "price":
      return sorted.sort((a, b) => b.drop.priceUsd - a.drop.priceUsd);
    case "world":
      return sorted.sort((a, b) => a.drop.worldLabel.localeCompare(b.drop.worldLabel));
    case "collected_date":
    default:
      return sorted;
  }
}

function groupDrops(
  drops: OwnedDrop[],
  mode: CurationGroupMode
): Map<string, OwnedDrop[]> {
  if (mode === "none") {
    return new Map([["all", drops]]);
  }

  const groups = new Map<string, OwnedDrop[]>();
  for (const entry of drops) {
    const key =
      mode === "world"
        ? entry.drop.worldLabel || "ungrouped"
        : "mixed media";
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return groups;
}

export function CollectionCurationPanel({
  ownedDrops,
  renderDrop
}: CollectionCurationPanelProps) {
  const [sortMode, setSortMode] = useState<CurationSortMode>("collected_date");
  const [groupMode, setGroupMode] = useState<CurationGroupMode>("none");
  const [showcasedIds, setShowcasedIds] = useState<Set<string>>(new Set());

  const handleShowcaseToggle = useCallback((dropId: string) => {
    setShowcasedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dropId)) {
        next.delete(dropId);
      } else {
        next.add(dropId);
      }
      return next;
    });
  }, []);

  const sorted = sortDrops(ownedDrops, sortMode);
  const grouped = groupDrops(sorted, groupMode);

  return (
    <>
      <CollectionCurationToolbar
        onSortChange={setSortMode}
        onGroupChange={setGroupMode}
        onShowcaseToggle={handleShowcaseToggle}
        showcasedDropIds={showcasedIds}
        totalDrops={ownedDrops.length}
      />

      {Array.from(grouped.entries()).map(([groupKey, drops]) => (
        <section key={groupKey} className="slice-panel">
          {groupMode !== "none" ? (
            <p className="slice-label">{groupKey} ({drops.length})</p>
          ) : null}
          <ul className="slice-grid" aria-label={`collection group: ${groupKey}`}>
            {drops.map((entry) => (
              <li key={entry.certificateId} className="slice-drop-card">
                {renderDrop(entry, {
                  isShowcased: showcasedIds.has(entry.drop.id),
                  onShowcaseToggle: handleShowcaseToggle
                })}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
