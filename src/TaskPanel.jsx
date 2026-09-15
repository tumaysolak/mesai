import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, X } from "lucide-react";
import Markdown from "./Markdown.jsx";
import { DEPARTMENTS, deptOf } from "./Office.jsx";

const STATUS_LABEL = {
  backlog: "SIRADA",
  in_progress: "ÇALIŞILIYOR",
  done: "BİTTİ",
  waiting: "ONAY BEKLİYOR",
};

// Decisions the board has not settled are work too: they are the shift's
// "waiting on approval" column, so the panel counts them alongside tasks.
export function buildItems(tasks = [], decisions = [], agents = []) {
  const byId = new Map(agents.map((a) => [a.id, a]));
  const rows = tasks.map((task) => {
    const owner = byId.get(task.ownerId);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      progress: task.progress ?? 0,
      day: task.day,
      owner,
      dept: owner ? DEPARTMENTS.find((d) => d.id === deptOf(owner)) : null,
      artifactId: task.artifactId,
    };
  });
  const waiting = decisions
    .filter((d) => d.status === "pending")
    .map((d) => {
      const owner = byId.get(d.agentId || d.ownerId);
      return {
        id: d.id,
        title: d.title,
        status: "waiting",
        progress: 0,
        day: d.day,
        owner,
        dept: owner ? DEPARTMENTS.find((x) => x.id === deptOf(owner)) : null,
        decision: true,
      };
    });
  return [...waiting, ...rows];
}

function Row({ item }) {
  return (
    <article className={`ao-task ao-task-${item.status}`}>
      <span className="ao-task-tag">{STATUS_LABEL[item.status]}</span>
      <div>
        <h4>{item.title}</h4>
        <p>
          {item.owner ? item.owner.role.toLocaleUpperCase("tr-TR") : "EKİP"}
          {item.dept ? ` · ${item.dept.name}` : ""}
          {item.day ? ` · ${item.day}. MESAİ` : ""}
        </p>
        {item.status === "in_progress" && (
          <span className="ao-task-bar">
            <span className="ao-track">
              <i style={{ width: `${Math.max(6, item.progress)}%` }} />
            </span>
            <b>%{item.progress}</b>
          </span>
        )}
      </div>
      {item.status === "done" && (
        <span className="ao-task-check">
          <Check size={12} />
        </span>
      )}
    </article>
  );
}

