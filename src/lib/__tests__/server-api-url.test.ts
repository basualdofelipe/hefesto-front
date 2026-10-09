import {
  ApiUrlNotConfiguredError,
  getServerApiUrl,
} from '@/lib/server-api-url';

const INTERNAL = 'API_INTERNAL_URL';
const PUBLIC = 'NEXT_PUBLIC_API_URL';

// next/jest loads the developer's .env.local into process.env, so every test
// sets or deletes both variables explicitly and restores them afterwards.
describe('getServerApiUrl', () => {
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

  afterEach(() => {
    setEnv(INTERNAL, original[INTERNAL]);
    setEnv(PUBLIC, original[PUBLIC]);
  });

  it('prefers the internal URL when both are set', () => {
    setEnv(INTERNAL, 'http://back.internal:4000');
    setEnv(PUBLIC, 'https://api.example.com');

    expect(getServerApiUrl()).toBe('http://back.internal:4000');
  });

  it('falls back to the public URL when the internal URL is unset', () => {
    setEnv(INTERNAL, undefined);
    setEnv(PUBLIC, 'https://api.example.com');

    expect(getServerApiUrl()).toBe('https://api.example.com');
  });

  it('falls back to the public URL when the internal URL is blank', () => {
    setEnv(PUBLIC, 'https://api.example.com');

    setEnv(INTERNAL, '');
    expect(getServerApiUrl()).toBe('https://api.example.com');

    setEnv(INTERNAL, '   ');
    expect(getServerApiUrl()).toBe('https://api.example.com');
  });

  it('throws when neither URL is configured', () => {
    setEnv(INTERNAL, undefined);
    setEnv(PUBLIC, undefined);

    expect(() => getServerApiUrl()).toThrow(ApiUrlNotConfiguredError);
  });
});
