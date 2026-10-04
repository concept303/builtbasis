import Database from 'better-sqlite3';
const db = new Database(':memory:');
try {
  if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('sqlite_check_failed');
  console.log('runtime ok');
} finally { db.close(); }
