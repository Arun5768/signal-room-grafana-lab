import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export function createLogger({ filePath = process.env.LOG_FILE } = {}) {
  let directoryReady;

  async function writeToFile(line) {
    if (!filePath) {
      return;
    }
    directoryReady ??= mkdir(dirname(filePath), { recursive: true });
    await directoryReady;
    await appendFile(filePath, line, "utf8");
  }

  function write(level, message, fields = {}) {
    const line = `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      service: "checkout-api",
      ...fields,
    })}\n`;
    process.stdout.write(line);
    void writeToFile(line).catch((error) => {
      process.stderr.write(`log file write failed: ${error.message}\n`);
    });
  }

  return {
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}
