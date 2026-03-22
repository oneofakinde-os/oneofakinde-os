import { getRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

/**
 * GET /api/v1/notifications/stream
 *
 * Server-Sent Events stream for notification badge updates.
 * Pushes the unread count every 15 seconds while the connection
 * is open. Unauthenticated requests receive a perpetual 0 count.
 */
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  const accountId = session?.accountId ?? null;

  const INTERVAL_MS = 15_000;
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

      // Send initial count immediately
      const initialCount = accountId
        ? await commerceBffService.getNotificationUnreadCount(accountId)
        : 0;
      send({ unreadCount: initialCount });

      // Push periodic updates
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const count = accountId
            ? await commerceBffService.getNotificationUnreadCount(accountId)
            : 0;
          send({ unreadCount: count });
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
