import { stdin } from 'node:process';
import { createContributor, disableContributor, enableContributor, resetContributorPassword } from '../src/server/auth/contributors';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';
import { readHidden } from './hidden-input';

const [action, username, displayName, extra] = process.argv.slice(2);
if (!username || extra || !['create', 'reset', 'disable', 'enable'].includes(action ?? '') ||
    (action === 'create' ? !displayName : displayName !== undefined)) {
  console.error('Usage: npm run user -- create <username> <displayName> | reset <username> | disable <username> | enable <username>');
  process.exit(2);
}
let password = '';
if (action === 'create' || action === 'reset') {
  if (!stdin.isTTY) {
    console.error('Run in an interactive terminal. Passwords are never arguments or piped input.');
    process.exit(2);
  }
  password = await readHidden('New password: ');
  if (await readHidden('Repeat the password: ') !== password) {
    console.error('The passwords differ. Nothing was changed.');
    process.exit(1);
  }
}
loadEnvFile();
const { db } = openMigratedDatabase(loadConfig());
try {
  if (action === 'create') {
    const id = createContributor(db, username, displayName!, password);
    console.log(`Contributor ${id} created.`);
  } else {
    const sessions = action === 'reset'
      ? resetContributorPassword(db, username, password)
      : action === 'enable' ? enableContributor(db, username) : disableContributor(db, username);
    console.log(`Contributor ${action === 'reset' ? 'password reset' : action === 'enable' ? 'enabled' : 'disabled'}; ${sessions} session(s) ended.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
