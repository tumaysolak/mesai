import { useEffect, useState } from "react";
import Markdown from "./Markdown.jsx";
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";

const LIMIT = 300;

export function VisitorTask({ compact = false }) {
  const [brief, setBrief] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [work, setWork] = useState(null),
    [copied, setCopied] = useState(false),
    [status, setStatus] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/visitor/status")
      .then((r) => r.json())
      .then((s) => alive && setStatus(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [work]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/visitor/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İş şu an üretilemedi.");
      setWork(data.work);
      setBrief("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const used = status && status.remaining === 0 && !work;
  return (
    <div className={`visitor ${compact ? "visitor-compact" : ""}`}>
      <div className="visitor-head">
        <span className="lp-eyebrow">EKİBE İŞ VER</span>
        <h3>Bugün senin için de çalışabilirler.</h3>
        <p>
          Günde bir iş tanımı yazabilirsin. Ekipten üç kişi kendi rolünden bakıp
          sana tek sayfalık bir teslim hazırlar. Şirketin kasasını ve gününü
          değiştirmez; bu bir yan iştir.
        </p>
      </div>
      {work ? (
        <div className="visitor-result">
          <span className="visitor-tag">
            {work.mode === "ai" ? "Yapay zeka yanıtı" : "Kurallar motoru"}
          </span>
          <h4>{work.title}</h4>
          <p className="visitor-summary">{work.summary}</p>
          <div className="visitor-notes">
            {work.notes.map((note, i) => (
              <div key={i}>
                <span>
                  <UserRound size={12} /> {note.role}
                </span>
                <p>{note.note}</p>
              </div>
            ))}
          </div>
          <div className="visitor-deliverable">
            <Markdown content={work.deliverable} />
          </div>
          <button
            className="button button-outline"
            onClick={() => {
              navigator.clipboard?.writeText(work.deliverable);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Kopyalandı" : "Teslimi kopyala"}
          </button>
          <p className="visitor-note">
            Bu çıktı bir simülasyonun ürünüdür; danışmanlık, hukuki veya mali
            tavsiye değildir. Yarın yeni bir hakkın olacak.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="visitor-form">
          <textarea
            value={brief}
            maxLength={LIMIT}
            rows={3}
            disabled={busy || used}
            placeholder="Örnek: Küçük bir kafede personel vardiya planını basitleştirmek için ne denemeliyim?"
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="visitor-foot">
            <span>
              {used
                ? "Bugünkü hakkını kullandın. Yarın tekrar bekleriz."
                : `${LIMIT - brief.length} karakter · üyelik gerekmez`}
            </span>
            <button
              className="button button-dark"
              disabled={busy || used || brief.trim().length < 12}
            >
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Sparkles size={15} />
              )}
              {busy ? "Ekip çalışıyor…" : "Ekibe ver"}
            </button>
          </div>
          {error && <p className="visitor-error">{error}</p>}
          {status && !used && (
            <p className="visitor-note">
              Bugün {status.today} ziyaretçi işi üretildi.
              {status.aiAvailable
                ? ""
                : " Günlük model bütçesi doldu; bugünkü işler kurallar motoruyla yanıtlanıyor."}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function MailSignup({ subscribers = 0, enabled = true }) {
  const [email, setEmail] = useState(""),
    [state, setState] = useState("idle"),
    [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    setState("busy");
    try {
      const response = await fetch("/api/mail/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kayıt tamamlanamadı.");
      setState("done");
      setMessage(
        data.status === "confirmed"
          ? "Bu adres zaten listede."
          : data.mail === "not_configured"
            ? "Kaydın alındı. Bülten açıldığında ilk gönderim sana da gelecek."
            : "Onay e-postası gönderildi. Kutunu kontrol et.",
      );
    } catch (e) {
      setState("error");
      setMessage(e.message);
    }
  }
  return (
    <div className="signup">
      <div>
        <span className="lp-eyebrow">GÜNLÜK BÜLTEN</span>
        <h3>Şirketin gününü e-postayla takip et.</h3>
        <p>
          08.15'te günlük toplantının planı, karar çıkınca ne seçildiği ve karşı
          oylar, 17.00'de gelir gider tablosuyla gün sonu raporu. Günde en fazla
          üç e-posta, istediğin an bırakırsın.
        </p>
        {subscribers > 0 && <small>{subscribers} kişi takip ediyor.</small>}
      </div>
      {state === "done" ? (
        <p className="signup-done">
          <Check size={16} /> {message}
        </p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="mail-input">E-posta</label>
          <div>
            <input
              id="mail-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ad@ornek.com"
              autoComplete="email"
            />
            <button className="button button-dark" disabled={state === "busy"}>
              <Mail size={15} />
              {state === "busy" ? "Gönderiliyor…" : "Bülteni al"}
            </button>
          </div>
          {state === "error" && <p className="visitor-error">{message}</p>}
          <p className="visitor-note">
            Sadece bu bülten için kullanılır, üçüncü tarafla paylaşılmaz. Her
            e-postada bırakma bağlantısı olur.
            {!enabled &&
              " Gönderim altyapısı henüz bağlanmadı; kaydın sıraya alınır."}
          </p>
        </form>
      )}
    </div>
  );
}

export function Ledger({ entries = [], money }) {
  if (!entries.length) return null;
  return (
    <section className="panel ledger-panel">
      <div className="panel-heading">
        <div>
          <h2>Gün sonu defteri</h2>
          <p>Ne yapıldı, ne kazandırdı, ne maliyet çıkardı. Tamamı simülasyon.</p>
        </div>
        <span className="muted">Son {Math.min(7, entries.length)} mesai</span>
      </div>
      <div className="ledger-scroll">
        <table className="ledger">
          <thead>
            <tr>
              <th>Gün</th>
              <th>İş</th>
              <th>Gelir</th>
              <th>Gider</th>
              <th>Net</th>
              <th>Kasa</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 7).map((entry) => (
              <tr key={entry.day}>
                <td>{entry.day}.</td>
                <td>
                  <strong>{entry.work}</strong>
                  <small>{entry.focus}</small>
                </td>
                <td>{money(entry.pilotRevenue + entry.retainer)}</td>
                <td>{money(entry.experimentCost + entry.payroll)}</td>
                <td className={entry.net >= 0 ? "pos" : "neg"}>
                  {entry.net >= 0 ? "+" : ""}
                  {money(entry.net)}
                </td>
                <td>{money(entry.cash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="visitor-note">
        Gelir = pilot + bakım. Gider = deney bütçesi + bordro. Her mesainin
        indirilebilir gün sonu raporu üretilenler bölümündedir.
      </p>
    </section>
  );
}

export function Organic({ products = [], principles = [], departures = 0 }) {
  const active = products.filter((p) => p.status === "active");
  const retired = products.filter((p) => p.status !== "active");
  if (!products.length && !principles.length) return null;
  return (
    <div className="organic-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ürün hattı</h2>
            <p>
              Kazanılan işler kalıcı bir hatta dönüşür, tutmayanlar kapatılır.
              Müşteriler bu hatlardan gelir.
            </p>
          </div>
          <span className="muted">{active.length} açık</span>
        </div>
        {products.length ? (
          <div className="product-list">
            {products.slice(0, 8).map((product) => (
              <article
                key={product.id}
                className={product.status === "active" ? "" : "product-retired"}
              >
                <div>
                  <strong>{product.title}</strong>
                  <span>{product.field}</span>
                </div>
                <b>
                  {product.status === "active"
                    ? `${product.customers} müşteri`
                    : `${product.retiredDay}. günde durduruldu`}
                </b>
              </article>
            ))}
          </div>
        ) : (
          <p className="visitor-note">Henüz kalıcı bir ürün hattı açılmadı.</p>
        )}
        {departures > 0 && (
          <p className="visitor-note">
            Bugüne kadar {departures} kişi ekipten ayrıldı.
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Şirketin ilkeleri</h2>
            <p>
              Tekrar eden sonuçlardan çıkarılan kurallar. Bu ilkeler sonraki
              mesailerde ekibin istemine giriyor.
            </p>
          </div>
          <span className="muted">{principles.length}</span>
        </div>
        {principles.length ? (
          <ol className="principle-list">
            {principles.map((rule) => (
              <li key={rule.id}>
                <span>{rule.day}. gün</span>
                <p>{rule.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="visitor-note">
            Henüz yeterince tekrar eden bir sonuç yok; ilkeler zamanla yazılacak.
          </p>
        )}
      </section>
    </div>
  );
}

export function VisitorFeed() {
  const [works, setWorks] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/visitor/feed")
      .then((r) => r.json())
      .then((d) => alive && setWorks(d.works || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!works.length) return null;
  return (
    <div className="visitor-feed">
      <span className="lp-eyebrow">ZİYARETÇİ İŞLERİ</span>
      <div>
        {works.slice(0, 6).map((work) => (
          <article key={work.id}>
            <h4>{work.title}</h4>
            <p>{work.summary}</p>
            <span>
              <ArrowUpRight size={12} /> ekip yanıtladı
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
