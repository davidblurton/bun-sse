import EventEmitter from "events";
import { Hono } from "hono";

const emitter = new EventEmitter();

function sse(req: { signal: AbortSignal }): Response {
  const signal = req.signal;
  return new Response(
    new ReadableStream({
      type: "direct",
      async pull(controller) {
        const handler = (count: number) => {
          controller.write(JSON.stringify({ count }));
          controller.flush();
        };

        emitter.on("count", handler);

        while (!signal.aborted) {
          await Bun.sleep(1000);
        }

        emitter.off("count", handler);
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } }
  );
}

let counter = 0;

const app = new Hono();

app.get("/", (c) => c.text("Hono!"));
app.post("/count", (c) => {
  emitter.emit("count", ++counter);
  return c.json({ count: counter });
});
app.get("/stream", (c) => sse(c.req));

export default app;
