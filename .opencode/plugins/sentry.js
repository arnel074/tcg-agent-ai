// fallow-ignore-file security-sink -- reads a fixed .env path inside the trusted project directory
// Reports opencode session errors to Sentry (sentry.io).
// Zero dependencies on purpose: .opencode/package.json and node_modules are
// gitignored, so an npm dependency could never be committed and would only
// work on this one machine.
//
// opencode does not load .env itself, so the DSN is read from SENTRY_DSN or
// from the project .env (same reason models.js reads it).
import { readFileSync } from "fs";
import { join } from "path";

const DSN_KEY = "SENTRY_DSN=";
const SENTRY_CLIENT = "opencode-racketph-plugin/1.0";

function readDsn(dir) {
  if (process.env.SENTRY_DSN) return process.env.SENTRY_DSN;
  try {
    const line = readFileSync(join(dir, ".env"), "utf8")
      .split("\n")
      .find((l) => l.startsWith(DSN_KEY));
    return line ? line.slice(DSN_KEY.length).trim() : undefined;
  } catch {
    return undefined;
  }
}

// https://PUBLIC_KEY@HOST/PROJECT_ID -> https://HOST/api/PROJECT_ID/store/
function parseDsn(dsn) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!url.username || !projectId) return null;
    return {
      storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      key: url.username,
    };
  } catch {
    return null;
  }
}

// Sentry rejects bodies it cannot serialize, so drop cycles instead of dropping
// the whole event.
function jsonSafe(value) {
  const seen = new WeakSet();
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return String(v);
          seen.add(v);
        }
        return v;
      }),
    );
  } catch {
    return String(value);
  }
}

function str(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

function errorType(error) {
  return str(error.name ?? error.type, "unknown");
}

function errorMessage(error) {
  return str(error.data?.message ?? error.message, errorType(error));
}

// error is a union of provider/auth/api/abort shapes; pull what is there and
// never throw on an unexpected one.
function describe(error) {
  if (!error || typeof error !== "object")
    return { type: "unknown", message: String(error) };
  return { type: errorType(error), message: errorMessage(error) };
}

// v2 delivers the payload under .data, v1 under .properties.
function eventProps(event) {
  return event.properties ?? event.data ?? {};
}

function buildEvent(ctx, event) {
  const props = eventProps(event);
  const { type, message } = describe(props.error);
  const tags = { source: "opencode", type };
  if (props.sessionID) tags.sessionID = props.sessionID;
  return {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    logger: "opencode",
    environment: "opencode",
    release: ctx.app?.version,
    message,
    tags,
    extra: jsonSafe({ error: props.error, sessionID: props.sessionID }),
  };
}

// POST failures are swallowed: a reporting plugin must never throw into
// opencode, and must never react to its own failure.
async function send(target, body) {
  try {
    // The DSN host comes from the operator's SENTRY_DSN, never attacker input.
    // fallow-ignore-next-line security-sink
    await fetch(target.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.key}, sentry_client=${SENTRY_CLIENT}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // ignore
  }
}

export default {
  id: "sentry",
  async setup(ctx) {
    const target = parseDsn(readDsn(ctx.location.directory));
    if (!target || !ctx.event?.subscribe) return;

    const controller = new AbortController();
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({
          signal: controller.signal,
        })) {
          if (event.type !== "session.error") continue;
          await send(target, buildEvent(ctx, event));
        }
      } catch {
        // stream torn down or unavailable — nothing to report
      }
    })();

    return () => controller.abort();
  },
};