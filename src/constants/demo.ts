// The single front reader of the demo switch (D-16). Next inlines NEXT_PUBLIC_*
// at build time only for the literal `process.env.NEXT_PUBLIC_X` member access,
// so keep the expression as-is; changing the flag requires a rebuild.
// The back reads its own twin, DEMO_LOGIN_ENABLED, at runtime.
export const isDemoMode = (): boolean =>
  process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === 'true';
