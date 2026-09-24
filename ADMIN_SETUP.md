# Prism Education: local Admin setup and reset

The Admin login is `/admin/login`. Accounts live in the SQLite `admins` table in `DATABASE_PATH` (default `./data/prism.sqlite`), not in frontend code. Passwords use Node scrypt with a random 24-byte salt (N=32768, r=8, p=3, 64-byte output). Authentication uses an eight-hour HttpOnly, SameSite=Strict session cookie (Secure in production), server-side sessions, CSRF checks and login rate limiting.

The inspected local database contained no Admin accounts. Setup is explicit; starting the server or migrating listings does not create a default account. No existing password was retrieved or printed.

## Set or reset locally (Windows PowerShell)

1. Open PowerShell in the project directory. Use Node 22.16 or newer and install dependencies with `npm install` if needed.
2. If `.env` does not exist, copy `.env.example` to `.env`. Do not overwrite an existing `.env`.
3. Set these non-secret entries in `.env`:

   ```dotenv
   ADMIN_USERNAME=prism-admin
   DATABASE_PATH=./data/prism.sqlite
   ```

   You can choose a different username (3–150 letters, digits, underscores, @, dots, plus or minus). Existing process environment variables take precedence over `.env`. For a reset, use the existing account's username and the same database. Changing the username creates another account; it does not rename the old one.

4. Run `npm run admin:setup`. Enter and confirm a unique password of 14–256 characters at the hidden prompts. Use a password manager to generate and retain it. Do not put the password in `.env`, a command argument, source code or chat. The helper sends it directly to Node over stdin without printing it.
5. Wait for `Admin account saved. Existing sessions revoked.` The same command creates a missing account or replaces its password and revokes its sessions in one database transaction. No server restart is required for password changes.
6. Run `npm run dev`, then open `http://localhost:5173/admin/login`. Enter the configured username and the password you just chose.

If PowerShell reports that script execution is disabled, use an organization-approved PowerShell session/policy; this setup command does not change execution policy.

For noninteractive automation, `npm run admin:set` accepts the password through stdin and reads `ADMIN_USERNAME` from the environment or `.env`. No default password is supplied. The legacy username argument remains supported only when `ADMIN_USERNAME` is unset.

## Verification

Run `npm run build`, then `npm run test:admin`. This test uses a temporary database and randomly generated passwords, not the real local account. It checks weak-password rejection, seed hashing, denied anonymous access, incorrect login, successful browser login, cookie flags, session persistence after reload, password reset, session revocation, old-password rejection, new-password login and logout. It deletes its temporary database afterwards and does not record passwords or browser traces.

Production startup separately requires a private `SESSION_SECRET` of at least 48 characters, an HTTPS `APP_ORIGIN` and a persistent `DATABASE_PATH`; see `.env.example`. Never reuse the development session-secret fallback in production.
