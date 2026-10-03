import { stdin, stdout } from 'node:process';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../src/server/auth/passwords';
import { setOwnerPassword } from '../src/server/auth/users';
import { loadEnvFile, openMigratedDatabase } from '../src/server/bootstrap';
import { loadConfig } from '../src/server/config';

/** Reads a line from the terminal without echoing it. */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string): void => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('Cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdout.write(prompt);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: npm run owner -- <username>');
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
  const result = setOwnerPassword(db, username, password);
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
