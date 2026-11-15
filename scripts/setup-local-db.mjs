// Creates an isolated, loopback-only development cluster. Never touches system PostgreSQL.
import { mkdir, writeFile, unlink, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import pg from "pg";
const root = resolve(".local");
const data = resolve(root, "postgres");
const socket = resolve(root, "pg-socket");
const bin = process.env.POSTGRES_BIN ?? "/usr/lib/postgresql/18/bin";
const port = Number(process.env.LOCAL_DATABASE_PORT ?? 55432);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid LOCAL_DATABASE_PORT");
await mkdir(root, { recursive: true, mode: 0o700 });
await chmod(root, 0o700);
await mkdir(socket, { recursive: true, mode: 0o700 });
const owner = process.env.USER;
if (!owner || !/^[a-z_][a-z0-9_-]*$/i.test(owner))
  throw new Error("Cannot identify local cluster owner");
if (!existsSync(resolve(data, "PG_VERSION"))) {
  const pwFile = resolve(root, ".init-password");
  await writeFile(pwFile, randomBytes(32).toString("hex"), { mode: 0o600 });
  try {
    execFileSync(
      resolve(bin, "initdb"),
      [
        "-D",
        data,
        "-U",
        owner,
        "--auth-local=peer",
        "--auth-host=scram-sha-256",
        `--pwfile=${pwFile}`,
        "--encoding=UTF8",
        "--no-locale",
      ],
      { stdio: "pipe" },
    );
  } finally {
    await unlink(pwFile);
  }
  await writeFile(
    resolve(data, "postgresql.conf"),
    `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = '${socket.replaceAll("'", "''")}'\n`,
    { flag: "a" },
  );
}
try {
  execFileSync(resolve(bin, "pg_ctl"), ["-D", data, "status"], {
    stdio: "pipe",
  });
} catch {
  execFileSync(
    resolve(bin, "pg_ctl"),
    ["-D", data, "-l", resolve(root, "postgres.log"), "start", "-w"],
    { stdio: "pipe" },
  );
}
const client = new pg.Client({
  host: socket,
  port,
  user: owner,
  database: "postgres",
});
await client.connect();
try {
  if (existsSync(".env")) {
    console.log(
      "Local cluster started; existing .env preserved. No credentials changed.",
    );
    process.exitCode = 0;
  } else {
    const password = randomBytes(32).toString("hex");
    const found = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname='veltrix'",
    );
    if (found.rowCount)
      throw new Error(
        "Cluster already has a veltrix role but .env is missing; restore local credentials instead of resetting them.",
      );
    await client.query(
      `CREATE ROLE veltrix LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`,
    );
    for (const name of ["veltrix_development", "veltrix_test"])
      await client.query(`CREATE DATABASE ${name} OWNER veltrix`);
    const url = `postgresql://veltrix:${password}@127.0.0.1:${port}`;
    await writeFile(
      ".env",
      `DATABASE_URL=${url}/veltrix_development\nTEST_DATABASE_URL=${url}/veltrix_test\nAUTH_SECRET=${randomBytes(48).toString("base64url")}\nNEXTAUTH_URL=http://localhost:3000\nAPP_URL=http://localhost:3000\nMAIL_TRANSPORT=file\nALLOW_LOCAL_MAIL=true\nEMAIL_FROM=Veltrix Rentals <no-reply@veltrix.test>\nDEMO_SEED=true\n`,
      { mode: 0o600 },
    );
    console.log(
      `Created isolated PostgreSQL databases on 127.0.0.1:${port}; credentials saved privately in .env.`,
    );
  }
} finally {
  await client.end();
}
