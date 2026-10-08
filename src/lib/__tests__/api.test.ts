/**
 * @jest-environment node
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { apiFetch } from '@/lib/api';

const FAKE_ACCESS_TOKEN = 'fake-access-token';

// The session is the only boundary mocked; the HTTP call hits a real server.
jest.mock('@/auth', () => ({
  auth: async (): Promise<{ accessToken: string }> => ({
    accessToken: 'fake-access-token',
  }),
}));

const INTERNAL = 'API_INTERNAL_URL';
const PUBLIC = 'NEXT_PUBLIC_API_URL';
// Discard port: nothing listens there, so a request to it fails.
const UNREACHABLE_URL = 'http://127.0.0.1:9';

interface ReceivedRequest {
  path: string | undefined;
  authorization: string | undefined;
}

describe('apiFetch base URL resolution', () => {
  let server: Server;
  let serverUrl: string;
  let received: ReceivedRequest[];
  const original = {
    [INTERNAL]: process.env[INTERNAL],
    [PUBLIC]: process.env[PUBLIC],
  };

  function setEnv(name: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      received.push({
        path: req.url,
        authorization: req.headers.authorization,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { ok: true } }));
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    received = [];
  });

  afterEach(() => {
    setEnv(INTERNAL, original[INTERNAL]);
    setEnv(PUBLIC, original[PUBLIC]);
  });

  it('calls the internal URL when it is set', async () => {
    setEnv(INTERNAL, serverUrl);
    setEnv(PUBLIC, UNREACHABLE_URL);

    const result = await apiFetch<{ data: { ok: boolean } }>('/api/products');

    expect(result).toEqual({ data: { ok: true } });
    expect(received).toEqual([
      {
        path: '/api/products',
        authorization: `Bearer ${FAKE_ACCESS_TOKEN}`,
      },
    ]);
  });

  it('falls back to the public URL when the internal URL is unset', async () => {
    setEnv(INTERNAL, undefined);
    setEnv(PUBLIC, serverUrl);

    const result = await apiFetch<{ data: { ok: boolean } }>('/api/supplies');

    expect(result).toEqual({ data: { ok: true } });
    expect(received).toEqual([
      {
        path: '/api/supplies',
        authorization: `Bearer ${FAKE_ACCESS_TOKEN}`,
      },
    ]);
  });
});
