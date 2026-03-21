import { useCallback } from "react";
import type { SurfaceActionVerb, SurfaceName, SurfaceTelemetryEvent } from "@/lib/domain/contracts";

type TrackEventInput = Omit<SurfaceTelemetryEvent, "surface"> & {
  surface?: SurfaceName;
};

export function useSurfaceTelemetry(defaultSurface: SurfaceName) {
  const track = useCallback(
    async (event: TrackEventInput) => {
      try {
        await fetch("/api/v1/analytics/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            surface: event.surface ?? defaultSurface,
            action: event.action,
            dropId: event.dropId,
            objectType: event.objectType,
            objectId: event.objectId,
            durationMs: event.durationMs,
            completionPercent: event.completionPercent,
            position: event.position,
            metadata: event.metadata
          }),
          keepalive: true
        });
      } catch {
        // Best-effort telemetry
      }
    },
    [defaultSurface]
  );

  return { track };
}
