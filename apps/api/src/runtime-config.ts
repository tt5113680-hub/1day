const DEVELOPMENT_DEFAULT_SECRET = 'development-only-change-me';

export function requireAuthTokenSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (!secret)
    throw new Error(
      'AUTH_TOKEN_SECRET is required before the API can start. Supply a unique secret through the deployment secret store.',
    );
  if (secret === DEVELOPMENT_DEFAULT_SECRET)
    throw new Error('AUTH_TOKEN_SECRET must not use the retired development default secret.');
  if (process.env.NODE_ENV === 'production' && secret.length < 32)
    throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters in production.');
  return secret;
}
