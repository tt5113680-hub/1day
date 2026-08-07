# H-001 acceptance

- Removed the API access-token secret fallback. API startup now fails closed if `AUTH_TOKEN_SECRET` is absent, set to the retired development default, or too short in production.
- Docker Compose requires the secret to be supplied from the invoking environment. The controlled-pilot deployment guide documents the requirement and secret-store boundary.
- `tests/h-001-auth-secret-startup.test.mjs` launches the built API without a production secret and with the retired default; both cases must terminate non-zero with the expected startup error.
