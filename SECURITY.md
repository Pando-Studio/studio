# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email **security@qiplim.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
3. We will respond within 48 hours
4. We will publish a fix and credit you (unless you prefer anonymity)

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest | No       |

## Scope

- Studio application (`apps/studio/`)
- Engage application (`apps/engage/`)
- Public API endpoints
- Authentication system (BetterAuth)
- File upload handling
- AI provider key management (BYOK encryption)

## Security Features

- **Authentication**: BetterAuth with email/password + Google OAuth, 7-day sessions
- **BYOK Encryption**: AES-256-GCM for user-provided API keys
- **Input Validation**: Zod schemas on all POST/PATCH endpoints
- **Auth Middleware**: `getAuthContext()` / `getStudioAuthContext()` on all API routes
- **Rate Limiting**: Chat endpoints (50 req/hour)
- **File Upload**: MIME type validation + magic bytes check
- **No secrets in code**: All credentials via environment variables
