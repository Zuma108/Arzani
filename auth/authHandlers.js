import { createOrUpdateOAuthUser, getUserByProviderId } from '../database.js';

export async function handleGoogleAuth(profile) {
  return createOrUpdateOAuthUser({
    email: profile.email,
    username: profile.name,
    provider: 'google',
    providerId: profile.sub // Google's user ID
  });
}

export async function handleMicrosoftAuth(profile) {
  return createOrUpdateOAuthUser({
    email: profile.mail || profile.userPrincipalName,
    username: profile.displayName,
    provider: 'microsoft',
    providerId: profile.id
  });
}

export async function handleLinkedInAuth(profile) {
  return createOrUpdateOAuthUser({
    email: profile.email,
    username: `${profile.localizedFirstName} ${profile.localizedLastName}`,
    provider: 'linkedin',
    providerId: profile.id
  });
}
