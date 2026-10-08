import { describeError, logger } from '@/lib/logger';

type ConsoleMethod = 'log' | 'warn' | 'error';

interface LogLine {
  level: string;
  time: string;
  msg: string;
  [key: string]: unknown;
}

describe('logger', () => {
  const spies: Record<ConsoleMethod, jest.SpyInstance> = {} as Record<
    ConsoleMethod,
    jest.SpyInstance
  >;

  beforeEach(() => {
    for (const method of ['log', 'warn', 'error'] as const) {
      spies[method] = jest.spyOn(console, method).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** The single argument of the single call on `method`, parsed as JSON. */
  const onlyLine = (method: ConsoleMethod): LogLine => {
    expect(spies[method]).toHaveBeenCalledTimes(1);
    const args = spies[method].mock.calls[0] as unknown[];
    expect(args).toHaveLength(1);
    const [line] = args;
    expect(typeof line).toBe('string');
    expect(line as string).not.toContain('\n');
    return JSON.parse(line as string) as LogLine;
  };

  it('writes one JSON line with level, time, msg and the context keys', () => {
    logger.warn(
      { op: 'demo-login', status: 503, retry: false },
      'login failed',
    );

    const line = onlyLine('warn');
    expect(line).toEqual({
      level: 'warn',
      time: expect.any(String),
      msg: 'login failed',
      op: 'demo-login',
      status: 503,
      retry: false,
    });
    expect(new Date(line.time).toISOString()).toBe(line.time);
  });

  it('routes info to console.log and error to console.error', () => {
    logger.info({ op: 'a' }, 'started');
    logger.error({ op: 'b', err: null }, 'broke');

    expect(onlyLine('log')).toMatchObject({ level: 'info', op: 'a' });
    expect(onlyLine('error')).toMatchObject({
      level: 'error',
      op: 'b',
      err: null,
    });
    expect(spies.warn).not.toHaveBeenCalled();
  });
});

describe('describeError', () => {
  it('uses the message of an Error', () => {
    expect(describeError(new TypeError('bad shape'))).toBe('bad shape');
  });

  it('stringifies anything else', () => {
    expect(describeError('offline')).toBe('offline');
    expect(describeError(undefined)).toBe('undefined');
  });
});
