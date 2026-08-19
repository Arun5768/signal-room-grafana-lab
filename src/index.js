import { createSignalRoom } from "./server.js";

const port = Number(process.env.PORT ?? 8080);
const { server } = createSignalRoom();

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Signal Room listening on http://localhost:${port}\n`);
});

function shutdown(signal) {
  process.stdout.write(`Received ${signal}; closing server\n`);
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
