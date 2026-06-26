# Security Policy

Xenesis Desk can run terminals, bridge MCP tools, install provider integration assets, and connect external bot channels. Treat security-sensitive changes carefully.

## Reporting a Vulnerability

Use the repository's GitHub Security Advisory flow when available:

https://github.com/xamong/xenesis-desk/security/advisories/new

If GitHub Security Advisories are not available yet, open a minimal public issue that says a private security report is needed. Do not include exploit details, secrets, tokens, private URLs, or terminal transcripts in a public issue.

## Sensitive Data

Do not commit:

- API keys, bot tokens, OAuth credentials, or session cookies
- `.env*` files
- local Xenesis/Xenesis Desk home directories
- terminal transcripts containing private paths or commands
- generated smoke reports that include local machine details

## Security Boundaries

- Renderer code runs with `nodeIntegration: false`, `contextIsolation: true`, and sandboxing enabled.
- Capability calls from external bridges require approval for write, execute, control, and danger operations.
- Terminal automation must keep dangerous-command detection ahead of auto-input.
- External channels should receive terminal output only after explicit watch/subscribe actions.
