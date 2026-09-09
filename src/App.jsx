import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock3,
  Code2,
  Coffee,
  Download,
  Eye,
  FileText,
  FlaskConical,
  FolderOpen,
  GitFork,
  Info,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Maximize2,
  Menu,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Vote,
  X,
  Zap,
} from "lucide-react";

const NAV = [
  { id: "overview", label: "Genel bakış", icon: LayoutDashboard },
  { id: "team", label: "Ekip & karakterler", icon: Users },
  { id: "decisions", label: "Karar odası", icon: GitFork },
  { id: "tasks", label: "İş panosu", icon: CheckCheck },
  { id: "artifacts", label: "Üretilenler", icon: FolderOpen },
  { id: "learning", label: "Öğrenme günlüğü", icon: BrainCircuit },
];
const number = (value) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
const money = (value) => `₺${number(value)}`;
const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString("tr-TR", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "numeric",
        month: "long",
      })
    : "—";
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const findAgent = (agents, id) => agents.find((a) => a.id === id);
const labelStatus = (s) =>
  ({
    idle: "Mesai tamamlandı",
    running: "Mesai devam ediyor",
    paused: "Mesai duraklatıldı",
    error: "İlgi gerekiyor",
    approved: "Kabul edildi",
    completed: "Tamamlandı",
    rejected: "Kabul edilmedi",
    backlog: "Sırada",
    in_progress: "Üzerinde çalışılıyor",
    done: "Tamamlandı",
  })[s] || s;
const fileIcon = (type) =>
  type === "csv" ? Table2 : type === "html" ? Code2 : FileText;

function Portrait({ agent, index = 0, className = "", size = 48 }) {
  const seed = agent?.name
    ? [...agent.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 8
    : index % 8;
  const palette = [
    "#dbebc5",
    "#e1daf0",
    "#f0d1bb",
    "#c6dfe5",
    "#f1e4b8",
    "#cfdacf",
    "#e9cad0",
    "#c7d4ef",
  ];
  const shirts = [
    "#637f50",
    "#8873a5",
    "#bc7458",
    "#4e7c86",
    "#b0964e",
    "#526c5a",
    "#aa6576",
    "#677bab",
  ];
  const skin = [
    "#e4b087",
    "#a96745",
    "#e6b994",
    "#c28660",
    "#e9c2a0",
    "#bd805a",
    "#eac0a1",
    "#d19d72",
  ][seed];
  const hair = [
    "#332b27",
    "#272527",
    "#443027",
    "#2c2825",
    "#6a4732",
    "#39312e",
    "#41332c",
    "#3d322a",
  ][seed];
  return (
    <svg
      className={`portrait ${className}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={agent?.name || "Çalışan"}
    >
      <rect width="80" height="80" rx="24" fill={palette[seed]} />
      {seed % 3 === 1 && (
        <path d="M17 49V27c0-22 45-24 46 0v30H18Z" fill={hair} />
      )}
      <path d="M12 80V68c2-12 16-17 28-17s26 5 28 17v12" fill={shirts[seed]} />
      <path d="M33 48h14v14c-4 6-10 6-14 0Z" fill={skin} />
      <path d="M32 52h16v5c-5 5-11 5-16 0" fill="#000" opacity=".08" />
      <ellipse cx="23" cy="37" rx="4" ry="6" fill={skin} />
      <ellipse cx="57" cy="37" rx="4" ry="6" fill={skin} />
      <rect x="23" y="16" width="34" height="40" rx="16" fill={skin} />
      {seed % 3 === 0 ? (
        <path
          d="M22 32c-4-16 6-25 20-25 14 0 20 12 15 25l-6-13-10 7-11-3-7 12Z"
          fill={hair}
        />
      ) : seed % 3 === 1 ? (
        <path d="M22 31C21 7 57 5 59 30L48 19c-5 9-15 10-26 12Z" fill={hair} />
      ) : (
        <path d="M22 31V19C20 5 58 5 58 21v12l-6-13-24 3-6 11Z" fill={hair} />
      )}
      <path
        d="M30 34h5m10 0h5"
        stroke={hair}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="32" cy="38" r="1.5" fill="#352d29" />
      <circle cx="48" cy="38" r="1.5" fill="#352d29" />
      <path
        d="m40 38-1 6h3"
        stroke="#a87452"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M35 48q5 4 10 0"
        stroke="#874e3f"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {(seed === 0 || seed === 3 || seed === 5) && (
        <g fill="none" stroke="#423b36" strokeWidth="1.4">
          <rect x="25.5" y="33.5" width="12" height="9" rx="3.5" />
          <rect x="42.5" y="33.5" width="12" height="9" rx="3.5" />
          <path d="M38 37h4" />
        </g>
      )}
      {seed === 2 && (
        <path
          d="M25 42q2 19 15 17 14-1 15-17l-5 8-10 3-10-3Z"
          fill={hair}
          opacity=".65"
        />
      )}
      <path
        d="m29 61 11 8 11-8"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

function Modal({ title, eyebrow, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("button")?.focus();
    function key(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const els = ref.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]',
      );
      if (!els?.length) return;
      const first = els[0],
        last = els[els.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Empty({ icon: Icon = Coffee, title, text }) {
  return (
    <div className="empty">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Tag({ children, tone = "" }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

function Office({ agents, activeId, openAgent, running = false }) {
  return (
    <div className={`office ${running ? "office-running" : ""}`}>
      <div className="office-wall">
        <span>MESAİ LABS</span>
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div className="room room-strategy">
        <span className="room-label">
          <GitFork size={11} /> KARAR ODASI
        </span>
        <div className="board">
          <i />
          <i />
          <i />
        </div>
        <div className="meeting-table">
          <span className="table-mark">
            iyi fikirler
            <br />
            <b>birlikte büyür.</b>
          </span>
          <div className="table-paper" />
          <div className="table-coffee" />
        </div>
      </div>
      <div className="room room-product">
        <span className="room-label">
          <Code2 size={11} /> ÜRÜN STÜDYOSU
        </span>
        <div className="desk desk-one">
          <div className="monitor" />
          <div className="keyboard" />
          <div className="desk-notebook" />
        </div>
        <div className="desk desk-two">
          <div className="monitor" />
          <div className="keyboard" />
          <div className="desk-notebook" />
        </div>
      </div>
      <div className="room room-growth">
        <span className="room-label">
          <TrendingUp size={11} /> BÜYÜME MASASI
        </span>
        <div className="growth-table">
          <div className="growth-chart">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="table-paper" />
        </div>
      </div>
      <div className="room room-social">
        <span className="room-label">
          <Coffee size={11} /> FİKİR MOLASI
        </span>
        <div className="sofa sofa-one" />
        <div className="sofa sofa-two" />
        <div className="coffee-table">
          <i />
        </div>
        <div className="rug" />
      </div>
      <div className="office-corridor">
        <span>FİKİRLER BURADA İŞE DÖNÜŞÜR</span>
        <ArrowRight size={14} />
      </div>
      <div className="plant plant-one">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="plant plant-two">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="plant plant-three">
        <i />
        <i />
        <i />
        <i />
      </div>
      {agents.slice(0, 8).map((agent, i) => (
        <button
          key={agent.id}
          className={`office-person person-${i} ${activeId === agent.id ? "person-active" : ""}`}
          onClick={() => openAgent(agent)}
          aria-label={`${agent.name}, ${agent.role}. Karakteri incele`}
        >
          {activeId === agent.id && (
            <span className="person-bubble">
              <span />
              <span />
              <span />
            </span>
          )}
          <Portrait agent={agent} size={48} />
          <span className="person-name">
            {agent.name.split(" ")[0]}
            <small>
              {agent.role
                .replace("Chief Executive Officer", "CEO")
                .replace("Chief Technology Officer", "CTO")}
            </small>
          </span>
        </button>
      ))}
      {!agents.length && (
        <div className="office-wait">Ekip ofise yerleşiyor…</div>
      )}
      <span className="office-hint">
        <Eye size={12} /> Bir karaktere tıkla, hikâyesini keşfet
      </span>
    </div>
  );
}

function EventFeed({ events, agents, replay, compact = false }) {
  const shown = compact ? events.slice(0, 5) : events;
  return (
    <div
      className={`event-feed ${compact ? "event-feed-compact" : ""}`}
      aria-label={
        replay ? "Kayıtlı olayların tekrarı" : "Şirket etkinlik akışı"
      }
    >
      {!shown.length ? (
        <Empty
          title={replay ? "Kayıt başlıyor" : "Ofis şu an sessiz"}
          text={
            replay
              ? "Günün adımları sırayla gösterilecek."
              : "Yeni mesai başladığında gelişmeler burada görünecek."
          }
        />
      ) : (
        shown.map((event, i) => {
          const agent = findAgent(agents, event.agentId);
          const Icon = event.type?.includes("decision")
            ? GitFork
            : event.type?.includes("artifact")
              ? FileText
              : event.type?.includes("learn")
                ? BrainCircuit
                : Sparkles;
          return (
            <div
              className="event-item"
              key={event.id}
              style={{ "--delay": `${i * 35}ms` }}
            >
              <div className="event-avatar">
                {agent ? (
                  <Portrait agent={agent} size={33} />
                ) : (
                  <span>
                    <Icon size={16} />
                  </span>
                )}
              </div>
              <div className="event-body">
                <div className="event-meta">
                  <strong>{agent?.name?.split(" ")[0] || "MESAİ"}</strong>
                  <time>{time(event.createdAt)}</time>
                </div>
                <p>{event.message}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MiniChart({ history, field = "revenue", large = false }) {
  if (!history.length)
    return (
      <div className="chart-empty">
        İlk mesaiyle birlikte büyüme eğrisi oluşacak.
      </div>
    );
  const width = 480,
    height = large ? 180 : 100,
    pad = 12;
  const values = history.map((p) => Number(p[field]) || 0),
    max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values.map((v, i) => [
    pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1),
    height - pad - ((v - min) / Math.max(max - min, 1)) * (height - pad * 2),
  ]);
  const d = points.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${history.length} günlük ${field === "revenue" ? "simüle gelir" : "şirket itibarı"} grafiği`}
      >
        <defs>
          <linearGradient id={`fill-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#abc956" stopOpacity=".28" />
            <stop offset="100%" stopColor="#abc956" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.15, 0.5, 0.85].map((y) => (
          <line
            key={y}
            x1="0"
            y1={height * y}
            x2={width}
            y2={height * y}
            stroke="#e9ebe4"
            strokeDasharray="4 5"
          />
        ))}
        {points.length > 1 && (
          <path
            d={`${d} L${points.at(-1)[0]} ${height} L${points[0][0]} ${height}Z`}
            fill={`url(#fill-${field})`}
          />
        )}
        <path
          d={d}
          fill="none"
          stroke="#769047"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={points.length === 1 || i === points.length - 1 ? 5 : 2}
            fill="#769047"
          >
            <title>
              {history[i].day}. gün:{" "}
              {field === "revenue" ? money(values[i]) : number(values[i])}
            </title>
          </circle>
        ))}
      </svg>
      <div className="chart-axis">
        <span>{history[0].day}. gün</span>
        <span>
          {history.length === 1
            ? "İlk gün · yeni veri bekleniyor"
            : `${history.at(-1).day}. gün`}
        </span>
      </div>
    </div>
  );
}

