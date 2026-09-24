# School Land system: setup and operations

## What changed

School Land now has a Node/Express API, SQLite database, admin authentication, database-backed image storage, moderation, listing search, featured Home cards, details, two public submission forms, and a durable email notification queue. React/Vite and the existing route/layout system are retained. The existing School Land introduction is retained. Shop, Services, About, Resources, navbar, footer, slideshow and account placeholder are outside this change.

All public listings and admin records use the same SQLite database. Public APIs return an explicit field allowlist. Owner names, contact details and internal notes never appear in public listing responses. Submissions start Pending / Inactive / Draft. Only Approved + Active + Published records can appear publicly; expiry and completion visibility are also enforced by the backend.

## Routes

- Admin login: /admin/login
- Admin dashboard: /admin/school-land
- /admin redirects based on session state
- School Land: /school-land
- Listing: /school-land/:slug
- Requirement: /school-land/requirement
- Property submission: /school-land/list

## Local setup

Use Node 22.16 or later (current Node 22 LTS patch recommended). Node 22 emits an experimental warning for its built-in SQLite module; this is a runtime notice, not a failed migration.

1. Run npm ci.
2. Copy .env.example to .env if .env does not exist.
3. Run npm run db:migrate.
4. Create an administrator using the secure command below.
5. Run npm run dev. Vite runs on http://localhost:5173 and proxies /api to port 3001.
6. Open /admin/login.

The checked-in example uses the supplied official recipient info@prismedu.in and WhatsApp +91 9518963309. These values are server configuration, not frontend credentials. The current local .env was initialized without SMTP secrets.

## Create or reset an admin safely

Never pass a real password as a command-line argument, commit it, or put it in a frontend file. Account creation/reset reads the password from standard input. Passwords must have 14–256 characters and are hashed with scrypt. Resetting an account revokes all its sessions.

PowerShell, from the project directory:

    $prismPassword = Read-Host 'New admin password' -AsSecureString
    $prismCredential = [System.Management.Automation.PSCredential]::new('unused', $prismPassword)
    $prismCredential.GetNetworkCredential().Password | node --env-file-if-exists=.env server/admin.js YOUR_ADMIN_USERNAME
    Remove-Variable prismPassword, prismCredential

This does not print the password or place it in shell history. Username may be an email address. Use a strong unique password. There is no default production admin or committed production password. Browser/API test accounts exist only in isolated test databases.

## Environment variables

- NODE_ENV: development locally, production on the host.
- PORT: backend listening port (3001 by default).
- APP_ORIGIN: exact browser origin, without a trailing slash. http://localhost:5173 locally; HTTPS required in production. All mutations verify Origin.
- DATABASE_PATH: SQLite filename. MUST point to a persistent, backed-up disk in production.
- SESSION_SECRET: at least 48 random characters in production; used to hash session tokens. Generate using node crypto and store only in your host secret manager/environment.
- TRUST_PROXY: 0 by default; set to 1 only behind one trusted reverse proxy that overwrites forwarding headers.
- SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD: provider settings.
- MAIL_FROM: a sender address authorized by the mail provider.
- PRISM_NOTIFICATION_EMAIL: info@prismedu.in.
- PRISM_WHATSAPP_NUMBER: 919518963309 (international digits, no + or punctuation).

Restart the backend after environment changes. Session cookies are HttpOnly, SameSite=Strict, Secure in production, and expire after eight hours. Admin mutations additionally require a session-bound CSRF token. Login and public submissions are rate limited.

## Migration and existing listings

npm run db:migrate creates the schema and imports the six original frontend listings once. It is safe to run again. Original slugs remain valid after publication. The original records are preserved in server/legacy-land.json exclusively as a migration source; the production app never reads that file for public listings.

Imported records are pending drafts, because current availability and claims require review. In Admin, verify each record, set Approval to Approved, Admin status to Active, Publication to Published, and save. Featured is preserved from the original records, but does not override visibility rules. Do not delete the production database during deployment.

## Images

Images are stored as BLOBs in the same SQLite database on the persistent disk. No separate bucket or public upload folder is required.

- JPEG, PNG and WebP inputs only, at most 8 MB each and 10 images per listing.
- Actual image content is decoded; inputs are limited to 24 megapixels.
- Images are re-encoded as WebP, oriented and resized to a maximum 1800px dimension, removing metadata.
- First image is the main image. Admin can upload, remove and move images left to reorder.
- Removing a record deletes its associated images transactionally.
- Private images require an admin session. Public images are served only while their listing meets public visibility rules.
- Optional videos use an administrator-provided HTTPS URL; video files are not uploaded into this image endpoint.

Back up the database to back up all listings and images together. Use SQLite's online backup tooling or stop the server before copying the database and its WAL files. Do not copy only a live main database file while ignoring WAL data.

## Email

Configure SMTP_HOST, PORT, SECURE, USER, PASSWORD, MAIL_FROM and PRISM_NOTIFICATION_EMAIL. For port 587, set SMTP_SECURE=false; STARTTLS is required. For port 465, use SMTP_SECURE=true. Use a provider-authorized sender with its SPF/DKIM configuration.

Each successful submission creates an outbox entry in the same database transaction. The server checks the queue every 30 seconds and retries failed delivery up to five times with exponential backoff. The record stays saved if delivery fails. Admin shows queued/sent/failed status and offers Retry Email. Configuration missing at startup does not discard queued messages.

Notification emails include the reference, applicant details, submission fields, authenticated image links and admin review link. Mail delivery was exercised with an isolated test transport; real receipt requires valid SMTP configuration and a live submission. The application never claims email was delivered when merely queued.

## WhatsApp

