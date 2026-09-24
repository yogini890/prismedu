import {materialTables} from './material-db.js';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
export function openDatabase(filename = process.env.DATABASE_PATH || './data/prism.sqlite') {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), {recursive:true});
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, reference TEXT NOT NULL UNIQUE, data TEXT NOT NULL, submission_key TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE, bytes BLOB NOT NULL, mime TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, updated_at TEXT, error TEXT);
  `);
  db.prepare('INSERT OR IGNORE INTO migrations VALUES (?, ?)').run('001-school-land',new Date().toISOString());
  const columns=db.prepare('PRAGMA table_info(admins)').all().map(row=>row.name);
  if(!columns.includes('role')) db.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
  if(!columns.includes('active')) db.exec('ALTER TABLE admins ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  materialTables(db);
  return db;
}
export const readListings = db => db.prepare('SELECT data FROM listings').all().map(row => JSON.parse(row.data));
export const findListing = (db, id) => { const row = db.prepare('SELECT data FROM listings WHERE id=? OR slug=? OR reference=?').get(id,id,id); return row && JSON.parse(row.data); };
export function saveListing(db, item, submissionKey = null) {
  db.prepare('INSERT INTO listings (id,slug,reference,data,submission_key) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, slug=excluded.slug').run(item.id,item.slug,item.reference,JSON.stringify(item),submissionKey);
}
