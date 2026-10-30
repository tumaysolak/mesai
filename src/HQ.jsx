import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Columns3,
  Maximize2,
  Minimize2,
  X,
  Home,
  Moon,
  Sparkles,
} from "lucide-react";
import Markdown from "./Markdown.jsx";
import AgentsOffice, { DEPARTMENTS, deptOf } from "./Office.jsx";
import "./hq.css";

// three.js is only needed once someone opens the panel, so the landing page
// never pays for it.
const Office3D = lazy(() => import("./Office3D.jsx"));

const FUR = [
  ["#e9a05a", "#f8e3c6"],
  ["#9da3ab", "#e6e6e3"],
  ["#2d2c31", "#f4f1ea"],
  ["#efdab6", "#fbf3e3"],
  ["#8b5a3d", "#e2c3a4"],
  ["#f3f0ea", "#ffffff"],
  ["#d9773a", "#f6d7b6"],
  ["#e9e2d6", "#ffffff"],
];
const lookOf = (agent) =>
  Number.isInteger(agent?.look)
    ? ((agent.look % 8) + 8) % 8
    : [...String(agent?.id || "x")].reduce((n, c) => n + c.charCodeAt(0), 0) %
      8;

// The same cat as in the 3D office, flat, for lists and drawers.
export function CatFace({ agent, size = 28, asleep = false }) {
  const [fur, belly] = FUR[lookOf(agent)];
  const ring = agent?.color || "#e0674a";
  return (
    <svg
      className="hq-cat"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" fill={ring} opacity=".18" />
      <path d="M9 15 L11 4 L18 11 Z" fill={fur} />
      <path d="M31 15 L29 4 L22 11 Z" fill={fur} />
      <path d="M11 12 L12 7 L15.5 11 Z" fill="#f2b8b5" />
      <path d="M29 12 L28 7 L24.5 11 Z" fill="#f2b8b5" />
      <ellipse cx="20" cy="21" rx="13" ry="11.5" fill={fur} />
      <ellipse cx="20" cy="26" rx="6.5" ry="4.6" fill={belly} />
      {asleep ? (
        <g stroke="#1d1d22" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M12.5 20 q2.5 2 5 0" />
          <path d="M22.5 20 q2.5 2 5 0" />
        </g>
      ) : (
        <g fill="#1d1d22">
          <ellipse cx="15" cy="19.5" rx="1.8" ry="2.3" />
          <ellipse cx="25" cy="19.5" rx="1.8" ry="2.3" />
          <circle cx="15.6" cy="18.6" r=".6" fill="#fff" />
          <circle cx="25.6" cy="18.6" r=".6" fill="#fff" />
        </g>
      )}
      <circle cx="20" cy="23.4" r="1.1" fill="#e58f9a" />
      <path d="M11 31 q9 4 18 0" stroke={ring} strokeWidth="2.4" fill="none" />
    </svg>
  );
}

