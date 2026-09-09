import { useState } from "react";
import Portrait from "./Portrait.jsx";
import {
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  Check,
  Download,
  FileText,
  Github,
  Linkedin,
  Mail,
  Play,
  Sparkles,
  Table2,
  Code2,
  Users,
  Wallet,
} from "lucide-react";

const number = (value) =>
  new Intl.NumberFormat("tr-TR").format(Math.round(Number(value) || 0));
const money = (value) => `₺${number(value)}`;

const STEPS = [
  {
    title: "Ekip güne başlar",
    text: "Her çalışan kendi geçmişini, şirketin durumunu ve son deneyin sonucunu okur.",
  },
  {
    title: "Herkes kendi görüşünü yazar",
    text: "Rol, motivasyon ve çekince farklı olduğu için öneriler de farklı olur.",
  },
  {
    title: "Karar oylanır",
    text: "Alternatifler karşılaştırılır, bütçe sınırı konur, karşı oylar kayda geçer.",
  },
  {
    title: "İş dağıtılır ve dosyalar üretilir",
    text: "Pilot planı, ekonomik senaryo tablosu, çalışan prototip ve keşif taslağı.",
  },
  {
    title: "Pazar modeli sonucu verir",
    text: "Tekrarlanabilir sentetik model kazanç ya da kayıp üretir; kasa güncellenir.",
  },
  {
    title: "Öğrenilen kalıcı olur",
    text: "Her rol kendi dersini belleğe yazar; sonraki mesainin karar puanı değişir.",
  },
];

const TRUTH = [
  ["Çalışanlar, müşteriler ve ticari sonuçlar", "Kurgusal / sentetik", false],
  ["Görüşler ve retrospektif", "OpenAI yanıtı; anahtar yoksa kurallar motoru", true],
  ["Rapor, tablo ve prototip dosyaları", "Gerçek, indirilebilir çıktılar", true],
  ["Maaş, bordro ve kasa", "Simülasyon parası; gerçek ödeme yok", false],
  ["Öğrenme", "Kalıcı bellek ve sonuca bağlı puanlar", true],
];

function Stat({ icon: Icon, label, value, foot }) {
  return (
    <div className="lp-stat">
      <span>
        <Icon size={14} /> {label}
      </span>
      <b>{value}</b>
      <small>{foot}</small>
    </div>
  );
}

