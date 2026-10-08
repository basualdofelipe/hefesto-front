/**
 * Structured logger: one JSON line per call, `{ level, time, msg, ...context }`,
 * written to stdout (info) or stderr (warn, error) through the console, so it
 * works on the Next server and in the browser alike; routing the stream is the
 * environment's job (12-Factor XI).
 *
 * Context values are flat scalars on purpose. Never put a secret, a token, an
 * email or a response body in them.
 */

export type LogValue = string | number | boolean | null;

/** Context fields; the line's own keys cannot be overridden by a caller. */
export type LogContext = { readonly [key: string]: LogValue } & {
  readonly level?: never;
  readonly time?: never;
  readonly msg?: never;
};

type LogLevel = 'info' | 'warn' | 'error';

// Resolved at call time, so the console can be swapped (tests, instrumentation).
const SINKS: Readonly<Record<LogLevel, (line: string) => void>> = {
  info: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

function write(level: LogLevel, context: LogContext, message: string): void {
  const line = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  };
  SINKS[level](JSON.stringify(line));
}

export const logger = {
  info: (context: LogContext, message: string): void =>
    write('info', context, message),
  warn: (context: LogContext, message: string): void =>
    write('warn', context, message),
  error: (context: LogContext, message: string): void =>
    write('error', context, message),
};

/** A caught value as a log field: an Error's message, anything else as text. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