const ago = (iso) => {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa`;
  return `${Math.floor(s / 86400)} gün`;
};
const clean = (m) => String(m || "").replace(/\s*\[[^\]]+\]\s*$/, "");
const greeting = () => {
  const h = Number(
    new Intl.DateTimeFormat("tr-TR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Istanbul",
    }).format(new Date()),
  );
  if (h < 5) return "İyi geceler";
  if (h < 11) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};
const todayLabel = () =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
const fmt = (n) => Number(n || 0).toLocaleString("tr-TR");

function Title({ children, accent }) {
  return (
    <h2 className="hq-title">
      {children} <em>{accent}</em>
      <sup>✦</sup>
    </h2>
  );
}

// --- right column ------------------------------------------------------------
function Board({ decisions, agents, openDecision }) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const pending = decisions.filter((d) => d.status === "pending");
  const latest =
    decisions.find((d) => d.status === "approved" || d.status === "completed") ||
    decisions[0];
  const list = pending.length ? pending.slice(0, 3) : latest ? [latest] : [];
  return (
    <section className="hq-card hq-board">
      <header>
        <div>
          <h3>Kurul soruyor</h3>
          <p>
            {pending.length
              ? `${pending.length} karar oy bekliyor`
              : "Bekleyen karar yok · son karar"}
          </p>
        </div>
      </header>
      {list.map((d) => {
        const yes = (d.votes || []).filter((v) => v.vote === "yes").length;
        const no = (d.votes || []).filter((v) => v.vote === "no").length;
        const owner = byId.get(d.ownerId);
        return (
          <article key={d.id} className="hq-ask">
            <span className="hq-ask-who">
              {owner && <CatFace agent={owner} size={22} />}
              {owner?.role || "Kurul"} · {d.day}. mesai
            </span>
            <b>{d.title}</b>
            <p>{clean(d.summary).slice(0, 150)}</p>
            <div className="hq-ask-foot">
              <span className="hq-votes">
                <i style={{ flex: yes || 0.001 }} className="is-yes" />
                <i style={{ flex: no || 0.001 }} className="is-no" />
              </span>
              <small>
                {yes} evet · {no} hayır
              </small>
              <button onClick={() => openDecision?.(d)}>Oyları gör</button>
            </div>
          </article>
        );
      })}
      {!list.length && <p className="hq-empty">Kurul ilk mesaide toplanacak.</p>}
    </section>
  );
}

function Feed({ events, agents, running, onSelect }) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  return (
    <section className="hq-card hq-feed">
      <header>
        <h3>Ajanların az önce yaptıkları</h3>
        <span className={`hq-live ${running ? "is-on" : ""}`}>
          <i /> {running ? "Canlı" : "Kayıt"}
        </span>
      </header>
      <div className="hq-feed-list">
        {events.slice(0, 18).map((e) => {
          const a = byId.get(e.agentId);
          return (
            <button
              key={e.id}
              className={`hq-feed-row type-${e.type}`}
              onClick={() => a && onSelect(a.id)}
            >
              {a ? (
                <CatFace agent={a} size={24} asleep={!running} />
              ) : (
                <span className="hq-feed-sys">M</span>
              )}
              <span>
                <b>{a ? a.name.split(" ")[0] : "MESAI"}</b>{" "}
                {clean(e.message).slice(0, 140)}
                <small>
                  {a ? a.role : "Sistem"} · {ago(e.createdAt)}
                </small>
              </span>
            </button>
          );
        })}
        {!events.length && <p className="hq-empty">Akış ilk mesaide dolacak.</p>}
      </div>
    </section>
  );
}

function AgentDrawer({ agent, data, running, onClose, openAgent }) {
  const dept = DEPARTMENTS.find((d) => d.id === deptOf(agent));
  const mine = data.tasks.filter((t) => t.ownerId === agent.id);
  const outs = data.artifacts.filter((a) => a.ownerId === agent.id);
  const working = running && agent.status === "working";
  const lessons = (agent.memories || []).slice(-3).reverse();
  return (
    <aside className="hq-card hq-drawer" style={{ "--dept": dept?.color }}>
      <button className="hq-x" onClick={onClose} aria-label="Kapat">
        <X size={14} />
      </button>
      <div className="hq-drawer-head">
        <CatFace agent={agent} size={54} asleep={!running} />
        <div>
          <small>{dept?.name}</small>
          <h3>{agent.name}</h3>
          <em>{agent.role}</em>
        </div>
      </div>
      <div className="hq-big">
        <span>
          <b>{mine.filter((t) => t.status === "done").length}</b>
          <small>iş bitti</small>
        </span>
        <span>
          <b>{outs.length}</b>
          <small>çıktı</small>
        </span>
        <span>
          <b>{agent.level}</b>
          <small>seviye</small>
        </span>
      </div>
      <p className={`hq-state ${working ? "is-on" : ""}`}>
        <i />{" "}
        {working
          ? "Çalışıyor"
          : running
            ? "Sırasını bekliyor"
            : "Uyuyor · model çağrısı yok"}
      </p>
      <dl className="hq-dl">
        <dt>Görev</dt>
        <dd>{agent.duty}</dd>
        <dt>Şu an</dt>
        <dd>{agent.task || "Boşta"}</dd>
        <dt>Ne zaman</dt>
        <dd>Hafta içi 08.00 ile 17.00 arası, sırası geldiğinde</dd>
        <dt>Çalışma biçimi</dt>
        <dd>{data.runtime.provider}</dd>
      </dl>
      <div className="hq-meter">
        <span>
          Enerji <b>{agent.energy}</b>
        </span>
        <i>
          <u style={{ width: `${agent.energy}%` }} />
        </i>
        <span>
          Moral <b>{agent.morale}</b>
        </span>
        <i>
          <u style={{ width: `${agent.morale}%` }} />
        </i>
      </div>
      <h4>Yetenekler</h4>
      <div className="hq-chips">
        {(agent.skills || []).map((s) => (
          <span key={s}>{s}</span>
        ))}
        {(agent.traits || []).map((s) => (
          <span key={s} className="is-trait">
            {s}
          </span>
        ))}
      </div>
      {lessons.length > 0 && (
        <>
          <h4>Hafızasından</h4>
          <ul className="hq-lessons">
            {lessons.map((m) => (
              <li key={m.id}>
                <small>{m.day}. gün</small>
                {m.lesson}
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="hq-primary" onClick={() => openAgent?.(agent)}>
        Karakter dosyasını aç
      </button>
    </aside>
  );
}

function RoomDrawer({ dept, data, running, onClose, onSelect }) {
  const team = data.agents.filter((a) => deptOf(a) === dept.id);
  const ids = new Set(team.map((a) => a.id));
  const mine = data.tasks.filter((t) => ids.has(t.ownerId));
  const outs = data.artifacts.filter((a) => ids.has(a.ownerId));
  return (
    <aside className="hq-card hq-drawer" style={{ "--dept": dept.color }}>
      <button className="hq-x" onClick={onClose} aria-label="Kapat">
        <X size={14} />
      </button>
      <small className="hq-kicker">Oda</small>
      <h3 className="hq-room-name">{dept.name.toLocaleLowerCase("tr-TR")}</h3>
      <p className="hq-muted">{dept.note}</p>
      <div className="hq-big">
        <span>
          <b>{mine.filter((t) => t.status === "done").length}</b>
          <small>bugün iş</small>
        </span>
        <span>
          <b>{running ? team.filter((a) => a.status === "working").length : 0}</b>
          <small>çalışıyor</small>
        </span>
        <span>
          <b>{outs.length}</b>
          <small>çıktı</small>
        </span>
      </div>
      <h4>Ajanlar</h4>
      <div className="hq-team">
        {team.map((a) => (
          <button key={a.id} onClick={() => onSelect(a.id)}>
            <CatFace agent={a} size={28} asleep={!running} />
            <span>
              <b>{a.name}</b>
              <small>{a.role}</small>
            </span>
            <em>
              {!running
                ? "uyuyor"
                : a.status === "working"
                  ? "çalışıyor"
                  : "sırada"}
            </em>
          </button>
        ))}
      </div>
      <h4>Bugünün işleri</h4>
      <ul className="hq-jobs">
        {mine.map((t) => (
          <li key={t.id} className={`is-${t.status}`}>
            <i />
            {t.title}
          </li>
        ))}
        {!mine.length && <li className="hq-muted">Bu odada bugün iş yok.</li>}
      </ul>
    </aside>
  );
}

// --- bottom bar --------------------------------------------------------------
function Ask({ focus }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [work, setWork] = useState(null);
  const dept = DEPARTMENTS.find((d) => d.id === focus);
  async function submit(e) {
    e.preventDefault();
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/visitor/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: `${dept ? dept.name + ": " : ""}${brief.trim()}`,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "İş şu an üretilemedi.");
      setWork(d.work);
      setBrief("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {work && (
        <div className="hq-card hq-result">
          <button className="hq-x" onClick={() => setWork(null)} aria-label="Kapat">
            <X size={14} />
          </button>
          <small className="hq-kicker">
            {work.mode === "ai" ? "Yapay zeka yanıtı" : "Kurallar motoru"}
          </small>
          <h4>{work.title}</h4>
          <p>{work.summary}</p>
          <div className="hq-result-body">
            <Markdown content={work.deliverable} />
          </div>
        </div>
      )}
      <form className="hq-ask-bar" onSubmit={submit}>
        <span className="hq-ask-chip" style={{ "--dept": dept?.color }}>
          {dept ? dept.name.toLocaleLowerCase("tr-TR") : "ekip"}
        </span>
        <input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={280}
          placeholder="Ekibe derdini anlat, günde bir iş…"
          aria-label="Ekibe iş ver"
        />
        <button type="submit" disabled={busy || !brief.trim()}>
          {busy ? <i className="hq-spin" /> : <ArrowUp size={15} />} Gönder
        </button>
        {error && <p className="hq-ask-error">{error}</p>}
      </form>
    </>
  );
}

// --- other tabs ---------------------------------------------------------------
function Rooms({ data, running, open }) {
  return (
    <div className="hq-page">
      <Title accent="bir oda">Her bölüm</Title>
      <p className="hq-lead">
        Her oda bir bölüm, her masa bir ajan. Mesai açılınca sırası gelen
        uyanır, işini bitirince yeniden uyur.
      </p>
      <div className="hq-rooms">
        {DEPARTMENTS.map((d) => {
          const team = data.agents.filter((a) => deptOf(a) === d.id);
          const ids = new Set(team.map((a) => a.id));
          const mine = data.tasks.filter((t) => ids.has(t.ownerId));
          return (
            <button
              key={d.id}
              className="hq-room"
              style={{ "--dept": d.color }}
              onClick={() => open(d.id)}
            >
              <span className="hq-room-art">
                {team.map((a) => (
                  <span key={a.id} className="hq-room-desk">
                    <CatFace
                      agent={a}
                      size={40}
                      asleep={!running || a.status !== "working"}
                    />
                    {(!running || a.status !== "working") && <em>z</em>}
                  </span>
                ))}
                {!team.length && <small>boş oda</small>}
              </span>
              <span className="hq-room-meta">
                <b>{d.name.toLocaleLowerCase("tr-TR")}</b>
                <code>~/mesai/{d.id}</code>
                <small>{d.note}</small>
              </span>
              <span className="hq-room-nums">
                <span>
                  {team.length}
                  <small>ajan</small>
                </span>
                <span>
                  {mine.filter((t) => t.status === "done").length}
                  <small>bitti</small>
                </span>
                <span>
                  {mine.filter((t) => t.status !== "done").length}
                  <small>açık</small>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Memory({ data, running }) {
  const principles = data.principles || [];
  return (
    <div className="hq-page">
      <Title accent="hafıza">Ortak</Title>
      <p className="hq-lead">
        Her ajan günü kendi ölçütüyle okur ve bir ders yazar. Ertesi sabah ilk iş
        bu satırları okur.
      </p>
      {principles.length > 0 && (
        <div className="hq-principles">
          <h4>Şirketin kendi yazdığı ilkeler</h4>
          {principles.map((p) => (
            <p key={p.id}>
              <small>{p.day}. gün</small> {p.text}
            </p>
          ))}
        </div>
      )}
      <div className="hq-memgrid">
        {data.agents.map((a) => (
          <article key={a.id} className="hq-mem" style={{ "--dept": a.color }}>
            <header>
              <CatFace agent={a} size={26} asleep={!running} />
              <span>
                <b>{a.name}</b>
                <small>
                  {a.role} · {(a.memories || []).length} madde
                </small>
              </span>
            </header>
            <ul>
              {(a.memories || [])
                .slice(-4)
                .reverse()
                .map((m) => (
                  <li key={m.id}>
                    {m.lesson}
                    {m.effect && <em>{m.effect}</em>}
                  </li>
                ))}
              {!(a.memories || []).length && <li className="hq-muted">henüz madde yok</li>}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function Cost({ data }) {
  const r = data.runtime;
  const limit = r.dailyCallLimit || 1;
  const pct = Math.min(100, ((r.callsToday || 0) / limit) * 100);
  return (
    <div className="hq-page">
      <Title accent="ne harcıyor?">Ofis</Title>
      <p className="hq-lead">
        Uyuyan ajan hiçbir şey harcamaz. Model yalnız mesai içinde, sırası
        gelen role çağrılır; günlük çağrı sayısının bir tavanı var.
      </p>
      <div className="hq-costs">
        <div className="hq-cost hq-cost-main">
          <small>Bugün model çağrısı</small>
          <b>
            {fmt(r.callsToday)}
            <span> / {fmt(limit)}</span>
          </b>
          <i>
            <u style={{ width: `${pct}%` }} />
          </i>
          <p>{r.provider}</p>
        </div>
        <div className="hq-cost">
          <small>Bugün token</small>
          <b>{fmt(r.tokensToday)}</b>
          <p>girdi + çıktı</p>
        </div>
        <div className="hq-cost">
          <small>Tahmini harcama</small>
          <b>${Number(r.costToday || 0).toFixed(2)}</b>
          <p>model fiyatına göre</p>
        </div>
        <div className="hq-cost">
          <small>Uyuyan ajan</small>
          <b>
            {r.status === "running"
              ? data.agents.filter((a) => a.status !== "working").length
              : data.agents.length}
          </b>
          <p>şu an 0 token harcıyor</p>
        </div>
      </div>
      <div className="hq-sim">
        <h4>
          Simülasyon parası <span>gerçek ödeme yok</span>
        </h4>
        <div>
          <span>
            Kasa <b>{fmt(data.company.cash)} TL</b>
          </span>
          <span>
            Bordro <b>{fmt(data.company.payroll)} TL</b> / mesai
          </span>
          <span>
            Toplam gelir <b>{fmt(data.company.revenue)} TL</b>
          </span>
          <span>
            Müşteri <b>{fmt(data.company.customers)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
export default function HQ({
  data,
  events,
  clock,
  focus,
  setFocus,
  openAgent,
  openDecision,
  wide,
  setWide,
  setBoardOpen,
}) {
  const { agents, runtime, artifacts, decisions, company } = data;
  // "today" is the company's current shift, not every task the panel holds
  const tasks = useMemo(
    () => data.tasks.filter((t) => !t.day || t.day === company.day),
    [data.tasks, company.day],
  );
  const today = useMemo(() => ({ ...data, tasks }), [data, tasks]);
  const running = runtime.status === "running";
  const [tab, setTab] = useState("ofis");
  const [selected, setSelected] = useState(null);
  const [home, setHome] = useState(0);
  const [gl] = useState(() => {
    try {
      const c = document.createElement("canvas");
      return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  });
  const memoryCount = agents.reduce((n, a) => n + (a.memories?.length || 0), 0);
  const awake = running ? agents.filter((a) => a.status === "working").length : 0;
  const done = tasks.filter((t) => t.status === "done").length;
  const pending = decisions.filter((d) => d.status === "pending").length;
  const agent = agents.find((a) => a.id === selected);
  const room = DEPARTMENTS.find((d) => d.id === focus);

  useEffect(() => {
    const key = (e) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else if (focus) setFocus(null);
      else if (wide) setWide(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [selected, focus, wide, setFocus, setWide]);

  const select = (id) => {
    setTab("ofis");
    setSelected(id);
    const a = agents.find((x) => x.id === id);
    if (a) setFocus(deptOf(a));
  };
  const openRoom = (id) => {
    setTab("ofis");
    setSelected(null);
    setFocus(id);
  };

  const summary = useMemo(() => {
    const sleeping = agents.length - awake;
    const parts = [
      `Bugün ajanlar ${done} iş bitirdi.`,
      running
        ? sleeping
          ? `Ofiste ${awake} ajan çalışıyor, ${sleeping} ajan sırasını uyuyarak bekliyor.`
          : `Ofiste ${awake} ajanın hepsi çalışıyor.`
        : `Mesai kapalı, ${agents.length} ajanın hepsi uyuyor; uyuyan ajan token harcamaz.`,
      runtime.callsToday
        ? `Bugün ${runtime.callsToday} model çağrısı yapıldı.`
        : "",
      pending ? `Kurulun önünde ${pending} karar var.` : "",
    ];
    return parts.filter(Boolean).join(" ");
  }, [agents, awake, done, running, runtime.callsToday, pending]);

  return (
    <div className={`hq ${wide ? "is-wide" : ""}`}>
      <div className="hq-top">
        <span className="hq-brand">
          <i />
          MESAI HQ <small>ajan ofisi</small>
        </span>
        <div className="hq-tabs" role="tablist">
          {[
            ["ofis", "Ofis"],
            ["odalar", "Odalar"],
            ["hafiza", "Hafıza"],
            ["maliyet", "Maliyet"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "is-on" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hq-top-gap" />
        <span className={`hq-running ${running ? "is-on" : ""}`}>
          <i /> {running ? `${awake} ajan çalışıyor` : "mesai kapalı"}
        </span>
        <span className="hq-clock">{clock}</span>
        <button className="hq-ghost" onClick={() => setBoardOpen(true)}>
          <Columns3 size={13} /> Pano
        </button>
        <button
          className="hq-ghost"
          onClick={() => {
            setTab("ofis");
            setSelected(null);
            setFocus(null);
            setHome((n) => n + 1);
          }}
        >
          <Home size={13} /> Genel bakış
        </button>
        <button
          className="hq-ghost"
          onClick={() => setWide(!wide)}
          title={wide ? "Tam sayfadan çık (Esc)" : "Ofisi tam sayfa aç"}
        >
          {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      <div className="hq-body">
        <div className={`hq-world ${tab === "ofis" ? "" : "is-hidden"}`}>
          {gl ? (
            <Suspense fallback={<div className="hq-loading">Ofis açılıyor…</div>}>
              <Office3D
                agents={agents}
                tasks={tasks}
                artifacts={artifacts}
                events={events}
                running={running}
                phase={runtime.phase}
                memoryCount={memoryCount}
                focus={focus}
                selected={selected}
                homeSignal={home}
                onFocus={(id) => {
                  setSelected(null);
                  setFocus(focus === id ? null : id);
                }}
                onSelect={select}
              />
            </Suspense>
          ) : (
            <div className="hq-flat">
              <AgentsOffice
                agents={agents}
                tasks={tasks}
                artifacts={artifacts}
                running={running}
                openAgent={openAgent}
                focus={focus}
                setFocus={setFocus}
              />
            </div>
          )}

          <div className="hq-hello hq-card">
            <small>{todayLabel()}</small>
            <h3>
              {greeting()}. <em>{company.day}. mesai</em>
            </h3>
            <p>{summary}</p>
            <span className="hq-phase">
              {running ? <Sparkles size={12} /> : <Moon size={12} />}
              {runtime.phase}
            </span>
          </div>

          {focus && !selected && room && (
            <div className="hq-crumb" style={{ "--dept": room.color }}>
              <button onClick={() => setFocus(null)}>◂ Genel bakış</button>
              <i /> {room.name.toLocaleLowerCase("tr-TR")}
            </div>
          )}

          <div className="hq-side">
            {agent ? (
              <AgentDrawer
                agent={agent}
                data={today}
                running={running}
                openAgent={openAgent}
                onClose={() => setSelected(null)}
              />
            ) : room ? (
              <RoomDrawer
                dept={room}
                data={today}
                running={running}
                onSelect={select}
                onClose={() => setFocus(null)}
              />
            ) : (
              <>
                <Board
                  decisions={decisions}
                  agents={agents}
                  openDecision={openDecision}
                />
                <Feed
                  events={events}
                  agents={agents}
                  running={running}
                  onSelect={select}
                />
              </>
            )}
          </div>

          <div className="hq-bottom">
            <Ask focus={focus} />
          </div>
          <p className="hq-hint">
            Sürükle: kaydır · tekerlek: yakınlaş · odaya ya da kediye tıkla
          </p>
        </div>

        {tab === "odalar" && <Rooms data={today} running={running} open={openRoom} />}
        {tab === "hafiza" && <Memory data={data} running={running} />}
        {tab === "maliyet" && <Cost data={data} />}
      </div>
    </div>
  );
}
