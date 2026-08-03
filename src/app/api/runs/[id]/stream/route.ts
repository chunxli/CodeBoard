import { NextRequest } from "next/server";
import { getRunEmitter, type CopilotRunEvent } from "@/lib/copilot-runner";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: CopilotRunEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (event.type === "exit" || event.type === "error") {
          controller.close();
        }
      };

      const emitter = getRunEmitter(id);
      if (!emitter) {
        // Run already finished (or never existed) — close immediately so the client stops polling.
        send({ type: "exit", code: null, timedOut: false, cancelled: false });
        return;
      }

      const listener = (event: CopilotRunEvent) => send(event);
      emitter.on("event", listener);

      const cleanup = () => emitter.off("event", listener);
      _req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