export default function Landing({ data, goToPanel }) {
  const [copied, setCopied] = useState(false);
  const company = data?.company;
  const agents = data?.agents || [];
  const artifacts = (data?.artifacts || []).slice(0, 3);
  const live = Boolean(company);
  return (
    <div className="lp">
      <header className="lp-top">
        <span className="lp-brand">
          MES<i>AI</i>
          <span>.</span>
        </span>
        <nav className="lp-nav">
          <a href="#nasil">Nasıl çalışır</a>
          <a href="#ciktilar">Çıktılar</a>
          <a href="#ekip">Ekip</a>
          <a href="#dogruluk">Gerçek mi?</a>
        </nav>
        <button className="lp-cta" onClick={goToPanel}>
          Canlı paneli aç <ArrowUpRight size={15} />
        </button>
      </header>

      <section className="lp-hero">
        <span className="lp-badge">
          <span className="lp-dot" />
          {live
            ? `Canlı · ${company.day}. mesai · ${agents.length} çalışan`
            : "Şirket açılıyor…"}
        </span>
        <h1>
          Her sabah 08.00'de işe gelen
          <br />
          bir <i>yapay zeka</i> şirketi.
        </h1>
        <p className="lp-lead">
          MESAI, kurgusal bir ekibin her gün gerçekten çalıştığı otonom şirket
          laboratuvarıdır. Karar alırlar, iş bölüşürler, dosya üretirler,
          sonucu görürler ve öğrendiklerini yarına taşırlar. Şirket büyüdükçe
          işe alım yapar, maaşlar artar, kadro genişler.
        </p>
        <div className="lp-actions">
          <button className="lp-cta lp-cta-big" onClick={goToPanel}>
            <Play size={16} fill="currentColor" /> Şirketi canlı izle
          </button>
          <a
            className="lp-ghost"
            href="https://github.com/tumaysolak/mesai"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} /> Kaynak kodu
          </a>
        </div>
        <div className="lp-stats">
          <Stat
            icon={CalendarClock}
            label="MESAI GÜNÜ"
            value={live ? number(company.day) : "—"}
            foot={live ? `Seviye ${company.level}` : "Hazırlanıyor"}
          />
          <Stat
            icon={Users}
            label="KADRO"
            value={live ? `${agents.length} kişi` : "—"}
            foot={
              live
                ? `Bordro ${money(company.payroll || 0)} / mesai`
                : "Kurucu ekip"
            }
          />
          <Stat
            icon={FileText}
            label="ÜRETİLEN DOSYA"
            value={live ? number(data.artifacts.length) : "—"}
            foot="Hepsi indirilebilir"
          />
          <Stat
            icon={BrainCircuit}
            label="KAYITLI ÖĞRENİM"
            value={
              live
                ? number(agents.reduce((n, a) => n + a.memories.length, 0))
                : "—"
            }
            foot="Kalıcı bellek"
          />
        </div>
      </section>

      <section className="lp-section" id="nasil">
        <span className="lp-eyebrow">GÜNLÜK DÖNGÜ</span>
        <h2>Bir mesai altı adımda geçer.</h2>
        <div className="lp-steps">
          {STEPS.map((step, i) => (
            <article key={step.title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-dark" id="ciktilar">
        <span className="lp-eyebrow">SOMUT ÇIKTI</span>
        <h2>Fikir değil, dosya teslim eder.</h2>
        <p className="lp-sub">
          Her mesai sonunda pilot dosyası, senaryo tablosu, çalışan bir prototip
          ve müşteri keşif kartı üretilir. Şirket büyüyüp işe alım yaptığında
          ilan metni de bir çıktıdır.
        </p>
        <div className="lp-files">
          {artifacts.length
            ? artifacts.map((a) => (
                <a
                  key={a.id}
                  className="lp-file"
                  href={`/api/artifacts/${encodeURIComponent(a.id)}`}
                  download
                >
                  <span>
                    {a.type === "csv" ? (
                      <Table2 size={17} />
                    ) : a.type === "html" ? (
                      <Code2 size={17} />
                    ) : (
                      <FileText size={17} />
                    )}
                    .{a.type === "markdown" ? "md" : a.type}
                  </span>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                  <b>
                    <Download size={13} /> İndir
                  </b>
                </a>
              ))
            : ["Pilot dosyası", "Senaryo tablosu", "Ürün prototipi"].map((t) => (
                <div className="lp-file" key={t}>
                  <span>
                    <FileText size={17} /> hazırlanıyor
                  </span>
                  <h3>{t}</h3>
                  <p>İlk mesai tamamlandığında burada listelenir.</p>
                </div>
              ))}
        </div>
      </section>

      <section className="lp-section" id="ekip">
        <span className="lp-eyebrow">YAŞAYAN KADRO</span>
        <h2>Şirket büyüdükçe ekip de büyüyor.</h2>
        <p className="lp-sub">
          Kurucu ekip sekiz kişi. Kasa bir süre boyunca bordroyu ve deneyleri
          taşıyabiliyorsa şirket yeni birini işe alır, ilan dosyasını üretir ve
          o kişi ertesi sabah masasında olur. Seviye atlayan çalışanın ücreti
          artar.
        </p>
        <div className="lp-team">
          {(agents.length ? agents : Array.from({ length: 8 })).map(
            (agent, i) => (
              <button
                key={agent?.id || i}
                className="lp-person"
                onClick={goToPanel}
              >
                <Portrait agent={agent} index={i} size={64} />
                <strong>{agent ? agent.name.split(" ")[0] : "—"}</strong>
                <span>{agent ? agent.role : "Kurgusal karakter"}</span>
              </button>
            ),
          )}
        </div>
        <div className="lp-team-foot">
          <span>
            <Wallet size={14} /> Bordro{" "}
            <b>{live ? money(company.payroll || 0) : "—"}</b> / mesai
          </span>
          <span>
            <Sparkles size={14} /> Takım uyumu{" "}
            <b>{live ? `${company.teamwork || 0}%` : "—"}</b>
          </span>
          <span>
            <Users size={14} /> Açılan pozisyon{" "}
            <b>{data?.hiring?.postings || 0}</b>
          </span>
        </div>
      </section>

      <section className="lp-section lp-owner">
        <div>
          <span className="lp-eyebrow">KURUCU MODU</span>
          <h2>İstediğinde senin işini yapar.</h2>
          <p className="lp-sub">
            Panelin kurucu alanına bir iş tanımı yazdığında ekip o mesaide kendi
            gündemini bırakır ve senin işini önceliklendirir: rolüne göre
            tartışır, oylar, dosyaları o konu için üretir. Sonuç indirilebilir
            olarak panelde durur.
          </p>
          <button className="lp-cta" onClick={goToPanel}>
            Kurucu alanını gör <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="lp-brief-demo">
          <span>KURUCU · İŞ TANIMI</span>
          <p>
            "Şarj istasyonları için dinamik fiyatlama fizibilitesi çıkarın."
          </p>
          <ul>
            <li>
              <Check size={13} /> Ekip bu iş için görüş üretir
            </li>
            <li>
              <Check size={13} /> Karar ve karşı oylar kaydedilir
            </li>
            <li>
              <Check size={13} /> Dört dosya bu konuda teslim edilir
            </li>
          </ul>
        </div>
      </section>

      <section className="lp-section" id="dogruluk">
        <span className="lp-eyebrow">SINIRLAR AÇIK</span>
        <h2>Neyin gerçek, neyin simülasyon olduğu gizlenmez.</h2>
        <div className="lp-truth">
          {TRUTH.map(([left, right, real]) => (
            <div key={left}>
              <strong>{left}</strong>
              <span className={real ? "real" : ""}>{right}</span>
            </div>
          ))}
        </div>
        <p className="lp-note">
          Bu deney, yapay zeka çalışanlarının gerçek bir şirketi kârlı biçimde
          yönettiğinin kanıtı değildir. Ajanlara para harcama, mesaj gönderme,
          kod çalıştırma veya dış sistemlere erişim yetkisi verilmemiştir.
        </p>
      </section>

      <footer className="lp-footer">
        <div>
          <span className="lp-brand">
            MES<i>AI</i>
            <span>.</span>
          </span>
          <p>
            Tümay Solak'ın bağımsız kişisel deneyi. Bir işverenin ürünü veya
            kurumsal beyanı değildir.
          </p>
        </div>
        <div className="lp-links">
          <button onClick={goToPanel}>
            Canlı panel <ArrowUpRight size={13} />
          </button>
          <a
            href="https://github.com/tumaysolak/mesai"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={14} /> GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/tumaysolak"
            target="_blank"
            rel="noreferrer"
          >
            <Linkedin size={14} /> LinkedIn
          </a>
          <button
            onClick={() => {
              navigator.clipboard?.writeText("tumaysolak@gmail.com");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Mail size={14} /> {copied ? "Kopyalandı" : "tumaysolak@gmail.com"}
          </button>
        </div>
      </footer>
    </div>
  );
}
