import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'bookaata_token';
const SUBDOMAIN_KEY = 'bookaata_subdomain';

export interface AuthCredentials {
  token: string;
  subdomain: string;
}

export async function getStoredAuth(): Promise<AuthCredentials | null> {
  const [token, subdomain] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(SUBDOMAIN_KEY),
  ]);
  if (!token || !subdomain) return null;
  return { token, subdomain };
}

export async function setStoredAuth(auth: AuthCredentials): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, auth.token),
    SecureStore.setItemAsync(SUBDOMAIN_KEY, auth.subdomain),
  ]);
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(SUBDOMAIN_KEY),
  ]);
}