function ArtifactCard({ artifact, agents, onOpen, compact = false }) {
  const Icon = fileIcon(artifact.type),
    owner = findAgent(agents, artifact.ownerId);
  return (
    <article className={`artifact-card ${compact ? "artifact-compact" : ""}`}>
      <button
        className={`artifact-cover type-${artifact.type}`}
        onClick={() => onOpen(artifact)}
        aria-label={`${artifact.title} önizle`}
      >
        <span className="artifact-extension">
          .{artifact.type === "markdown" ? "md" : artifact.type}
        </span>
        <div className="file-drawing">
          <Icon size={28} strokeWidth={1.4} />
          <i />
          <i />
          <i />
        </div>
        <span className="artifact-open">
          <ArrowUpRight size={18} />
        </span>
      </button>
      <div className="artifact-info">
        <div className="artifact-kicker">
          {artifact.day}. GÜN <span>•</span> GERÇEK ÇIKTI
        </div>
        <button
          className="text-button artifact-title"
          onClick={() => onOpen(artifact)}
        >
          {artifact.title}
        </button>
        {!compact && <p>{artifact.description}</p>}
        <div className="artifact-footer">
          <span>
            {owner && <Portrait agent={owner} size={22} />}
            {owner?.name.split(" ")[0] || "MESAİ"}
          </span>
          <a
            href={`/api/artifacts/${encodeURIComponent(artifact.id)}`}
            download
            title={`${artifact.title} indir`}
            aria-label={`${artifact.title} indir`}
          >
            <Download size={16} />
          </a>
        </div>
      </div>
    </article>
  );
}