After a saved submission, Send Details on WhatsApp opens wa.me/919518963309 with the reference and the requested short summary. The visitor chooses whether to send. This is a user-initiated WhatsApp link, not an automatic WhatsApp Business API notification. It includes no internal notes, passwords, image documents or auth tokens. Applicant email/phone/WhatsApp actions appear only inside Admin.

## Admin workflow

Create/edit all listing fields, approve/reject, activate/deactivate, publish/unpublish, duplicate, archive/restore, mark urgent, feature and set Home display priority. Set deal status to Sold, Rented, Leased, Requirement Fulfilled or Closed to remove it from active search. Keep completed listing visible permits a completed details page and a featured Home card with a completed ribbon; it never returns the record to Active Opportunities. Set deal status back to Open to reopen it.

Saving compares updatedAt to prevent overwriting a concurrent edit. Duplicate generates a new ID/reference and private draft, with its own image records. Delete requires explicit confirmation. Restore returns an archived record to Inactive, so an administrator must deliberately activate it.

## Production deployment

This is now a full-stack application. A static-only GitHub Pages deployment cannot run its database, authentication or APIs. Hosting has not yet been specified.

Supported arrangement: one Node service behind an HTTPS reverse proxy, one persistent disk, and a managed SMTP service. The supplied Dockerfile builds Vite and serves both the assets and API from Express, including direct SPA route refresh.

1. Build the image with docker build -t prism-school-land .
2. Attach a persistent volume at /data, writable by the node user (UID 1000).
3. Configure environment variables through the host secret manager. Set DATABASE_PATH=/data/prism.sqlite, APP_ORIGIN to the final HTTPS website origin, NODE_ENV=production, and a generated SESSION_SECRET.
4. Route public HTTPS traffic to container port 3001. Forward /api and normal routes to the same Node service. Set TRUST_PROXY according to the documented one-proxy arrangement.
5. The container entrypoint runs the idempotent migration then starts the server.
6. Create the admin account by securely piping a password to server/admin.js within the deployed container; do not put it into a Dockerfile or build argument.
7. Verify login, a test submission, email receipt, WhatsApp link, moderation and direct route refresh on the real domain.
8. Back up the disk and test restoration. Keep one application instance for this SQLite deployment. Do not use ephemeral/serverless storage or independent database copies across replicas.

For a non-Docker host: npm ci; npm run build; configure the persistent database and production variables; npm run db:migrate; create admin; npm start. A process supervisor should restart the Node server. Serve through HTTPS. Do not deploy Vite's development server or npm run preview as the production backend.

## Verification

- npm run lint — new backend, shared schema, School Land React component, scripts and tests.
- npm test — isolated temporary SQLite API tests; authentication/CSRF, private fields/media, public visibility, filters, duplicate prevention, upload validation, lifecycle, notification success/failure and database reopen.
- npm run build — complete website production build.
- npm run test:browser — Chrome end-to-end admin/public workflow and 1440px, 768px, 320px layout checks. Uses an isolated in-memory database and a test-only account. Google Chrome must be installed.

Browser tests write School Land screenshots into tmp/land-desktop.png, tmp/land-tablet.png and tmp/land-mobile.png. No test creates an account in the actual local/production database. Live hosting and real SMTP receipt cannot be certified from isolated tests.


## Files in this change

- src/App.jsx: replace only School Land integrations and the admin route.
- src/components/SchoolLandSystem.jsx and school-land.css: public listings, search, cards, details, submissions and admin screens.
- shared/land-schema.js: shared field definitions, validation and backend visibility rules.
- server/app.js: public/admin APIs, moderation, upload processing and frontend hosting.
- server/db.js: persistent SQLite schema and data access.
- server/auth.js and server/admin.js: sessions, password hashing and secure account management.
- server/notifications.js and server/index.js: SMTP outbox, WhatsApp summaries and server lifecycle.
- server/seed.js and server/legacy-land.json: idempotent import of the previous six listings.
- public/images/school-land-fallback.svg: local property illustration.
- scripts/dev.js: coordinated Vite/API development startup.
- tests/land.test.js, tests/browser/land.spec.js, scripts/browser-test-server.js and playwright.config.js: isolated automated verification.
- package.json, package-lock.json, vite.config.js and eslint.config.js: dependencies, scripts, proxy and build configuration.
- .env.example, .gitignore, Dockerfile and .dockerignore: environment, secret exclusion and deployment.
- docs/SCHOOL-LAND.md: operational instructions.

Other pre-existing uncommitted changes remain in the workspace; they were not introduced by this School Land implementation.


## Verified execution — 14 September 2026

- Lint: passed for the new implementation, shared schema, scripts and tests.
- API tests: 2 passed, covering the persistent lifecycle and visibility combinations.
- Browser workflow: 1 passed, including login, image-backed creation, featured Home cards, search/clear, direct refresh, requirement submission, pending admin review, sold visibility, logout and protected-route redirection.
- Desktop (1440px), tablet (768px) and mobile (320px): no horizontal overflow in the tested School Land page; desktop/mobile screenshots visually inspected.
- Production build: passed; largest JavaScript chunk approximately 361 KB. Bundle-size warning resolved through library splitting.
- Six original records imported once as pending drafts, retaining original slugs.
- Test-only passwords and private test notes were not found in production assets.
- SQLite emits its Node 22 experimental-feature notice. Test tooling also reports a host color-environment notice; neither is an application failure.
- Real SMTP delivery and deployment on a public host have not been verified. SMTP credentials and hosting details have not been provided.
- scripts/test-browser.js starts and closes the isolated API server around Playwright to avoid Windows subprocess teardown issues.

