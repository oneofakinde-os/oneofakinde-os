import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getRequiredRouteParam,
  notFound,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { session_id: string };

/**
 * GET /api/v1/live-sessions/:session_id/conversation/stream
 *
 * Server-Sent Events stream for live session conversation updates.
 * Pushes the full thread snapshot every 3 seconds while the connection
 * is open. Clients receive data as `event: message` with JSON payload.
 */
export async function GET(
  request: Request,
  context: RouteContext<Params>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  if (!liveSessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  // Verify initial access
  const initialCheck = await commerceBffService.getLiveSessionConversationThread(
    guard.session.accountId,
    liveSessionId
  );
  if (!initialCheck.ok) {
    return initialCheck.reason === "not_found"
      ? notFound("live session not found")
      : forbidden("requires eligibility");
  }

  const INTERVAL_MS = 3000;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      }

      // Send initial thread immediately
      send({ thread: initialCheck.thread });

      // Poll the BFF and push updates
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const result = await commerceBffService.getLiveSessionConversationThread(
            guard.session.accountId,
            liveSessionId
          );
          if (result.ok) {
            send({ thread: result.thread });
          }
        } catch {
          // Silently skip failed reads
        }
      }, INTERVAL_MS);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