// The composer is the one place a visitor can put work into the building. It
// posts to the same endpoint the product page uses, so the daily limit and the
// honest "this is a side job" rule still apply.
function Composer({ departments, onResult }) {
  const [dept, setDept] = useState(departments[0]?.id || "urun");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const menu = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (menu.current && !menu.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const active = departments.find((d) => d.id === dept) || departments[0];
  async function submit(event) {
    event.preventDefault();
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/visitor/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: `${active ? active.name + ": " : ""}${brief.trim()}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İş şu an üretilemedi.");
      onResult(data.work);
      setBrief("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="ao-composer" onSubmit={submit}>
      <div className="ao-composer-dept" ref={menu}>
        <button type="button" onClick={() => setOpen((v) => !v)}>
          <i style={{ background: active?.color }} />
          {active?.name}
          <u>▾</u>
        </button>
        {open && (
          <div className="ao-composer-menu">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDept(d.id);
                  setOpen(false);
                }}
              >
                <i style={{ background: d.color }} />
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={`${active ? active.name.toLocaleLowerCase("tr-TR") : "ekip"} için bir iş yaz…`}
        maxLength={280}
        aria-label="Ekibe iş ver"
      />
      <button
        type="submit"
        className="ao-composer-send"
        disabled={busy || !brief.trim()}
        aria-label="Gönder"
      >
        {busy ? <i className="ao-spin" /> : <ArrowUp size={16} />}
      </button>
      {error && <p className="ao-composer-error">{error}</p>}
    </form>
  );
}

export default function TaskPanel({
  tasks,
  decisions,
  agents,
  focus,
  setFocus,
}) {
  const [filter, setFilter] = useState("all");
  const [work, setWork] = useState(null);
  const items = useMemo(
    () => buildItems(tasks, decisions, agents),
    [tasks, decisions, agents],
  );
  const scoped = focus ? items.filter((i) => i.dept?.id === focus) : items;
  const counts = {
    all: scoped.length,
    backlog: scoped.filter((i) => i.status === "backlog").length,
    in_progress: scoped.filter((i) => i.status === "in_progress").length,
    waiting: scoped.filter((i) => i.status === "waiting").length,
    done: scoped.filter((i) => i.status === "done").length,
  };
  const shown =
    filter === "all" ? scoped : scoped.filter((i) => i.status === filter);
  const chips = [
    ["all", "TÜMÜ"],
    ["backlog", "SIRADA"],
    ["in_progress", "ÇALIŞILIYOR"],
    ["waiting", "ONAY"],
    ["done", "BİTTİ"],
  ];
  return (
    <aside className="ao-panel">
      <Composer departments={DEPARTMENTS} onResult={setWork} />
      {work && (
        <div className="ao-work">
          <button
            className="ao-work-close"
            onClick={() => setWork(null)}
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
          <span className="ao-work-tag">
            {work.mode === "ai" ? "YAPAY ZEKÂ YANITI" : "KURALLAR MOTORU"}
          </span>
          <h4>{work.title}</h4>
          <p>{work.summary}</p>
          <div className="ao-work-body">
            <Markdown content={work.deliverable} />
          </div>
        </div>
      )}
      <div className="ao-panel-head">
        <h2>GÖREV DURUMU</h2>
        <button
          className={`ao-scope ${focus ? "is-scoped" : ""}`}
          onClick={() => setFocus(null)}
        >
          {focus
            ? DEPARTMENTS.find((d) => d.id === focus)?.name
            : "TÜM OFİS"}
        </button>
      </div>
      <div className="ao-chips">
        {chips.map(([id, label]) => (
          <button
            key={id}
            className={`ao-chip ${filter === id ? "is-on" : ""} ${id === "waiting" ? "is-warn" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label} <b>{counts[id]}</b>
          </button>
        ))}
      </div>
      <div className="ao-task-list">
        {shown.length ? (
          shown.slice(0, 60).map((item) => <Row key={item.id} item={item} />)
        ) : (
          <p className="ao-panel-empty">
            Bu başlıkta iş yok. Mesai 08.00'de yeniden açılıyor.
          </p>
        )}
      </div>
    </aside>
  );
}

// The full-screen board is the same work in columns, the way the team would
// pin it to a wall at the end of a shift.
export function TodayBoard({ tasks, decisions, agents, day, onClose }) {
  const items = buildItems(tasks, decisions, agents);
  const columns = [
    ["backlog", "SIRADA"],
    ["in_progress", "ÇALIŞILIYOR"],
    ["waiting", "ONAY BEKLİYOR"],
    ["done", "BİTTİ"],
  ];
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    // The board covers the screen, so the page behind it should hold still.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return (
    <div className="ao-board" role="dialog" aria-label="Bugünün panosu">
      <header>
        <div>
          <h2>MESAI OFİS</h2>
          <span>{day}. mesainin panosu</span>
        </div>
        <div className="ao-board-counts">
          {columns.map(([id, label]) => (
            <span key={id}>
              {label} <b>{items.filter((i) => i.status === id).length}</b>
            </span>
          ))}
        </div>
        <button onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>
      </header>
      <div className="ao-board-cols">
        {columns.map(([id, label]) => {
          const list = items.filter((i) => i.status === id);
          return (
            <section key={id} className={`ao-col ao-col-${id}`}>
              <h3>
                {label} <b>{list.length}</b>
              </h3>
              <div>
                {list.map((item) => (
                  <article key={item.id} className="ao-board-card">
                    <h4>{item.title}</h4>
                    <p>
                      <i style={{ background: item.dept?.color || "#8b8f99" }} />
                      {item.owner
                        ? item.owner.role.toLocaleUpperCase("tr-TR")
                        : "EKİP"}
                    </p>
                    {id === "in_progress" && (
                      <span className="ao-task-bar">
                        <span className="ao-track">
                          <i style={{ width: `${Math.max(6, item.progress)}%` }} />
                        </span>
                        <b>%{item.progress}</b>
                      </span>
                    )}
                  </article>
                ))}
                {!list.length && (
                  <p className="ao-col-empty">Bu sütunda iş yok.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
