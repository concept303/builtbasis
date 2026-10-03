import { readHidden } from './hidden-input';
import { stdin } from 'node:process';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../src/server/auth/passwords';
import { setOwnerPassword } from '../src/server/auth/users';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';

const username = process.argv[2];
if (!username || process.argv.length > 4) {
  console.error('Usage: npm run owner -- <username> [displayName]');
  process.exit(2);
}
if (!stdin.isTTY) {
  console.error('Run this command in an interactive terminal: the password is typed, never piped or passed as an argument.');
  process.exit(2);
}

const password = await readHidden(
  `New password for "${username}" (${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters): `,
);
if ((await readHidden('Repeat the password: ')) !== password) {
  console.error('The passwords differ. Nothing was changed.');
  process.exit(1);
}

loadEnvFile();
const { db } = openMigratedDatabase(loadConfig());
try {
  const result = setOwnerPassword(db, username, password, new Date(), process.argv[3]);
  console.log(
    result.created
      ? `Owner account "${username}" created.`
      : `Password for "${username}" reset; ${result.sessionsRemoved} session(s) ended.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  db.close();
}
