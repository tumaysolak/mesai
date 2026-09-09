import express from "express";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createEngine } from "./engine.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function createApp({
  engine,
  adminToken = process.env.ADMIN_TOKEN || "",
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
  });
  // Inbound mail arrives before the JSON parser: Svix signs the raw body.
  const inboundSecret = process.env.INBOUND_WEBHOOK_SECRET || "";
  app.post(
    "/api/mail/inbound",
    express.raw({ type: "*/*", limit: "3mb" }),
    async (req, res) => {
      if (!inboundSecret) return res.status(503).json({ error: "closed" });
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const id = req.get("svix-id") || req.get("webhook-id") || "";
      const timestamp =
        req.get("svix-timestamp") || req.get("webhook-timestamp") || "";
      const header =
        req.get("svix-signature") || req.get("webhook-signature") || "";
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!id || !timestamp || !header || !Number.isFinite(age) || age > 300)
        return res.status(400).json({ error: "bad signature" });
      const key = Buffer.from(inboundSecret.replace(/^whsec_/, ""), "base64");
      const expected = createHmac("sha256", key)
        .update(`${id}.${timestamp}.${raw.toString("utf8")}`)
        .digest("base64");
      const given = header
        .split(" ")
        .map((part) => part.split(",").pop() || "")
        .filter(Boolean);
      const match = given.some((value) => {
        const a = Buffer.from(value);
        const b = Buffer.from(expected);
        return a.length === b.length && timingSafeEqual(a, b);
      });
      if (!match) return res.status(401).json({ error: "bad signature" });
      let event = null;
      try {
        event = JSON.parse(raw.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "bad payload" });
      }
      // Always answer 200 once the signature is valid, so Resend does not retry forever.
      res.json({ received: true });
      if (event?.type === "email.received" && event.data)
        await engine
          .forwardInbound(event.data)
          .catch(() => console.error("Inbound forward failed."));
    },
  );
  app.use(express.json({ limit: "8kb" }));
  const attempts = new Map();
  function owner(req, res, next) {
    const ip = req.ip || "unknown";
    const now = Date.now();
    if (attempts.size > 1000)
      for (const [key, value] of attempts)
        if (value.until < now) attempts.delete(key);
    const attempt = attempts.get(ip);
    if (attempt && attempt.until > now && attempt.count >= 15)
      return res
        .status(429)
        .json({
          error:
            "Çok sayıda başarısız deneme. Birkaç dakika sonra tekrar dene.",
        });
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const digest = (value) => createHash("sha256").update(value).digest();
    if (
      adminToken.length < 24 ||
      !token ||
      !timingSafeEqual(digest(token), digest(adminToken))
    ) {
      const current =
        attempt && attempt.until > now
          ? attempt
          : { count: 0, until: now + 300000 };
      current.count++;
      attempts.set(ip, current);
      return res
        .status(401)
        .json({ error: "Yönetici erişim anahtarı gerekli." });
    }
    attempts.delete(ip);
    next();
  }
  const site = (process.env.PUBLIC_URL || "https://mesailabs.com").replace(
    /\/$/,
    "",
  );
  app.get("/robots.txt", (req, res) =>
    res
      .type("text/plain")
      .send(
        `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`,
      ),
  );
  app.get("/sitemap.xml", (req, res) => {
    const updated = new Date().toISOString().slice(0, 10);
    const pages = [
      ["/", "1.0", "daily"],
      ["/panel", "0.9", "hourly"],
      ["/gizlilik", "0.4", "yearly"],
      ["/kosullar", "0.4", "yearly"],
      ["/cerez", "0.3", "yearly"],
      ["/iletisim", "0.5", "monthly"],
    ];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
        .map(
          ([path, priority, freq]) =>
            `  <url><loc>${site}${path}</loc><lastmod>${updated}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`,
        )
        .join("\n")}\n</urlset>\n`,
    );
  });
  app.get("/api/health", (req, res) => {
    const s = engine.state();
    res.json({
      ok: true,
      service: "mesai",
      day: s.company.day,
      status: s.runtime.status,
    });
  });
  app.get("/api/state", (req, res) => res.json(engine.state()));
  app.get("/api/reports", (req, res) =>
    res.json({ reports: engine.reportList(Number(req.query.limit) || 60) }),
  );
  app.get("/api/reports/:day", (req, res) => {
    const day = Number(req.params.day);
    if (!Number.isInteger(day) || day < 1)
      return res.status(400).json({ error: "Geçersiz gün." });
    const report = engine.reportDay(day);
    if (!report) return res.status(404).json({ error: "Bu güne ait rapor yok." });
    res.json(report);
  });
  app.get("/api/artifacts/:id/preview", (req, res) => {
    const artifact = engine.artifact(req.params.id);
    if (!artifact || artifact.type !== "html")
      return res.status(404).json({ error: "Önizleme bulunamadı." });
    res.set(
      "Content-Security-Policy",
      "sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
    );
    res.type("html").send(artifact.content);
  });
  app.get("/api/artifacts/:id", (req, res) => {
    const artifact = engine.artifact(req.params.id);
    if (!artifact) return res.status(404).json({ error: "Dosya bulunamadı." });
    const types = {
      markdown: ["text/markdown; charset=utf-8", "md"],
      csv: ["text/csv; charset=utf-8", "csv"],
      html: ["text/html; charset=utf-8", "html"],
    };
    const [type, extension] = types[artifact.type] || [
      "text/plain; charset=utf-8",
      "txt",
    ];
    res.set("Content-Type", type);
    res.attachment(
      `mesai-day-${artifact.day}-${artifact.id.slice(-2)}.${extension}`,
    );
    res.send(artifact.content);
  });
  const page = (title, message) =>
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · MESAI</title><style>body{margin:0;background:#f5f5f0;color:#24322b;font:16px/1.7 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{max-width:460px;padding:34px;text-align:center}a{color:#3f6b3f}h1{font-size:23px;margin:0 0 12px}</style></head><body><main><p style="font-weight:800;letter-spacing:.14em;font-size:13px">MES<span style="color:#6f9a4b">AI</span>.</p><h1>${title}</h1><p>${message}</p><p><a href="/">Ürün sayfasına dön</a></p></main></body></html>`;

  const visitorLimits = new Map();
  app.get("/api/visitor/status", (req, res) =>
    res.json(engine.visitorStatus(req.ip)),
  );
  app.get("/api/visitor/feed", (req, res) =>
    res.json({ works: engine.visitorFeed(12) }),
  );
  app.get("/api/visitor/work/:id", (req, res) => {
    const work = engine.visitorWork(req.params.id);
    if (!work) return res.status(404).json({ error: "Bu iş bulunamadı." });
    res.json({ work });
  });
  app.post("/api/visitor/task", async (req, res) => {
    const brief = typeof req.body?.brief === "string" ? req.body.brief : "";
    if (brief.trim().length < 12 || brief.length > 300)
      return res.status(400).json({
        error: "İş tanımı 12 ile 300 karakter arasında olmalı.",
      });
    const now = Date.now();
    const last = visitorLimits.get(req.ip) || 0;
    if (visitorLimits.size > 5000) visitorLimits.clear();
    if (now - last < 20000)
      return res
        .status(429)
        .json({ error: "Bir istek işleniyor. Biraz bekle." });
    visitorLimits.set(req.ip, now);
    try {
      const result = await engine.visitorTask({ brief, ip: req.ip });
      if (result.error === "quota")
        return res.status(429).json({
          error:
            "Günlük hakkını kullandın. Ekip yarın senin için tekrar çalışabilir.",
        });
      if (result.error === "rejected")
        return res.status(422).json({
          error:
            "Ekip bu işi kapsam dışı buldu. Şirketin yapabileceği somut bir iş tanımı yaz.",
        });
      if (result.error)
        return res.status(400).json({ error: "İş tanımı yeterince açık değil." });
      res.json({ work: result.work });
    } catch {
      res.status(500).json({ error: "İş şu an üretilemedi. Tekrar dene." });
    }
  });

  const contactHits = new Map();
  app.post("/api/contact", async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || "").trim().slice(0, 80);
    const email = String(body.email || "").trim().slice(0, 160);
    const message = String(body.message || "").trim();
    if (!/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(email))
      return res.status(400).json({ error: "Geçerli bir e-posta yaz." });
    if (message.length < 10 || message.length > 1500)
      return res
        .status(400)
        .json({ error: "Mesaj en az 10, en fazla 1500 karakter olmalı." });
    const now = Date.now();
    const last = contactHits.get(req.ip) || 0;
    if (now - last < 60000)
      return res
        .status(429)
        .json({ error: "Bir dakika içinde tek mesaj gönderebilirsin." });
    contactHits.set(req.ip, now);
    if (contactHits.size > 5000) contactHits.clear();
    const result = await engine.contact({ name, email, message });
    if (!result.sent)
      return res.status(503).json({
        error:
          "Mesaj şu an iletilemedi. Biraz sonra tekrar dene veya doğrudan iletisim@mesailabs.com adresine yaz.",
      });
    res.json({ sent: true });
  });
  app.post("/api/mail/subscribe", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const result = await engine.subscribe(email);
    if (result.error)
      return res.status(400).json({ error: "Geçerli bir e-posta adresi gir." });
    res.json(result);
  });
  app.get("/api/mail/confirm", (req, res) => {
    const result = engine.confirmSubscriber(req.query.token);
    res
      .status(result.error ? 404 : 200)
      .type("html")
      .send(
        result.error
          ? page("Bağlantı geçersiz", "Bu onay bağlantısı artık geçerli değil.")
          : page(
              "Abonelik onaylandı",
              "Her mesai sonunda şirkette ne olduğunu e-postayla göndereceğiz.",
            ),
      );
  });
  app.get("/api/mail/unsubscribe", (req, res) => {
    const result = engine.unsubscribe(req.query.token);
    res
      .status(result.error ? 404 : 200)
      .type("html")
      .send(
        result.error
          ? page("Bağlantı geçersiz", "Bu bağlantı artık geçerli değil.")
          : page("Abonelik bırakıldı", "Bundan sonra e-posta göndermeyeceğiz."),
      );
  });

  app.get("/api/admin/check", owner, (req, res) => res.json({ ok: true }));
  let lastManual = 0;
  app.post("/api/admin/run", owner, (req, res) => {
    const brief = typeof req.body?.brief === "string" ? req.body.brief : "";
    if (brief.length > 900)
      return res
        .status(400)
        .json({ error: "İş tanımı en fazla 900 karakter olabilir." });
    if (engine.busy)
      return res.status(409).json({ error: "Bir mesai zaten devam ediyor." });
    if (!engine.state().config.autonomous)
      return res
        .status(409)
        .json({ error: "Önce şirketin mesaisini devam ettir." });
    if (Date.now() - lastManual < 15000)
      return res
        .status(429)
        .json({ error: "Yeni mesaiyi başlatmadan önce biraz bekle." });
    lastManual = Date.now();
    engine
      .run({ kind: "manual", brief })
      .catch(() =>
        console.error("Manual shift failed; durable recovery will retry."),
      );
    res.status(202).json({ accepted: true });
  });
  app.post("/api/admin/reset", owner, (req, res) => {
    const startDate = req.body?.startDate;
    if (startDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate)))
      return res
        .status(400)
        .json({ error: "startDate YYYY-MM-DD biçiminde olmalı." });
    if (engine.busy)
      return res.status(409).json({ error: "Bir mesai devam ediyor." });
    try {
      res.json(engine.reset({ startDate }));
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  app.post("/api/admin/pause", owner, (req, res) => {
    if (typeof req.body?.paused !== "boolean")
      return res
        .status(400)
        .json({ error: "paused alanı true veya false olmalı." });
    res.json(engine.pause(req.body.paused));
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Bu işlem bulunamadı." }),
  );
  app.use(
    express.static(resolve(root, "dist"), { index: false, maxAge: "1h" }),
  );
  app.get("/{*path}", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(resolve(root, "dist/index.html"));
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.type === "entity.too.large"
        ? 413
        : error instanceof SyntaxError
          ? 400
          : 500;
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "İşlem tamamlanamadı. Lütfen tekrar dene."
            : "Geçersiz istek.",
      });
  });
  return app;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const engine = createEngine();
  await engine.ready.catch(() =>
    console.error("Startup shift will be retried from its saved checkpoint."),
  );
  const app = createApp({ engine });
  const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
    console.log("MESAI is listening; daily schedule 08:00 Europe/Istanbul."),
  );
  const timer = setInterval(
    () =>
      engine
        .tick()
        .catch(() =>
          console.error("Scheduled shift failed; waiting to recover."),
        ),
    30000,
  );
  const shutdown = () => {
    clearInterval(timer);
    server.close();
    engine.close().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