function Overview({
  data,
  openAgent,
  openArtifact,
  openDecision,
  navigate,
  events,
  replay,
  startReplay,
  stopReplay,
  nextText,
  setOfficeOpen,
}) {
  const { company, agents, runtime, tasks, artifacts, decisions, history } =
    data;
  const done = tasks.filter((t) => t.status === "done").length;
  const memoryCount = agents.reduce((n, a) => n + a.memories.length, 0);
  const latestDecision =
    decisions.find(
      (d) => d.status === "approved" || d.status === "completed",
    ) || decisions[0];
  const activeId = replay
    ? events[0]?.agentId
    : runtime.status === "running"
      ? events[0]?.agentId
      : null;
  return (
    <>
      <SectionHeading
        eyebrow="OTONOM ŞİRKET DENEYİ · TÜMAY SOLAK"
        title={
          <>
            Fikirden işe.<span className="heading-emphasis"> Her gün.</span>
          </>
        }
        description="Sekiz farklı karakter. Ortak bir hedef. Kendi kendine ilerleyen bir şirket."
        action={
          <button
            className={`button button-dark ${replay ? "replay-button" : ""}`}
            onClick={replay ? stopReplay : startReplay}
            disabled={!data.events.length}
          >
            {replay ? (
              <Pause size={15} />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            {replay ? "Tekrarı durdur" : "Demoyu izle"}
            <span>{replay ? "KAYIT" : `${company.day}. GÜN`}</span>
          </button>
        }
      />
      <div className="metric-grid">
        <div className="metric">
          <span className="metric-label">
            Simülasyon günü{" "}
            <span className="metric-symbol">
              <Clock3 size={17} />
            </span>
          </span>
          <div className="metric-value">
            {number(company.day)}
            <small>gün</small>
          </div>
          <div className="metric-foot">
            <span className="tiny-dot" />
            Seviye {company.level} · {number(company.xp)} XP
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">
            Toplam gelir <Tag>Simülasyon</Tag>
          </span>
          <div className="metric-value">{money(company.revenue)}</div>
          <div className="metric-foot">
            <TrendingUp size={13} />
            {number(company.customers)} simüle müşteri
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">
            Ortaya çıkan işler{" "}
            <span className="metric-symbol">
              <FolderOpen size={17} />
            </span>
          </span>
          <div className="metric-value">
            {number(artifacts.length)}
            <small>çıktı</small>
          </div>
          <div className="metric-foot">
            <CheckCheck size={14} />
            {done} / {tasks.length} görev tamamlandı
          </div>
        </div>
        <div className="metric metric-learning">
          <span className="metric-label">
            Kolektif hafıza <BrainCircuit size={18} />
          </span>
          <div className="metric-value">
            {number(memoryCount)}
            <small>öğrenim</small>
          </div>
          <button
            className="metric-foot text-button"
            onClick={() => navigate("learning")}
          >
            Her mesai biraz daha deneyimli <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <div className="overview-grid">
        <section className="panel office-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Ofiste bugün{" "}
                <span className="count-label">{agents.length} kişi</span>
              </h2>
              <p>
                {replay
                  ? "Kayıtlı mesai yeniden oynatılıyor."
                  : runtime.status === "running"
                    ? "Bir sonraki fikir burada şekilleniyor."
                    : "Çalışma alanını ve ekibin hikâyelerini keşfet."}
              </p>
            </div>
            <div className="panel-tools">
              <Tag tone={runtime.status === "running" || replay ? "green" : ""}>
                <span className="tiny-dot" />
                {replay
                  ? "Tekrar"
                  : runtime.status === "running"
                    ? "Mesai açık"
                    : "Ofis görünümü"}
              </Tag>
              <button
                className="icon-button"
                onClick={() => setOfficeOpen(true)}
                aria-label="Ofisi büyüt"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          <Office
            agents={agents}
            activeId={activeId}
            openAgent={openAgent}
            running={runtime.status === "running" || replay}
          />
          <div className="office-bottom">
            <span>
              <span className="status-dot" />
              {labelStatus(runtime.status)}
            </span>
            <span>
              <Clock3 size={13} /> Sonraki mesai{" "}
              <b>{runtime.status === "paused" ? "duraklatıldı" : nextText}</b>
            </span>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Ofisten haberler</h2>
              <p>
                {replay ? "Günün kayıtlarından" : "Karardan sonuca, adım adım"}
              </p>
            </div>
            <span
              className={`broadcast ${runtime.status === "running" ? "is-live" : ""}`}
            >
              <Radio size={16} />
            </span>
          </div>
          <EventFeed events={events} agents={agents} replay={replay} compact />
          <button className="panel-link" onClick={() => navigate("activity")}>
            Tüm hareketleri gör <ArrowRight size={14} />
          </button>
        </section>
      </div>
      <div className="second-grid">
        <section className="panel decision-spotlight">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">KARAR ODASINDAN</span>
              <h2>Fikirler konuşulur. Kararlar alınır.</h2>
            </div>
            <GitFork size={21} />
          </div>
          {latestDecision ? (
            <>
              <div className="decision-spotlight-body">
                <Tag
                  tone={latestDecision.status === "rejected" ? "red" : "green"}
                >
                  <CircleCheck size={11} />
                  {labelStatus(latestDecision.status)}
                </Tag>
                <h3>{latestDecision.title}</h3>
                <p>{latestDecision.summary}</p>
              </div>
              <div className="decision-spotlight-bottom">
                <div className="avatar-stack">
                  {latestDecision.votes.slice(0, 5).map((v) => (
                    <Portrait
                      key={v.agentId}
                      agent={findAgent(agents, v.agentId)}
                      size={29}
                    />
                  ))}
                  <span>
                    {
                      latestDecision.votes.filter((v) => v.vote === "yes")
                        .length
                    }
                    /{latestDecision.votes.length} destek
                  </span>
                </div>
                <button
                  className="text-button link"
                  onClick={() => openDecision(latestDecision)}
                >
                  Kararı incele <ArrowUpRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <Empty
              title="İlk fikir masaya gelmek üzere"
              text="Ekibin önerileri ve oyları burada görünecek."
            />
          )}
        </section>
        <section className="panel growth-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">BÜYÜME TAKİBİ</span>
              <h2>Küçük adımlar, biriken sonuçlar.</h2>
            </div>
            <Tag>Simülasyon</Tag>
          </div>
          <div className="growth-number">
            {money(company.revenue)} <span>toplam simüle gelir</span>
          </div>
          <MiniChart history={history} />
        </section>
      </div>
      <section className="output-section">
        <div className="section-row">
          <div>
            <span className="eyebrow">FİKİRLERİN SOMUT HALİ</span>
            <h2>
              Mesainin ürettikleri{" "}
              <span className="count-label">{artifacts.length}</span>
            </h2>
          </div>
          <button
            className="text-button link"
            onClick={() => navigate("artifacts")}
          >
            Tüm çıktılar <ArrowRight size={15} />
          </button>
        </div>
        <div className="artifact-grid">
          {artifacts.slice(0, 3).map((a) => (
            <ArtifactCard
              key={a.id}
              artifact={a}
              agents={agents}
              onOpen={openArtifact}
              compact
            />
          ))}
        </div>
        {!artifacts.length && (
          <Empty
            icon={FolderOpen}
            title="İlk çıktı hazırlanıyor"
            text="Araştırmalar, planlar ve prototipler burada gerçek dosyalara dönüşecek."
          />
        )}
      </section>
      <div className="experiment-note">
        <span className="note-star">✳</span>
        <p>
          <strong>Kurgusal bir şirket. Gerçek bir merak.</strong> İnsan gibi
          farklı geçmişlere sahip karakterler, bir şirketi birlikte büyütebilir
          mi? Bu açık deneyin seyircisi sensin.
        </p>
        <button className="text-button" onClick={() => navigate("about")}>
          Deney hakkında <ArrowUpRight size={15} />
        </button>
      </div>
    </>
  );
}

function Team({ data, openAgent }) {
  const [department, setDepartment] = useState("all");
  const departments = [...new Set(data.agents.map((a) => a.department))];
  return (
    <>
      <SectionHeading
        eyebrow="İNSAN GİBİ FARKLI"
        title="Aynı ofis. Sekiz ayrı dünya."
        description="Geçmişleri, güçlü yanları ve çekinceleri kararlarına yansır. Tüm karakterler kurgusaldır."
      />
      <div className="filter-bar">
        <button
          className={department === "all" ? "filter active" : "filter"}
          onClick={() => setDepartment("all")}
        >
          Tüm ekip <span>{data.agents.length}</span>
        </button>
        {departments.map((d) => (
          <button
            key={d}
            className={department === d ? "filter active" : "filter"}
            onClick={() => setDepartment(d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="team-grid">
        {data.agents
          .filter((a) => department === "all" || a.department === department)
          .map((a, i) => (
            <button
              key={a.id}
              className="team-card"
              onClick={() => openAgent(a)}
            >
              <div className={`team-card-cover team-cover-${i % 4}`}>
                <span className="team-level">LVL {a.level}</span>
                <Portrait agent={a} size={86} />
                <span className="team-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </div>
              <div className="team-card-body">
                <span className="eyebrow">{a.role}</span>
                <h2>{a.name}</h2>
                <p>{a.motivation}</p>
                <div className="traits">
                  {a.traits.slice(0, 2).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <div className="team-energy">
                  <span>
                    <Zap size={12} /> Enerji
                  </span>
                  <div className="meter">
                    <i style={{ width: `${clamp(a.energy)}%` }} />
                  </div>
                  <b>{clamp(a.energy)}%</b>
                </div>
                <div className="team-card-foot">
                  <span>
                    <BrainCircuit size={13} />
                    {a.memories.length} öğrenim
                  </span>
                  <span>{number(a.xp)} XP</span>
                </div>
              </div>
            </button>
          ))}
      </div>
    </>
  );
}

function Decisions({ data, openDecision }) {
  const [filter, setFilter] = useState("all");
  const filtered = data.decisions.filter(
    (d) =>
      filter === "all" ||
      (filter === "approved"
        ? ["approved", "completed"].includes(d.status)
        : d.status === filter),
  );
  return (
    <>
      <SectionHeading
        eyebrow="KOLEKTİF AKIL"
        title="Kararların da bir hikâyesi var."
        description="Kim ne önerdi, kim karşı çıktı, neden seçildi? Şirketin kararları bütün gerekçeleriyle burada."
      />
      <div className="filter-bar">
        {[
          ["all", "Tüm kararlar"],
          ["approved", "Kabul edilen"],
          ["rejected", "Kabul edilmeyen"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`filter ${filter === id ? "active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="decision-list">
        {filtered.map((d) => (
          <button
            className="decision-row"
            key={d.id}
            onClick={() => openDecision(d)}
          >
            <div
              className={`decision-icon ${d.status === "rejected" ? "rejected" : ""}`}
            >
              <GitFork size={23} />
            </div>
            <div className="decision-row-body">
              <div className="decision-row-kicker">
                <span>{d.day}. GÜN</span>
                <span>{d.category}</span>
                <Tag tone={d.status === "rejected" ? "red" : "green"}>
                  {labelStatus(d.status)}
                </Tag>
              </div>
              <h2>{d.title}</h2>
              <p>{d.summary}</p>
              <div className="decision-vote-summary">
                <Vote size={14} />
                <span>
                  {d.votes.filter((v) => v.vote === "yes").length} kabul ·{" "}
                  {d.votes.filter((v) => v.vote === "no").length} karşı oy
                </span>
              </div>
            </div>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          icon={GitFork}
          title="Bu görünümde karar yok"
          text="Mesai ilerledikçe öneriler tartışılıp oylanacak."
        />
      )}
    </>
  );
}

function Tasks({ data, openAgent, openArtifact }) {
  return (
    <>
      <SectionHeading
        eyebrow="FİKİRDEN UYGULAMAYA"
        title="Her karar, bir sonraki adım."
        description="Ekip iş bölümü yapar, sorumluluk alır ve ortaya somut bir iş çıkarır."
      />
      <div className="kanban">
        {[
          ["backlog", "Sırada", ""],
          ["in_progress", "Devam ediyor", "amber"],
          ["done", "Tamamlandı", "green"],
        ].map(([id, label, tone]) => (
          <section className={`kanban-column ${tone}`} key={id}>
            <div className="kanban-heading">
              <h2>
                <span className="tiny-dot" />
                {label}
              </h2>
              <span>{data.tasks.filter((t) => t.status === id).length}</span>
            </div>
            <div className="kanban-cards">
              {data.tasks
                .filter((t) => t.status === id)
                .map((t) => {
                  const owner = findAgent(data.agents, t.ownerId),
                    artifact = data.artifacts.find(
                      (a) => a.id === t.artifactId,
                    );
                  return (
                    <article className="task-card" key={t.id}>
                      <div className="task-kicker">
                        <span>{t.type}</span>
                        <span>{t.day}. gün</span>
                      </div>
                      <h3>{t.title}</h3>
                      <div className="task-progress">
                        <div className="meter">
                          <i style={{ width: `${clamp(t.progress)}%` }} />
                        </div>
                        <span>{clamp(t.progress)}%</span>
                      </div>
                      <div className="task-footer">
                        <button
                          className="text-button"
                          onClick={() => owner && openAgent(owner)}
                        >
                          {owner && <Portrait agent={owner} size={27} />}
                          <span>{owner?.name.split(" ")[0] || "Ekip"}</span>
                        </button>
                        {artifact ? (
                          <button
                            className="text-button link"
                            onClick={() => openArtifact(artifact)}
                          >
                            Çıktıyı aç <ArrowUpRight size={14} />
                          </button>
                        ) : id === "done" ? (
                          <CircleCheck size={17} />
                        ) : (
                          <Clock3 size={16} />
                        )}
                      </div>
                    </article>
                  );
                })}
              {!data.tasks.some((t) => t.status === id) && (
                <div className="kanban-empty">
                  {id === "done"
                    ? "Tamamlanan işler burada birikir."
                    : id === "in_progress"
                      ? "Şu an aktif görev yok."
                      : "Yeni fikirler için yer var."}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Artifacts({ data, openArtifact }) {
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const filtered = data.artifacts.filter(
    (a) =>
      (filter === "all" || a.type === filter) &&
      `${a.title} ${a.description}`
        .toLocaleLowerCase("tr")
        .includes(query.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <SectionHeading
        eyebrow="DOSYALARA DÖNÜŞEN FİKİRLER"
        title="Mesai biter. Ürettikleri kalır."
        description="İnceleyebileceğin, indirebileceğin ve geliştirebileceğin gerçek çıktılar. İçerikler deneyin üretimidir."
      />
      <div className="artifact-toolbar">
        <div className="filter-bar">
          {[
            ["all", "Tümü"],
            ["markdown", "Belgeler"],
            ["csv", "Veriler"],
            ["html", "Prototipler"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`filter ${filter === id ? "active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Çıktılarda ara"
            placeholder="Çıktılarda ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="artifact-grid">
        {filtered.map((a) => (
          <ArtifactCard
            key={a.id}
            artifact={a}
            agents={data.agents}
            onOpen={openArtifact}
          />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          icon={Search}
          title="Bu görünümde çıktı bulunamadı"
          text="Aramayı veya dosya türünü değiştirebilirsin."
        />
      )}
    </>
  );
}

function Learning({ data, openAgent }) {
  const memories = data.agents
    .flatMap((a) => a.memories.map((m) => ({ ...m, agent: a })))
    .sort((a, b) => b.day - a.day);
  return (
    <>
      <SectionHeading
        eyebrow="DÜNDEN BİRAZ DAHA İYİ"
        title="Deneyim, şirketin hafızasıdır."
        description="Her sonuç yeni bir iz bırakır. Kaydedilen dersler, sonraki mesainin karar puanlarını etkiler."
      />
      <div className="learning-summary">
        <div>
          <BrainCircuit size={25} />
          <b>{memories.length}</b>
          <span>kaydedilen öğrenim</span>
        </div>
        <div>
          <FlaskConical size={25} />
          <b>{data.experiments.length}</b>
          <span>pazar deneyi</span>
        </div>
        <div>
          <Trophy size={25} />
          <b>{data.achievements.filter((a) => a.unlocked).length}</b>
          <span>kazanılan başarı</span>
        </div>
      </div>
      <div className="section-row">
        <h2>Deney masası</h2>
        <Tag>Sonuçlar simülasyondur</Tag>
      </div>
      <div className="experiment-grid">
        {data.experiments.map((e) => (
          <article className="experiment-card" key={e.id}>
            <div className="experiment-top">
              <FlaskConical size={20} />
              <Tag>{labelStatus(e.status)}</Tag>
            </div>
            <h3>{e.title}</h3>
            <span className="eyebrow">HİPOTEZ</span>
            <p>{e.hypothesis}</p>
            <div className="experiment-result">
              <span>{e.metric}</span>
              <strong>{e.result}</strong>
            </div>
            <p className="lesson">
              <Lightbulb size={17} />
              {e.lesson}
            </p>
          </article>
        ))}
      </div>
      {!data.experiments.length && (
        <Empty
          icon={FlaskConical}
          title="İlk deney hazırlanıyor"
          text="Hipotezler ve sonuçlar tamamlandıkça burada karşılaştırılır."
        />
      )}
      <div className="section-row spaced">
        <h2>Ekibin öğrendikleri</h2>
        <span className="muted">Kalıcı hafıza</span>
      </div>
      <div className="memory-list">
        {memories.slice(0, 40).map((m, i) => (
          <article className="memory-row" key={`${m.agent.id}-${m.id}-${i}`}>
            <button
              className="portrait-button"
              onClick={() => openAgent(m.agent)}
            >
              <Portrait agent={m.agent} size={43} />
            </button>
            <div>
              <span className="memory-meta">
                {m.agent.name} <span>· {m.day}. gün</span>
              </span>
              <h3>{m.lesson}</h3>
              <p>{m.effect}</p>
            </div>
            <BrainCircuit size={18} />
          </article>
        ))}
      </div>
      <div className="section-row spaced">
        <h2>Şirketin kilometre taşları</h2>
      </div>
      <div className="achievement-grid">
        {data.achievements.map((a) => (
          <div
            className={`achievement ${a.unlocked ? "unlocked" : ""}`}
            key={a.id}
          >
            <span>
              {a.unlocked ? <Trophy size={24} /> : <LockKeyhole size={23} />}
            </span>
            <div>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
            </div>
            {a.unlocked && <Check size={17} />}
          </div>
        ))}
      </div>
    </>
  );
}

function About({ data }) {
  return (
    <>
      <SectionHeading
        eyebrow="AÇIK BİR DENEY"
        title="Bir şirket kendi kendine büyür mü?"
        description="MESAİ, Tümay Solak tarafından kurulan bir otonom şirket simülasyonu. Bir yanıt vermekten çok, soruyu görünür kılmak için var."
      />
      <div className="about-manifesto">
        <span>08:00</span>
        <h2>
          Her sabah yeniden.
          <br />
          Bir fikir daha ileri.
        </h2>
        <p>{data.company.mission}</p>
      </div>
      <div className="about-grid">
        <section className="panel about-panel">
          <Users size={24} />
          <h2>Karakterler kurgusal, farklılıkları anlamlı.</h2>
          <p>
            Geçmiş deneyimleri, motivasyonları ve korkuları olan sekiz kurgusal
            persona. Hiçbiri gerçek bir kişinin kopyası değildir. Bu özellikler
            klinik tanı veya psikolojik değerlendirme olarak sunulmaz.
          </p>
        </section>
        <section className="panel about-panel">
          <FolderOpen size={24} />
          <h2>Simülasyonun gerçek çıktıları var.</h2>
          <p>
            Gelir, nakit, müşteriler ve pazar testleri simüle edilir. Belgeler,
            veri dosyaları ve prototipler gerçekten üretilir ve indirilebilir.
            Şirket gerçek para harcamaz, gerçek kişilere mesaj göndermez.
          </p>
        </section>
        <section className="panel about-panel">
          <BrainCircuit size={24} />
          <h2>Öğrenim bir sonraki karara taşınır.</h2>
          <p>
            Kararlar tartışılır ve oylanır. Sonuçlar değerlendirilir, kişisel
            hafızaya kaydedilir. Dersler sonraki kararların puanlanmasına etki
            eder; temel dil modelinin ağırlıkları değiştirilmez.
          </p>
        </section>
        <section className="panel about-panel">
          <ShieldCheck size={24} />
          <h2>Nasıl çalıştığı açıkça görünür.</h2>
          <p>
            Şu anda{" "}
            <strong>
              {data.runtime.mode === "ai"
                ? "yapay zekâ destekli mod"
                : "kurallı simülasyon modu"}
            </strong>{" "}
            çalışıyor.{" "}
            {data.runtime.mode === "ai"
              ? "Model, tanımlı sınırlar içinde öneri ve içerik üretir."
              : "Kararlar ve çıktılar kişilik, hafıza ve tanımlı kurallarla üretiliyor. Canlı dil modeli çağrısı yapılmıyor."}{" "}
            Her gün İstanbul saatiyle 08.00'de yeni mesai başlar.
          </p>
        </section>
      </div>
      <p className="about-credit">
        Tümay Solak'ın bağımsız kişisel projesidir. Herhangi bir işveren adına
        yürütülmez.
      </p>
    </>
  );
}

function AgentModal({ agent, onClose }) {
  return (
    <Modal
      title={agent.name}
      eyebrow={`${agent.role} · ${agent.department}`}
      onClose={onClose}
    >
      <div className="persona-hero">
        <Portrait agent={agent} size={98} />
        <div>
          <Tag tone="green">Seviye {agent.level}</Tag>
          <strong>
            {number(agent.xp)} <span>deneyim puanı</span>
          </strong>
          <div className="traits">
            {agent.traits.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="persona-label">
        <Info size={14} />
        Bu karakter kurgusaldır; klinik bir profil değildir.
      </div>
      <div className="persona-story">
        <span className="eyebrow">ONU BUGÜNE GETİREN HİKÂYE</span>
        <p>{agent.backstory}</p>
      </div>
      <div className="persona-drivers">
        <div>
          <Target size={18} />
          <h3>Peşinden gittiği</h3>
          <p>{agent.motivation}</p>
        </div>
        <div>
          <ShieldCheck size={18} />
          <h3>Çekindiği</h3>
          <p>{agent.fear}</p>
        </div>
      </div>
      <div className="persona-current">
        <span className="eyebrow">SON GÖREVİ</span>
        <p>{agent.task || "Yeni mesaiyi bekliyor."}</p>
        <div className="traits">
          {agent.skills.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      </div>
      <div className="persona-bars">
        <div>
          <span>
            Enerji <b>%{clamp(agent.energy)}</b>
          </span>
          <div className="meter">
            <i style={{ width: `${clamp(agent.energy)}%` }} />
          </div>
        </div>
        <div>
          <span>
            Moral <b>%{clamp(agent.morale)}</b>
          </span>
          <div className="meter">
            <i style={{ width: `${clamp(agent.morale)}%` }} />
          </div>
        </div>
      </div>
      <div className="section-row spaced">
        <h3>Kişisel hafıza</h3>
        <Tag>{agent.memories.length} öğrenim</Tag>
      </div>
      <div className="persona-memories">
        {agent.memories.length ? (
          [...agent.memories].reverse().map((m) => (
            <div className="persona-memory" key={m.id}>
              <span>
                {m.day}.<small>GÜN</small>
              </span>
              <div>
                <h4>{m.lesson}</h4>
                <p>{m.effect}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            İlk mesaiyle birlikte kendi öğrenme günlüğünü oluşturacak.
          </p>
        )}
      </div>
    </Modal>
  );
}

function DecisionModal({ decision, agents, onClose }) {
  return (
    <Modal
      title={decision.title}
      eyebrow={`KARAR ODASI · ${decision.day}. GÜN`}
      onClose={onClose}
      wide
    >
      <div className="decision-modal-summary">
        <Tag tone={decision.status === "rejected" ? "red" : "green"}>
          {labelStatus(decision.status)}
        </Tag>
        <p>{decision.summary}</p>
      </div>
      <div className="rationale">
        <Lightbulb size={22} />
        <div>
          <h3>Neden bu karar?</h3>
          <p>{decision.rationale}</p>
        </div>
      </div>
      <div className="decision-impact">
        <div>
          <span className="eyebrow">BEKLENEN ETKİ</span>
          <p>{decision.expectedImpact}</p>
        </div>
        <div>
          <span className="eyebrow">GERÇEKLEŞEN SONUÇ · SİMÜLASYON</span>
          <p>{decision.result || "Sonuç henüz oluşmadı."}</p>
        </div>
      </div>
      <div className="section-row spaced">
        <h3>Masadaki sesler</h3>
        <Tag>{decision.votes.length} oy</Tag>
      </div>
      <div className="vote-list">
        {decision.votes.map((v) => {
          const agent = findAgent(agents, v.agentId);
          return (
            <article className="vote-row" key={v.agentId}>
              <Portrait agent={agent} size={40} />
              <div>
                <strong>
                  {agent?.name || "Ekip üyesi"} <span>{agent?.role}</span>
                </strong>
                <p>{v.reason}</p>
              </div>
              <Tag tone={v.vote === "yes" ? "green" : "red"}>
                {v.vote === "yes" ? "Kabul" : "Karşı"}
              </Tag>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}

function Markdown({ content }) {
  return (
    <div className="markdown-preview">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h4 key={i}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i}>{line.slice(2)}</h2>;
        if (/^[-*] /.test(line))
          return (
            <p className="md-list" key={i}>
              <span>•</span>
              {line.slice(2)}
            </p>
          );
        if (!line.trim()) return <div className="md-space" key={i} />;
        return <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
      })}
    </div>
  );
}
function ArtifactModal({ artifact, onClose }) {
  return (
    <Modal
      title={artifact.title}
      eyebrow={`GERÇEK ÇIKTI · ${artifact.day}. GÜN`}
      onClose={onClose}
      wide
    >
      <div className="artifact-modal-toolbar">
        <p>{artifact.description}</p>
        <a
          className="button button-dark"
          href={`/api/artifacts/${encodeURIComponent(artifact.id)}`}
          download
        >
          <Download size={15} />
          İndir .{artifact.type === "markdown" ? "md" : artifact.type}
        </a>
      </div>
      <div className={`artifact-preview preview-${artifact.type}`}>
        {artifact.type === "html" ? (
          <iframe
            title={`${artifact.title} güvenli önizlemesi`}
            sandbox="allow-scripts"
            src={`/api/artifacts/${encodeURIComponent(artifact.id)}/preview`}
            referrerPolicy="no-referrer"
          />
        ) : artifact.type === "markdown" ? (
          <Markdown content={artifact.content} />
        ) : (
          <pre>{artifact.content}</pre>
        )}
      </div>
      <div className="preview-note">
        <Info size={14} />
        Bu içerik şirket simülasyonunun bir çıktısıdır. Veriler ve ticari
        sonuçlar simüle edilmiştir.
      </div>
    </Modal>
  );
}

function OwnerModal({
  onClose,
  token,
  setToken,
  admin,
  setAdmin,
  runtime,
  refresh,
}) {
  const [value, setValue] = useState(token || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  async function check(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${value}` },
      });
      if (!response.ok)
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Yönetici anahtarı doğrulanamadı."
            : "Bağlantı kurulamadı. Tekrar dene.",
        );
      setToken(value);
      setAdmin(true);
      try {
        sessionStorage.setItem("mesai-owner-token", value);
      } catch {}
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function action(path, body) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) setAdmin(false);
        throw new Error(
          response.status === 409
            ? "Bir mesai zaten çalışıyor veya bu gün tamamlandı."
            : "İşlem tamamlanamadı. Anahtarı ve çalışma durumunu kontrol et.",
        );
      }
      setSuccess(
        path === "run"
          ? "Yeni mesai başlatıldı. Gelişmeleri akıştan izleyebilirsin."
          : body.paused
            ? "Otomatik mesai duraklatıldı."
            : "Otomatik mesai devam ediyor.",
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    setAdmin(false);
    setToken("");
    setValue("");
    try {
      sessionStorage.removeItem("mesai-owner-token");
    } catch {}
  }
  return (
    <Modal
      title="Kurucu alanı"
      eyebrow="YALNIZCA ŞİRKET SAHİBİ"
      onClose={onClose}
    >
      {admin ? (
        <div className="owner-content">
          <div className="owner-verified">
            <ShieldCheck size={22} />
            <div>
              <h3>Yönetici erişimi doğrulandı</h3>
              <p>Mesainin zamanlamasını buradan yönetebilirsin.</p>
            </div>
          </div>
          <div className="owner-status">
            <span>Şu an</span>
            <Tag>{labelStatus(runtime.status)}</Tag>
          </div>
          <div className="owner-actions">
            <button
              className="button button-dark"
              disabled={
                busy ||
                runtime.status === "running" ||
                runtime.status === "paused"
              }
              onClick={() => action("run", {})}
            >
              <Play size={16} />
              Şimdi bir mesai başlat
            </button>
            <button
              className="button button-outline"
              disabled={busy}
              onClick={() =>
                action("pause", { paused: runtime.status !== "paused" })
              }
            >
              {runtime.status === "paused" ? (
                <Play size={16} />
              ) : (
                <Pause size={16} />
              )}
              {runtime.status === "paused"
                ? "Zamanlamayı devam ettir"
                : "Zamanlamayı duraklat"}
            </button>
          </div>
          <p className="owner-note">
            Bu işlem gerçek şirket kaydını günceller. Her mesai karar, görev ve
            çıktı oluşturur. AI modu açıksa günlük çağrı sınırı geçerlidir.
          </p>
          <button className="text-button muted" onClick={logout}>
            <LogOut size={15} /> Yönetici oturumunu kapat
          </button>
        </div>
      ) : (
        <form className="owner-form" onSubmit={check}>
          <p>
            İzleyici alanı herkese açık. Mesaiyi yönetmek için özel yönetici
            anahtarını gir.
          </p>
          <label htmlFor="owner-token">Yönetici anahtarı</label>
          <input
            id="owner-token"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            placeholder="Özel anahtarın"
            required
          />
          <button
            className="button button-dark"
            disabled={busy || !value.trim()}
          >
            <LockKeyhole size={16} />
            {busy ? "Doğrulanıyor…" : "Güvenli giriş"}
          </button>
          <p className="owner-note">
            Anahtar yalnızca bu tarayıcı sekmesinin oturumunda tutulur,
            bağlantıya eklenmez.
          </p>
        </form>
      )}
      {error && (
        <div className="form-message error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="form-message success" role="status">
          {success}
        </div>
      )}
    </Modal>
  );
}

function normalizeState(raw) {
  // The server is the source of truth; normalization only protects list rendering during startup.
  for (const key of ["company", "runtime", "config"])
    if (!raw[key] || typeof raw[key] !== "object")
      throw new Error("Şirket verisi henüz hazır değil.");
  return {
    ...raw,
    agents: (raw.agents || []).map((a) => ({
      ...a,
      memories: a.memories || [],
      traits: a.traits || [],
      skills: a.skills || [],
    })),
    decisions: (raw.decisions || []).map((d) => ({
      ...d,
      votes: d.votes || [],
    })),
    tasks: raw.tasks || [],
    events: raw.events || [],
    artifacts: raw.artifacts || [],
    history: raw.history || [],
    experiments: raw.experiments || [],
    achievements: raw.achievements || [],
  };
}

export default function App() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => {
    const id = window.location.hash.slice(1);
    return [...NAV.map((n) => n.id), "about", "activity"].includes(id)
      ? id
      : "overview";
  });
  const [mobileOpen, setMobileOpen] = useState(false),
    [agentModal, setAgentModal] = useState(null),
    [artifactModal, setArtifactModal] = useState(null),
    [decisionModal, setDecisionModal] = useState(null),
    [officeOpen, setOfficeOpen] = useState(false),
    [ownerOpen, setOwnerOpen] = useState(false);
  const [now, setNow] = useState(Date.now()),
    [replay, setReplay] = useState(false),
    [replayEvents, setReplayEvents] = useState([]),
    [replayCursor, setReplayCursor] = useState(0);
  const [admin, setAdmin] = useState(false),
    [token, setToken] = useState(() => {
      try {
        return sessionStorage.getItem("mesai-owner-token") || "";
      } catch {
        return "";
      }
    });
  const fetching = useRef(false),
    mounted = useRef(true),
    controller = useRef(null),
    feedRef = useRef(null);
  async function refresh() {
    if (fetching.current) return;
    fetching.current = true;
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 10000);
    try {
      const response = await fetch("/api/state", {
        signal: controller.current.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Ofise bağlantı kurulamadı.");
      const next = normalizeState(await response.json());
      if (mounted.current) {
        setData(next);
        setError("");
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e.name === "AbortError"
            ? "Bağlantı beklenenden uzun sürdü. Yeniden bağlanılıyor."
            : "Ofise bağlantı kesildi. Son veriler gösteriliyor; yeniden bağlanılıyor.",
        );
    } finally {
      clearTimeout(timer);
      fetching.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    refresh();
    const poll = setInterval(refresh, 4000),
      clock = setInterval(() => setNow(Date.now()), 1000);
    const onHash = () => {
      const id = window.location.hash.slice(1);
      setPage(
        [...NAV.map((n) => n.id), "about", "activity"].includes(id)
          ? id
          : "overview",
      );
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      clearInterval(clock);
      controller.current?.abort();
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch("/api/admin/check", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (alive) setAdmin(r.ok);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);
  useEffect(() => {
    if (!replay || replayCursor >= replayEvents.length) return;
    const timer = setTimeout(() => setReplayCursor((n) => n + 1), 1550);
    return () => clearTimeout(timer);
  }, [replay, replayCursor, replayEvents.length]);
  function navigate(id) {
    setPage(id);
    window.location.hash = id;
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startReplay() {
    const list = [...(data?.events || [])].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    setReplayEvents(list.slice(-24));
    setReplayCursor(1);
    setReplay(true);
  }
  const allEvents = [...(data?.events || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const shownEvents = replay
    ? replayEvents.slice(0, replayCursor).reverse()
    : allEvents;
  const nextMs = data?.runtime.nextRunAt
    ? Math.max(0, new Date(data.runtime.nextRunAt).getTime() - now)
    : 0;
  const nextText = !data?.runtime.nextRunAt
    ? "—"
    : nextMs > 0
      ? `${Math.floor(nextMs / 3600000)
          .toString()
          .padStart(2, "0")}:${Math.floor((nextMs % 3600000) / 60000)
          .toString()
          .padStart(2, "0")}:${Math.floor((nextMs % 60000) / 1000)
          .toString()
          .padStart(2, "0")}`
      : data.runtime.status === "running"
        ? "başladı"
        : "bekleniyor";
  const section =
    NAV.find((n) => n.id === page)?.label ||
    (page === "activity" ? "Ofisten haberler" : "Deney hakkında");
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="MESAİ ana sayfa"
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            MESAİ<span className="brand-period">.</span>
          </span>
        </button>
        <div className="brand-subtitle">Otonom şirket laboratuvarı</div>
        <div className="workspace-switch">
          <span className="workspace-icon">
            M<span>↗</span>
          </span>
          <div>
            <strong>MESAİ Labs</strong>
            <span>Bağımsız girişim stüdyosu</span>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-label">ŞİRKETİ KEŞFET</span>
        <nav aria-label="Ana gezinme">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`nav-item ${page === id ? "nav-active" : ""}`}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              {id === "artifacts" && data?.artifacts.length > 0 && (
                <span className="nav-count">{data.artifacts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="next-shift">
            <div>
              <span className="sun-symbol">☀</span>
              <span>BİR SONRAKİ MESAİ</span>
            </div>
            <strong>
              {data?.runtime.status === "paused" ? "Beklemede" : "08.00"}
              <span>İstanbul</span>
            </strong>
            <p>
              {data?.runtime.status === "paused"
                ? "Kurucu zamanlamayı duraklattı."
                : "Yeni bir gün. Yeni olasılıklar."}
            </p>
            <div className="shift-track">
              <i
                style={{
                  width: data
                    ? `${clamp((1 - nextMs / 86400000) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <button
            className={`nav-item ${page === "about" ? "nav-active" : ""}`}
            onClick={() => navigate("about")}
          >
            <Info size={18} strokeWidth={1.6} />
            <span>Bu deney hakkında</span>
            <ArrowUpRight size={14} />
          </button>
          <button className="founder" onClick={() => setOwnerOpen(true)}>
            <span className="founder-avatar">TS</span>
            <span>
              <strong>Tümay Solak</strong>
              <small>
                {admin
                  ? "Kurucu · yönetici erişimi"
                  : "Kurucu & deney tasarımcısı"}
              </small>
            </span>
            <LockKeyhole size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Gezinme menüsünü aç"
            >
              <Menu size={20} />
            </button>
            <span>MESAİ Labs</span>
            <ChevronRight size={13} />
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date(now).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Istanbul",
              })}
            </span>
            <div className="observer-label">
              <span className="tiny-dot" />
              İzleyici modu
            </div>
            <button
              className="icon-button info-button"
              aria-label="Deney hakkında"
              onClick={() => navigate("about")}
            >
              <Info size={17} />
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="mode-strip">
            <span>
              <span
                className={`tiny-dot ${data?.runtime.mode === "ai" ? "pulse" : ""}`}
              />
              {data
                ? data.runtime.mode === "ai"
                  ? "Yapay zekâ destekli"
                  : "Kurallı simülasyon"
                : "Ofise bağlanılıyor"}
            </span>
            <span className="mode-explanation">
              {data?.runtime.mode === "ai"
                ? "AI önerileri · kalıcı hafıza · gerçek dosyalar"
                : "Kişilikler + hafıza + kurallar · gerçek dosyalar"}
            </span>
            <button className="text-button" onClick={() => navigate("about")}>
              Nasıl çalışıyor? <ArrowUpRight size={12} />
            </button>
          </div>
          {data?.runtime.error && (
            <div className="runtime-warning" role="status">
              {data.runtime.error}
            </div>
          )}
          {error && (
            <div className="connection-error" role="alert">
              <Info size={17} />
              <span>{error}</span>
              <button className="text-button" onClick={refresh}>
                <RefreshCw size={14} />
                Tekrar dene
              </button>
            </div>
          )}
          {loading && !data ? (
            <div className="loading-screen">
              <span className="loading-logo">M.</span>
              <h1>Ofisin kapıları açılıyor.</h1>
              <p>Ekibin son mesaisine bağlanıyoruz.</p>
              <div className="loading-bar">
                <i />
              </div>
            </div>
          ) : !data ? (
            <Empty
              icon={Coffee}
              title="Ofise şu an ulaşılamıyor"
              text="Bağlantı otomatik olarak yeniden denenecek. Yukarıdaki düğmeyle de tekrar deneyebilirsin."
            />
          ) : (
            <div className="page-content" key={page}>
              {replay && (
                <div className="replay-strip" role="status">
                  <span>
                    <Play size={13} fill="currentColor" />
                    <strong>Demo tekrar oynatılıyor</strong>{" "}
                    <span>
                      {replayCursor}/{replayEvents.length} kayıt ·{" "}
                      {replayCursor >= replayEvents.length
                        ? "Tekrar tamamlandı"
                        : "Geçmiş etkinlikler"}
                    </span>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setReplay(false)}
                  >
                    Güncel duruma dön <X size={14} />
                  </button>
                </div>
              )}
              {page === "overview" && (
                <Overview
                  data={data}
                  openAgent={setAgentModal}
                  openArtifact={setArtifactModal}
                  openDecision={setDecisionModal}
                  navigate={navigate}
                  events={shownEvents}
                  replay={replay}
                  startReplay={startReplay}
                  stopReplay={() => setReplay(false)}
                  nextText={nextText}
                  setOfficeOpen={setOfficeOpen}
                />
              )}
              {page === "team" && (
                <Team data={data} openAgent={setAgentModal} />
              )}
              {page === "decisions" && (
                <Decisions data={data} openDecision={setDecisionModal} />
              )}
              {page === "tasks" && (
                <Tasks
                  data={data}
                  openAgent={setAgentModal}
                  openArtifact={setArtifactModal}
                />
              )}
              {page === "artifacts" && (
                <Artifacts data={data} openArtifact={setArtifactModal} />
              )}
              {page === "learning" && (
                <Learning data={data} openAgent={setAgentModal} />
              )}
              {page === "about" && <About data={data} />}
              {page === "activity" && (
                <>
                  <SectionHeading
                    eyebrow="ŞİRKETİN GÜNLÜĞÜ"
                    title="Ofiste olan biten."
                    description="Öneriler, karşı görüşler, tamamlanan işler ve öğrenilen dersler. Her adım kayıt altında."
                  />
                  <section className="panel full-activity">
                    <EventFeed
                      events={shownEvents}
                      agents={data.agents}
                      replay={replay}
                    />
                  </section>
                </>
              )}
            </div>
          )}
          <footer className="page-footer">
            <span>
              MESAİ <span>© 2026</span>
            </span>
            <p>
              Karakterler ve ticari sonuçlar kurgusal. Üretilen dosyalar gerçek.
            </p>
            <span>
              Merakla kuruldu. <span className="footer-flower">✳</span>
            </span>
          </footer>
        </main>
      </div>
      {agentModal && (
        <AgentModal
          agent={data?.agents.find((a) => a.id === agentModal.id) || agentModal}
          onClose={() => setAgentModal(null)}
        />
      )}
      {artifactModal && (
        <ArtifactModal
          artifact={artifactModal}
          onClose={() => setArtifactModal(null)}
        />
      )}
      {decisionModal && (
        <DecisionModal
          decision={decisionModal}
          agents={data?.agents || []}
          onClose={() => setDecisionModal(null)}
        />
      )}
      {officeOpen && data && (
        <Modal
          title="MESAİ Labs, kuş bakışı"
          eyebrow="BİR KARAKTERE TIKLA, HİKÂYESİNİ KEŞFET"
          onClose={() => setOfficeOpen(false)}
          wide
        >
          <Office
            agents={data.agents}
            activeId={
              replay || data.runtime.status === "running"
                ? shownEvents[0]?.agentId
                : null
            }
            openAgent={(a) => {
              setOfficeOpen(false);
              setAgentModal(a);
            }}
            running={replay || data.runtime.status === "running"}
          />
        </Modal>
      )}
      {ownerOpen && data && (
        <OwnerModal
          onClose={() => setOwnerOpen(false)}
          token={token}
          setToken={setToken}
          admin={admin}
          setAdmin={setAdmin}
          runtime={data.runtime}
          refresh={refresh}
        />
      )}
    </div>
  );
}
