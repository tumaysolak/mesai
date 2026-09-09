import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  Megaphone,
  Radio,
} from "lucide-react";

const CHANNEL = {
  x: { label: "Kısa gönderi", hint: "X / Threads için" },
  linkedin: { label: "Uzun gönderi", hint: "LinkedIn için" },
  site: { label: "Şirket notu", hint: "Kendi akışında" },
};

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="text-button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "Kopyalandı" : "Metni kopyala"}
    </button>
  );
}

// What the company published about itself: its own product pages and its own posts.
export default function Marketing({ sites = [], posts = [] }) {
  const live = sites.filter((s) => s.status === "live");
  const closed = sites.filter((s) => s.status !== "live");
  return (
    <div className="marketing">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Yayına alınan ürün sayfaları</h2>
            <p>
              Ekip kazanan bir işi ürüne çevirdiğinde tanıtım metnini kendisi
              yazıyor ve sayfayı aynı gün canlıya alıyor. Hat kapanınca sayfa da
              kapanıyor.
            </p>
          </div>
          <span className="muted">{live.length} açık</span>
        </div>
        {sites.length ? (
          <div className="site-list">
            {[...live, ...closed].map((s) => (
              <article
                key={s.slug}
                className={s.status === "live" ? "" : "site-retired"}
              >
                <div>
                  <span className="eyebrow">
                    {s.day}. mesai · {s.status === "live" ? "yayında" : "kapandı"}
                    {s.views ? ` · ${s.views} görüntülenme` : ""}
                  </span>
                  <strong>{s.title}</strong>
                  <p>{s.tagline}</p>
                </div>
                {s.status === "live" && (
                  <a href={`/u/${s.slug}`} target="_blank" rel="noreferrer">
                    <Globe size={14} /> Sayfayı aç <ArrowUpRight size={13} />
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="visitor-note">
            Henüz yayına alınmış bir ürün yok. İlk kazanan iş ürüne
            dönüştüğünde sayfası burada açılacak.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Şirketin kendi gönderileri</h2>
            <p>
              Büyüme tarafı her mesai sonunda bir not, lansman günlerinde iki
              gönderi yazıyor. Hepsi{" "}
              <a href="/akis" target="_blank" rel="noreferrer">
                akış sayfasında
              </a>{" "}
              yayında; buradan kopyalayıp gerçek hesaplarda da paylaşabilirsin.
            </p>
          </div>
          <span className="muted">{posts.length}</span>
        </div>
        {posts.length ? (
          <div className="post-list">
            {posts.map((p) => (
              <article key={p.id}>
                <div className="post-top">
                  <span className="eyebrow">
                    <Radio size={12} /> {p.day}. mesai · {p.author} ·{" "}
                    {CHANNEL[p.channel]?.label || p.channel}
                  </span>
                  <span className="post-hint">{CHANNEL[p.channel]?.hint}</span>
                </div>
                <p>{p.text}</p>
                <div className="post-foot">
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noreferrer">
                      {p.link.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span />
                  )}
                  <CopyButton text={p.link ? `${p.text}\n${p.link}` : p.text} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="visitor-note">
            <Megaphone size={14} /> İlk mesai kapandığında akış burada
            başlayacak.
          </p>
        )}
      </section>
    </div>
  );
}
