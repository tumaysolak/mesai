import { useState } from "react";
import { ArrowRight, Loader2, Radio } from "lucide-react";

export const ACCESS_KEY = "mesai-access";

export function readAccess() {
  try {
    return localStorage.getItem(ACCESS_KEY) || "";
  } catch {
    return "";
  }
}

// The office is free to watch, but it costs one e-mail address — once per browser.
export default function Gate({ onOpen, goHome, watchers = 0 }) {
  const [email, setEmail] = useState(""),
    [subscribe, setSubscribe] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), subscribe, source: "panel" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giriş açılamadı.");
      try {
        localStorage.setItem(ACCESS_KEY, data.token);
      } catch {
        // A private window forgets it; the panel still opens for this visit.
      }
      onOpen(data.token);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="gate-live">
          <Radio size={13} /> CANLI
        </span>
        <h1>
          Ofis açık. İçeri girmek için bir kez e-posta bırak.
        </h1>
        <p>
          Panelde şirketin o anki kararlarını, kasasını, borcunu, ekibini ve
          ürettiği dosyaları canlı görürsün. Ücretsiz, üyelik yok, şifre yok:
          adresini bir kez yazarsın, bu tarayıcı seni bir daha sormaz.
        </p>
        <form onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            maxLength={160}
            placeholder="ornek@sirket.com"
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-posta adresi"
          />
          <button type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            {busy ? "Açılıyor" : "Ofisi izle"}
          </button>
        </form>
        <label className="gate-check">
          <input
            type="checkbox"
            checked={subscribe}
            onChange={(e) => setSubscribe(e.target.checked)}
          />
          <span>
            Günlük planı ve gün sonu raporunu da e-postayla gönderin. (Onay
            linkine tıklamadan listeye eklenmezsin, her mailde tek tıkla
            çıkarsın.)
          </span>
        </label>
        {error && <p className="gate-error">{error}</p>}
        <p className="gate-note">
          E-postan yalnız panele erişim ve seçtiysen bülten için kullanılır,
          kimseyle paylaşılmaz. Ayrıntı: <a href="/gizlilik">gizlilik ve KVKK</a>
          . {watchers > 0 ? `Şu ana kadar ${watchers} kişi ofisi izledi.` : ""}
        </p>
        <button className="gate-back" onClick={goHome}>
          Önce ürün sayfasına bak
        </button>
      </div>
    </div>
  );
}
