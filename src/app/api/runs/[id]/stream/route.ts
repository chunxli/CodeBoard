import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRunEmitter, type CopilotRunEvent } from "@/lib/copilot-runner";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const run = await prisma.run.findFirst({ where: { id, task: { repo: { userId } } }, select: { id: true } });
  if (!run) return new Response("Not found", { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: CopilotRunEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (event.type === "exit" || event.type === "error") {
          clearInterval(heartbeat);
          controller.close();
        }
      };

      // SSE comment lines (ignored by EventSource) keep the connection from going idle and
      // being silently dropped by any intermediary (or the browser) between real output bursts —
      // Copilot CLI can go quiet for a while mid-run while it's "thinking" between tool calls.
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const emitter = getRunEmitter(id);
      if (!emitter) {
        // Run already finished (or never existed) — close immediately so the client stops polling.
        send({ type: "exit", code: null, timedOut: false, cancelled: false });
        return;
      }

      const listener = (event: CopilotRunEvent) => send(event);
      emitter.on("event", listener);

      const cleanup = () => {
        emitter.off("event", listener);
        clearInterval(heartbeat);
      };
      _req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Defensive: disable any intermediary's response buffering for this streamed response.
      "X-Accel-Buffering": "no",
    },
  });
}
