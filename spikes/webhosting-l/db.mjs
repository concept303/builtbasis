// Opens SQLite with better-sqlite3, or with Node's built-in node:sqlite as the fallback.
// SQLITE_DRIVER=node forces the fallback; SQLITE_DRIVER=better-sqlite3 forbids it.
function wrap(driver, db) {
  return {
    driver,
    exec: (sql) => db.exec(sql),
    run: (sql, ...params) => db.prepare(sql).run(...params),
    get: (sql, ...params) => db.prepare(sql).get(...params),
    close: () => db.close(),
  };
}

export async function openDatabase(path, { readonly = false } = {}) {
  if (process.env.SQLITE_DRIVER !== 'node') {
    try {
      const { default: Database } = await import('better-sqlite3');
      return wrap('better-sqlite3', new Database(path, { readonly }));
    } catch (error) {
      if (process.env.SQLITE_DRIVER === 'better-sqlite3') throw error;
      console.warn(`better-sqlite3 unavailable (${error.message}); using node:sqlite`);
    }
  }
  const { DatabaseSync } = await import('node:sqlite');
  return wrap('node:sqlite', new DatabaseSync(path, { readOnly: readonly }));
}
