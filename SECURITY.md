# Security policy

Report vulnerabilities privately to `vacrom414@gmail.com`. Do not open a public
issue until a fix is available.

The public server treats every upstream response as untrusted, blocks private
network destinations by default, redacts direct-contact PII, limits response
sizes, and keeps write operations disabled unless `UAEMCP_WRITE_TOKEN` is set.

Never commit tokens, production logs, user data, or private source URLs.

The reviewed threat inventory, implemented controls and explicit residual risks
are documented in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
