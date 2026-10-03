import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { revokeAllShareLinks } from '../src/server/sharing/links';

try {
  loadEnvFile();
  const { db } = openMigratedDatabase(loadConfig());
  try {
    const revokedLinks = revokeAllShareLinks(db);
    console.log(JSON.stringify({ event: 'share_links_revoked_administratively', revokedLinks }));
  } finally {
    db.close();
  }
} catch {
  console.error(JSON.stringify({ event: 'share_links_revocation_failed' }));
  process.exitCode = 1;
}
