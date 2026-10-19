import assert from "node:assert/strict";
import { test } from "node:test";
import { hash } from "@node-rs/argon2";
import { verify } from "../src/lib/auth/argon2-cloudflare";

test("Workers verifier accepts existing native Argon2id hashes without resets", async () => {
  const password = "migration-fixture-🔐";
  const encoded = await hash(password);
  const start = process.cpuUsage();
  assert.equal(await verify(encoded, password), true);
  const cpu = process.cpuUsage(start);
  console.info(
    `Argon2 verification local CPU: ${(cpu.user + cpu.system) / 1000} ms (not a hosted Workers measurement)`,
  );
  assert.equal(await verify(encoded, "wrong-password"), false);
});

test("Workers verifier honors existing non-default work factors", async () => {
  const encoded = await hash("fixture", {
    memoryCost: 8192,
    timeCost: 3,
    parallelism: 2,
  });
  assert.equal(await verify(encoded, "fixture"), true);
});

test("malformed, unsupported, and excessive Argon2 parameters fail closed", async () => {
  for (const encoded of [
    "",
    "plaintext",
    "$argon2i$v=19$m=8,t=1,p=1$c2FsdHNhbHQ$YWJj",
    "$argon2id$v=19$m=9999999,t=2,p=1$c2FsdHNhbHQ$YWJj",
    "$argon2id$v=19$m=8,t=1,p=0$c2FsdHNhbHQ$YWJj",
  ]) {
    assert.equal(await verify(encoded, "fixture"), false);
  }
});
