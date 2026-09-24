# School Material marketplace

School materials now use the existing SQLite server, administrator sessions, CSRF protection and image processing. School Land tables and records remain independent.

## Run and deploy

- Run `npm run db:migrate` once per database before starting the application. The migration is idempotent. It imports the 12 existing School Material listings as Active, preserving their IDs and details. The previous “Second-Hand Required” transaction is normalized to “Required” with condition “Pre-Owned”. Existing nonnumeric quantity descriptions are retained.
- `npm run dev` runs the frontend and backend. Production: `npm run build`, then `npm start`. The existing Docker startup also runs the migration.
- No new environment variables or dependencies are required. Keep `DATABASE_PATH` on persistent storage and back up the SQLite database with its uploaded images. Existing production session/origin settings still apply.
- Material enquiries and quotation links use `PRISM_WHATSAPP_NUMBER` (currently `919518963309`) and enquiry email uses `PRISM_NOTIFICATION_EMAIL` (currently `info@prismedu.in`). These open the user's WhatsApp/email client; no message is sent automatically. No online payment or completed order is simulated.
- Use the existing administrator account, or provision it with `npm run admin:set -- <username>` and a password through standard input as described in SCHOOL-LAND.md. No default production password is supplied.

## Administration

Open `/admin`, sign in and select **School Material Listings**. Add/edit listings, search by text, filter by nature/status and sort by date/title. Status actions include Activate, Deactivate, Sold Out, Rented and Restore as Available. Deletion requires confirmation and removes associated images. Administrators can preview inactive listings without making them public.

The editor supports title, short/full descriptions, nature, transaction, category/custom category, quantity/unit, condition, INR price or price on request, location, private contact fields, tags and status. Up to 10 JPEG/PNG/WebP images are allowed, 8 MB and 24 megapixels each. Images are decoded, resized to fit 1800px and stored as WebP in SQLite. The first image is featured; existing images can be reordered to become featured or removed. Owner contact details remain admin-only; public enquiries go through Prism.

Creation uses an idempotency key. Edits require the current `updatedAt` value and detect concurrent changes, including changes during image processing. Public API endpoints are read-only; all mutations require the existing admin session, matching request origin and CSRF token.

## Public behaviour

`/school-materials` uses one shared card component and the same database as the three-card homepage preview. Shop All has keyword, nature, transaction, condition, category and location filters plus pagination and counts. Cards use uploaded images or local category-specific icons. Available/Required have teal/gold styling. Completed listings have a prominent ribbon. The homepage shows the latest three Active records; completed listings remain visible in Shop All only.

Listings refresh on navigation, window focus and every 30 seconds while visible. Inactive listings and their images are hidden publicly. Deleted listings return 404. Details read current data at the existing `/school-materials/:id` route. Only Active Available For Sale items can enter the cart; other active transactions use enquiries. Add-to-cart and quotation requests recheck current server data. Sold Out, Rented, Required, Inactive and deleted items cannot pass quotation validation. Local storage stores only the user's transient cart, never listing administration.

## Changed files for this task

- `src/App.jsx`: replace static material data/components with the connected module; preserve unrelated page sections and routes.
- `src/components/SchoolMaterialSystem.jsx`, `src/components/school-materials.css`: shared cards, Shop All, homepage preview, current details/cart handling and listing administration.
- `src/components/SchoolLandSystem.jsx`: add the material admin menu and reuse its authentication shell. Land administration remains intact.
- `shared/material-schema.js`: shared field validation, status rules and filters.
- `server/materials.js`, `server/material-db.js`, `server/legacy-materials.json`: CRUD/read APIs, material/image tables and migration source.
- `server/app.js`, `server/db.js`, `server/seed.js`: register the module and migration using existing server facilities.
- `package.json`: include the new UI in lint coverage.
- `tests/materials.test.js`, `tests/browser/materials.spec.js`, `scripts/browser-test-server.js`: lifecycle, migration, access, status, media and browser verification using isolated test databases.
- `docs/SCHOOL-MATERIALS.md`: this guide.

## Verification commands

`npm run lint`

`npm test`

`npm run build`

`npm run test:browser`

Browser testing uses an isolated in-memory database and test-only admin credentials. Screenshots are written to ignored `tmp/materials-desktop.png`, `tmp/materials-tablet.png` and `tmp/materials-mobile.png`. Test listings never enter the local production database.
