import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { createEngine } from "../server/engine.js";
import { createApp } from "../server/index.js";

const adminToken = "test-owner-token-not-real-1234567890";
const authorization = { Authorization: `Bearer ${adminToken}` };

async function serve(t, options = {}) {
  const engine = createEngine({
    bootstrap: false,
    databasePath: ":memory:",
    apiKey: "",
    phaseDelayMs: 0,
    clock: () => new Date("2026-09-09T05:00:00Z"),
    ...options.engine,
  });
  const app = createApp({
    engine,
    adminToken: options.adminToken ?? adminToken,
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await engine.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options = {}) => fetch(base + path, options);
  return { engine, request };
}

const post = (data, headers = authorization) => ({
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

test("public observers can see state and health but cannot start or pause the company", async (t) => {
  const { engine, request } = await serve(t);
  for (const path of ["/api/state", "/api/health"]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(
      response.headers.get("Content-Security-Policy"),
      /frame-ancestors 'none'/,
    );
    assert.doesNotMatch(await response.text(), new RegExp(adminToken));
  }
  assert.equal((await request("/api/admin/run", post({}, {}))).status, 401);
  assert.equal(
    (await request("/api/admin/pause", post({ paused: true }, {}))).status,
    401,
  );
  assert.equal((await request("/api/admin/check")).status, 401);
  assert.equal(engine.state().company.day, 0);
  assert.equal(engine.state().config.autonomous, true);
});

test("owner authentication rejects incorrect and missing secrets, including a same-length wrong token", async (t) => {
  const { request } = await serve(t);
  for (const value of [
    "Bearer wrong",
    `Bearer ${"x".repeat(adminToken.length)}`,
    adminToken,
    `Basic ${adminToken}`,
  ]) {
    assert.equal(
      (await request("/api/admin/check", { headers: { Authorization: value } }))
        .status,
      401,
    );
  }
  assert.equal(
    (await request("/api/admin/check", { headers: authorization })).status,
    200,
  );
  const disabled = await serve(t, { adminToken: "" });
  assert.equal(
    (
      await disabled.request("/api/admin/check", {
        headers: { Authorization: "Bearer " },
      })
    ).status,
    401,
  );
});

test("invalid pause payloads cannot mutate state; a valid owner can pause and resume", async (t) => {
  const { engine, request } = await serve(t);
  for (const data of [
    {},
    { paused: "false" },
    { paused: 0 },
    { paused: null },
  ]) {
    assert.equal((await request("/api/admin/pause", post(data))).status, 400);
    assert.equal(engine.state().config.autonomous, true);
  }
  assert.equal(
    (await request("/api/admin/pause", post({ paused: true }))).status,
    200,
  );
  assert.equal(engine.state().config.autonomous, false);
  assert.equal((await request("/api/admin/run", post({}))).status, 409);
  assert.equal(
    (await request("/api/admin/pause", post({ paused: false }))).status,
    200,
  );
  assert.equal(engine.state().config.autonomous, true);
});

test("manual start is asynchronous, rejects overlap and cannot be spammed after completion", async (t) => {
  const { engine, request } = await serve(t, { engine: { phaseDelayMs: 15 } });
  const start = await request("/api/admin/run", post({}));
  assert.equal(start.status, 202);
  assert.deepEqual(await start.json(), { accepted: true });
  assert.equal((await request("/api/admin/run", post({}))).status, 409);
  for (let count = 0; count < 100 && engine.busy; count++) await sleep(5);
  assert.equal(engine.busy, false);
  assert.equal(engine.state().company.day, 1);
  assert.equal((await request("/api/admin/run", post({}))).status, 429);
});

test("artifact downloads preserve exact content, safe attachment filenames and correct types", async (t) => {
  const { engine, request } = await serve(t);
  await engine.run({ key: "download-test" });
  const types = {
    markdown: "text/markdown",
    csv: "text/csv",
    html: "text/html",
  };
  for (const artifact of engine.state().artifacts) {
    const response = await request(artifact.downloadUrl);
    assert.equal(response.status, 200);
    assert.ok(
      response.headers.get("Content-Type").startsWith(types[artifact.type]),
    );
    assert.match(
      response.headers.get("Content-Disposition"),
      /^attachment; filename="mesai-day-1-a\d\.(md|csv|html)"$/,
    );
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    // Fetch strips a UTF-8 BOM; its presence does not change CSV contents.
    assert.equal(
      await response.text(),
      artifact.content.replace(/^\uFEFF/, ""),
    );
  }
  const missing = await request("/api/artifacts/does-not-exist");
  assert.equal(missing.status, 404);
  assert.equal(
    (await request("/api/artifacts/%27%20OR%201%3D1--")).status,
    404,
  );
});

test("malformed JSON and oversized requests are rejected without stack traces or changing state", async (t) => {
  const { engine, request } = await serve(t);
  const headers = { ...authorization, "Content-Type": "application/json" };
  const malformed = await request("/api/admin/pause", {
    method: "POST",
    headers,
    body: "{broken",
  });
  assert.equal(malformed.status, 400);
  assert.doesNotMatch(
    await malformed.text(),
    /SyntaxError|node_modules|at JSON/,
  );
  const large = await request("/api/admin/pause", {
    method: "POST",
    headers,
    body: JSON.stringify({ paused: true, data: "x".repeat(10000) }),
  });
  assert.equal(large.status, 413);
  assert.equal(engine.state().config.autonomous, true);
});

test("public unknown mutations cannot change production data or initiate paid work", async (t) => {
  const { engine, request } = await serve(t);
  const before = engine.state();
  assert.equal((await request("/api/demo", post({}, {}))).status, 404);
  assert.equal((await request("/api/run", post({}, {}))).status, 404);
  assert.deepEqual(engine.state(), before);
});

test("repeated failed administrator authentication is rate limited", async (t) => {
  const { request } = await serve(t);
  for (let attempt = 0; attempt < 15; attempt++) {
    assert.equal(
      (
        await request("/api/admin/check", {
          headers: { Authorization: "Bearer wrong" },
        })
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await request("/api/admin/check", {
        headers: { Authorization: "Bearer wrong" },
      })
    ).status,
    429,
  );
});

test("interactive HTML preview is opaque, cannot fetch network or submit forms", async (t) => {
  const { engine, request } = await serve(t);
  await engine.run({ key: "preview" });
  const html = engine.state().artifacts.find((a) => a.type === "html");
  const response = await request(`/api/artifacts/${html.id}/preview`);
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy");
  assert.match(policy, /sandbox allow-scripts;/);
  assert.doesNotMatch(policy, /allow-same-origin/);
  assert.match(policy, /connect-src 'none'/);
  assert.match(policy, /form-action 'none'/);
  assert.match(await response.text(), /savings-output/);
  const markdown = engine.state().artifacts.find((a) => a.type === "markdown");
  assert.equal(
    (await request(`/api/artifacts/${markdown.id}/preview`)).status,
    404,
  );
});

test("an owner brief is length checked before it can reach the team", async (t) => {
  const { engine, request } = await serve(t);
  const long = await request("/api/admin/run", post({ brief: "a".repeat(901) }));
  assert.equal(long.status, 400);
  assert.match((await long.json()).error, /900/);
  assert.equal(engine.busy, false);
  const ignored = await request("/api/admin/run", post({ brief: { nested: true } }));
  assert.equal(ignored.status, 202);
  await sleep(30);
});
