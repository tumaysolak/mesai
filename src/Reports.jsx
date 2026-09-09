import { useEffect, useState } from "react";
import Markdown from "./Markdown.jsx";
import {
  CalendarDays,
  ChevronRight,
  Download,
  Loader2,
  Sunrise,
  Sunset,
} from "lucide-react";

const number = (value) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
const money = (value) => `₺${number(value)}`;
const dateLabel = (value) => {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00+03:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsed);
};

// Every shift leaves two records on the site: the morning plan and the closing report.
export default function Reports({ openArtifact, artifacts = [] }) {
  const [list, setList] = useState(null),
    [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/reports?limit=60")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const rows = data.reports || [];
        setList(rows);
        if (rows.length) setSelected(rows[0].day);
      })
      .catch(() => alive && setError("Rapor arşivine ulaşılamadı."));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (selected == null) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/reports/${selected}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => alive && setDetail(data))
      .catch(() => alive && setError("Bu günün raporu açılamadı."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selected]);

  if (list && !list.length)
    return (
      <div className="empty">
        <span>
          <CalendarDays size={26} />
        </span>
        <h3>Arşiv henüz boş</h3>
        <p>
          İlk mesai tamamlandığında sabah planı ve gün sonu raporu buraya
          kalıcı olarak yazılacak.
        </p>
      </div>
    );

  const summary = detail?.summary || {};
  const dayArtifacts = (summary.artifacts || []).length
    ? summary.artifacts
    : artifacts.filter((a) => a.day === detail?.day);

  return (
    <div className="reports-layout">
      <aside className="report-index">
        <span className="eyebrow">ARŞİV</span>
        {(list || []).map((row) => (
          <button
            key={row.day}
            className={`report-row ${row.day === selected ? "report-row-active" : ""}`}
            onClick={() => setSelected(row.day)}
          >
            <strong>{row.day}. mesai</strong>
            <span>{dateLabel(row.date)}</span>
            <small>{row.work || "Gün sürüyor"}</small>
            <em className={row.closed ? (row.success ? "ok" : "no") : "live"}>
              {row.closed
                ? row.success
                  ? "sonuç alındı"
                  : "sonuç alınamadı"
                : "sürüyor"}
            </em>
          </button>
        ))}
        {!list && (
          <p className="report-loading">
            <Loader2 size={14} className="spin" /> Arşiv yükleniyor
          </p>
        )}
      </aside>
      <div className="report-detail">
        {error && <div className="report-error">{error}</div>}
        {loading && !detail ? (
          <p className="report-loading">
            <Loader2 size={14} className="spin" /> Rapor açılıyor
          </p>
        ) : detail ? (
          <>
            <div className="report-head">
              <span className="eyebrow">
                {detail.day}. MESAI · {dateLabel(detail.date)}
              </span>
              <h2>{detail.work || "Gün henüz sürüyor"}</h2>
              <p>
                Faaliyet alanı {detail.focus}
                {summary.condition ? ` · ${summary.condition}` : ""}
                {summary.decision ? ` · Karar: ${summary.decision}` : ""}
                {summary.votes
                  ? ` (${summary.votes.yes}/${summary.votes.total} destek)`
                  : ""}
              </p>
            </div>
            <section className="panel report-block">
              <div className="panel-heading">
                <div>
                  <Sunrise size={17} />
                  <h3>Bugün ne yapacaklar</h3>
                </div>
                <span className="report-time">08.15 · günlük toplantı</span>
              </div>
              {detail.plan.length ? (
                <table className="report-plan">
                  <tbody>
                    {detail.plan.map((item, i) => (
                      <tr key={i}>
                        <th>
                          {item.name}
                          <small>{item.role}</small>
                        </th>
                        <td>{item.line}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="report-muted">
                  Bu güne ait plan kaydı yok. Plan her mesai 08.15'te yazılır.
                </p>
              )}
            </section>
            <section className="panel report-block">
              <div className="panel-heading">
                <div>
                  <Sunset size={17} />
                  <h3>Gün sonu ne yaptılar</h3>
                </div>
                <span className="report-time">17.00 · kapanış</span>
              </div>
              {detail.closedAt ? (
                <>
                  <div className="report-figures">
                    <div>
                      <span>Pilot geliri</span>
                      <strong>{money(summary.pilotRevenue)}</strong>
                    </div>
                    <div>
                      <span>Bakım geliri</span>
                      <strong>{money(summary.retainer)}</strong>
                    </div>
                    <div>
                      <span>Deney bütçesi</span>
                      <strong className="minus">
                        -{money(summary.experimentCost)}
                      </strong>
                    </div>
                    <div>
                      <span>Bordro</span>
                      <strong className="minus">-{money(summary.payroll)}</strong>
                    </div>
                    <div>
                      <span>Günün neti</span>
                      <strong className={summary.net >= 0 ? "plus" : "minus"}>
                        {money(summary.net)}
                      </strong>
                    </div>
                    <div>
                      <span>Kasa</span>
                      <strong>{money(summary.cash)}</strong>
                    </div>
                  </div>
                  {summary.lesson && (
                    <p className="report-lesson">
                      <b>Günün dersi:</b> {summary.lesson}
                    </p>
                  )}
                  <Markdown content={detail.report} />
                  {dayArtifacts.length > 0 && (
                    <div className="report-files">
                      <span className="eyebrow">O GÜN ÜRETİLEN DOSYALAR</span>
                      {dayArtifacts.map((file) => (
                        <button
                          key={file.id}
                          className="report-file"
                          onClick={() =>
                            openArtifact?.(
                              artifacts.find((a) => a.id === file.id) || file,
                            )
                          }
                        >
                          <Download size={14} />
                          <span>{file.title}</span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="report-muted">
                  Mesai henüz bitmedi. Gün sonu raporu 17.00'de bu bölüme
                  yazılır ve abonelere e-postayla gider.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
