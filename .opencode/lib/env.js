// Shared by the budget and models plugins: opencode does not load .env itself.
import { readFileSync, unwatchFile, watchFile } from "fs";
import { join } from "path";

export function readEnv(dir, prefix) {
  const line = new RegExp(`^(${prefix}_\\w+)=(.+)$`);
  try {
    return Object.fromEntries(
      readFileSync(join(dir, ".env"), "utf8")
        .split("\n")
        .map((l) => l.match(line))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()]),
    );
  } catch {
    return {};
  }
}

// opencode watches plugin files but not .env, so a .env edit alone would never
// replay the transform. watchFile (stat-poll) is rename-write safe and only
// fires on mtime/size change. Returns the cleanup function.
export function watchEnv(ctx) {
  const envPath = join(ctx.location.directory, ".env");
  let reloading = false;
  const onChange = () => {
    if (reloading) return;
    reloading = true;
    ctx.agent
      .reload()
      .catch(() => {})
      .finally(() => {
        reloading = false;
      });
  };
  watchFile(envPath, { interval: 5000, persistent: false }, onChange);
  return () => unwatchFile(envPath, onChange);
}