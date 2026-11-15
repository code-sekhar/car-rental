# Deployment portability and shared-hosting requirements

No deployment or provider-specific setup has been performed. This application is a server-rendered Node.js Next.js application, not a static export. Generic PHP/static shared hosting is insufficient.

## Provider capability gate

Before choosing a provider, confirm all of the following:

- A supported Node.js runtime: the package supports Node 22.12+ or Node 24 LTS; this milestone was built and tested on Node 24.21.0. Prefer Node 24. Node 22 is a declared compatibility range, not an independently tested matrix result.
- Persistent Node application execution and a supported startup/restart mechanism. Standard command: `npm run start`, which executes `next start`. The provider supplies `PORT` and routes HTTPS requests to the process.
- Environment variables available during both build and runtime. An externally built artifact must use the same compatible OS/architecture and native dependencies as the production runtime.
- PostgreSQL connectivity from the application/build environment, enough connections for the configured pool, TLS/CA settings supplied by the database provider, and permission to apply schema migrations.
- PostgreSQL `btree_gist` extension support. It powers the booking-period exclusion constraint. A provider may provision it in advance; it does not require Docker or an OS root account. Do not drop the conflict constraint to fit an incompatible host.
- HTTPS, application logs, outbound authenticated SMTP connectivity, and a custom domain whose origin matches `APP_URL` and `NEXTAUTH_URL`.
- A writable, persistent private directory if local private document storage will be used. Ordinary build/deployment directories may be replaced and must not hold identity documents.
- A user-level scheduled task or equivalent provider scheduler capable of invoking the maintenance CLI. No systemd, root privileges, Redis or VPS is required.
- Sufficient resources for Next.js builds, database connections and Argon2id work. The password hash uses about 19 MiB per hashing operation, plus application overhead. Measure resources with the selected host rather than assuming a universal shared-hosting limit.

Argon2 uses native N-API packages. The host must allow the matching prebuilt native module for its OS/architecture. `sharp` also uses native image-processing binaries. If a host cannot run the supported Node version, maintain a persistent process, reach PostgreSQL, provide HTTPS or load the required modules, it is incompatible with this application. Choose a compatible Node-capable shared host instead of removing server-side functionality.

## Deployment sequence

1. Provision a new application database and least-privileged application login. Use a separate migration login if the provider requires it. Back up an existing application database before migrations; never run the local-cluster setup script on the host.
2. Configure environment variables from `.env.example`. Set a generated `AUTH_SECRET`, public HTTPS origins and authenticated SMTP. Leave `ALLOW_LOCAL_MAIL=false` and `DEMO_SEED=false` for a real customer environment.
3. Install dependencies with `npm ci` (including development dependencies on the build machine). Ensure Prisma's platform engine and native packages are available. Package managers with install-script approval policies must permit the documented Prisma/esbuild build tooling; do not blindly enable unrelated scripts.
4. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:status`. Production uses `prisma migrate deploy`, never `migrate dev`, `db push` or a reset. No shadow database is needed for deployment.
5. Run lint/type checks/tests against a separate test database. Build with `npm run build`. Public vehicle prerendering reads the configured database, so it must be reachable and migrated at build time.
6. Start with `npm run start` and the provider's assigned `PORT`. Use its control panel or supported restart command after deployment; no process-manager assumption is made.
7. Verify HTTPS cookie behavior, registration/email delivery, login/logout, protected routes and logs on that host before announcing a launch.

The current routes assume a domain or subdomain root. A provider that mounts the app only under a subdirectory requires coordinated Next.js base-path and authentication callback changes and a fresh browser test run before deployment.

No Docker image, reverse-proxy configuration, system service, remote database account or hosting subscription is provisioned by this repository.

## Secrets and sessions

Set secrets through the hosting provider's private environment UI or a protected environment file outside web access. Never commit `.env`, database credentials, SMTP passwords or Google secrets. Both origins must be the same public HTTPS origin; Auth.js uses secure HttpOnly session cookies on HTTPS. Do not configure `NEXTAUTH_URL` to a local origin in production.

Credentials use Auth.js's supported encrypted JWT strategy with a database revocation registry. The registry stores a SHA-256 hash of a random session key; the key stays inside the encrypted HttpOnly cookie. Every protected request checks the registry, absolute expiry, disabled state and verified-email state against PostgreSQL. Roles come from current database records; JWT/session-update data is never accepted as role authority. Logout deletes the active registry record. Password reset deletes every session for the account.

Keep `AUTH_SECRET` stable across restarts. Rotating it invalidates encrypted cookies and changes the encryption key for pending email outbox content. Drain or securely re-encrypt/discard pending messages before rotation and issue fresh verification/recovery links. Database and private-file backups contain sensitive account information and need access restrictions.

## Email delivery and scheduled tasks

Production requires `MAIL_TRANSPORT=smtp`, `SMTP_URL` and `EMAIL_FROM`. Configure SPF/DKIM/DMARC and sender-domain permissions with the selected mail provider. SMTP delivery has not been verified without credentials.

The account transaction stores a token hash and an AES-256-GCM-encrypted email outbox body together. Delivery failure retains the message for retries instead of pretending it was delivered. Delivery is at least once: a worker crash after SMTP accepts an email can cause a retry. Recovery/verification tokens remain single-use and expiring even if an email is delivered twice.

Run `npm run maintenance` from the project directory approximately every minute using a provider scheduler. It retries up to 25 queued/failed emails (up to eight attempts), expires pending booking holds, removes expired registry sessions and rate-limit rows, and removes old expired auth tokens. Avoid overlapping maintenance runs. The provider scheduler must inherit the same private environment configuration as the application. Node execution requires no root access. If cron is unavailable, establish a supported authenticated external scheduler/worker before launch; do not silently leave failed mail or expired holds unattended.

For local development only, `MAIL_TRANSPORT=file` plus explicit `ALLOW_LOCAL_MAIL=true` writes real rendered emails to `.local/mail` with directory mode 0700/file mode 0600. These files are not publicly served and are excluded from source/build tracing. Open them locally to follow the email link. This verifies account logic, not external email delivery.

## Persistent private uploads

Identity-document uploads are not implemented in this milestone. Their planned storage is a provider-owned persistent directory configured by `PRIVATE_DOCUMENT_DIRECTORY`, outside `public/`, `.next/`, source archives and application releases. Files require random keys, restrictive permissions, server-side size/type/content validation, authorization on every download, retention/deletion rules and encrypted backups. A host with ephemeral disk needs compatible private object storage before document upload can be enabled. No public upload route or insecure substitute is provided.

## Logs and operations

Use the provider's standard stdout/stderr application logs. Account errors return neutral client messages. Auth.js logs error codes; mail failures log an outbox record ID, never a recovery link, password or SMTP credential. Database query logging is disabled; warnings may still be emitted. Request IDs, centralized observability, retention policies and operational alerting are later deployment-hardening work, not claimed complete.

The full transactional booking/payment platform is not implemented yet. A database constraint and an expiry maintenance command are foundations, not evidence that checkout, payments, refunds or secure document uploads work end to end.
