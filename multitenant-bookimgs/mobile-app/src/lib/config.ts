// Single source of truth for the API base URL. In development this may
// legitimately fall back to localhost; in a production build, a missing
// EXPO_PUBLIC_API_URL means the EAS build profile forgot to set it — that
// must fail loudly at launch, not silently ship an app that talks to
// localhost on every user's phone (a broken build only fixable by a new
// store submission, not a hotfix).
function resolveApiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;

  if (__DEV__) return 'http://localhost:4000/api';

  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. This build cannot reach the API — set it as an EAS environment variable for this build profile before building for TestFlight/Play or production.',
  );
}

export const API_BASE = resolveApiBase();
