#!/usr/bin/env node
// Prints a SQL statement that sets a Neon Auth (Better Auth) email+password credential.
// Runs locally; the password is read from the PW env var and never leaves your machine.
//
//   read -rs PW && export PW     # type the password; nothing is echoed
//   node scripts/set-password-sql.mjs you@example.com
//   unset PW
//
// Paste the output into the Neon SQL editor. Hash format matches Better Auth's default:
// scrypt (N=16384, r=16, p=1, 64-byte key) over the NFKC-normalised password, with the
// hex salt string used as the salt, stored as "<saltHex>:<keyHex>".

import { randomBytes, scryptSync } from 'node:crypto'

const email = process.argv[2]
const password = process.env.PW
if (!email || !password) {
  console.error('usage: PW=<password> node scripts/set-password-sql.mjs <email>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Use at least 8 characters.')
  process.exit(1)
}

const N = 16384, r = 16, p = 1
const salt = randomBytes(16).toString('hex')
const key = scryptSync(password.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 })
const hash = `${salt}:${key.toString('hex')}`
const e = email.replace(/'/g, "''")

console.log(`update neon_auth.account a
set password = '${hash}', "updatedAt" = now()
from neon_auth."user" u
where a."userId" = u.id and a."providerId" = 'credential' and lower(u.email) = lower('${e}')
returning u.email, (a.password is not null) as has_password;`)
