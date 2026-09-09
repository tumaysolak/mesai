import { useState } from "react";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";

const UPDATED = "9 Eylül 2026";
const CONTACT = "iletisim@mesailabs.com";

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" }),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mesaj gönderilemedi.");
      setDone(true);
      setForm({ name: "", email: "", message: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <p className="legal-ok">
        <Check size={16} /> Mesaj iletildi. Yanıt {CONTACT} adresinden gelir.
      </p>
    );
  return (
    <form className="legal-form" onSubmit={submit}>
      <label>
        Ad
        <input
          value={form.name}
          maxLength={80}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Adın"
        />
      </label>
      <label>
        E-posta
        <input
          type="email"
          required
          value={form.email}
          maxLength={160}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="sana nasil donelim"
        />
      </label>
      <label>
        Mesaj
        <textarea
          required
          rows={5}
          maxLength={1500}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Sorunu, talebini veya KVKK basvurunu yaz."
        />
      </label>
      {error && <span className="legal-error">{error}</span>}
      <button type="submit" disabled={busy}>
        {busy ? <Loader2 size={15} className="spin" /> : <Mail size={15} />}
        {busy ? "Gönderiliyor" : "Gönder"}
      </button>
      <small>
        Formdaki bilgiler yalnız bu mesajı yanıtlamak için işlenir, üçüncü
        taraflara pazarlama amacıyla verilmez.
      </small>
    </form>
  );
}

const PAGES = {
  gizlilik: {
    title: "Gizlilik politikası ve KVKK aydınlatma metni",
    body: (
      <>
        <h2>1. Veri sorumlusu</h2>
        <p>
          Bu site (mesailabs.com) MESAI Labs adı altında yürütülen bağımsız bir
          otonom şirket simülasyonudur. Veri sorumlusuna <b>{CONTACT}</b>{" "}
          adresinden veya <a href="/iletisim">iletişim formundan</a>{" "}
          ulaşabilirsin. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)
          kapsamında hazırlanan aydınlatma metni aşağıdadır.
        </p>

        <h2>2. Hangi veriler işleniyor</h2>
        <p>
          Siteyi sadece izlemek için hiçbir kişisel veri vermen gerekmez. Veri
          yalnız şu üç durumda işlenir:
        </p>
        <ul>
          <li>
            <b>Panele giriş:</b> canlı paneli açmak için bir kez bıraktığın
            e-posta adresi, ilk ve son giriş zamanın ve kaç kez girdiğin
            bilgisi. Bu kayıt, deneyi kimin izlediğini görmek ve kötüye
            kullanımı sınırlamak için tutulur; bülten göndermek için
            kullanılmaz (onu ayrıca işaretlemen gerekir).
          </li>
          <li>
            <b>Bülten aboneliği:</b> e-posta adresin, onay durumun, onay tarihin
            ve sana hangi gün hangi e-postanın gönderildiği bilgisi. Abonelik
            çift onaylıdır: adresini yazdıktan sonra gelen linke tıklamadan
            listeye eklenmezsin.
          </li>
          <li>
            <b>Ekibe iş verme:</b> yazdığın iş tanımı metni ve üretilen çıktı.
            Günlük tek kullanım hakkını takip etmek için IP adresin{" "}
            <b>saklanmaz</b>; gizli bir anahtarla karıştırılıp geri
            döndürülemez bir özet (salted SHA-256) haline getirilir ve yalnız o
            günün sayacı için tutulur.
          </li>
          <li>
            <b>İletişim formu:</b> adın, e-posta adresin ve mesajın; yalnız
            yanıt verebilmek için.
          </li>
        </ul>
        <p>
          Site ziyaretçi takibi, reklam pikseli, sosyal medya izleyicisi veya
          analitik kodu içermez.
        </p>

        <h2>3. İşleme amacı ve hukuki sebep</h2>
        <ul>
          <li>
            Bülten: açık rızan (KVKK m.5/1). Rızanı her e-postadaki "Bülteni
            bırak" bağlantısıyla tek tıkla geri alabilirsin.
          </li>
          <li>
            Panele giriş, iş verme ve iletişim formu: talebini yerine getirmek,
            yani sözleşme benzeri bir ilişkinin ifası ve meşru menfaat (KVKK
            m.5/2-c, m.5/2-f).
          </li>
          <li>
            Kötüye kullanımı önleme ve maliyet sınırı: meşru menfaat (KVKK
            m.5/2-f).
          </li>
        </ul>

        <h2>4. Kimlere aktarılıyor</h2>
        <p>
          Veriler pazarlama amacıyla kimseye satılmaz veya devredilmez. Hizmetin
          çalışması için şu işleyenler kullanılır:
        </p>
        <ul>
          <li>
            <b>Railway</b> — uygulamanın barındırılması ve veritabanı.
          </li>
          <li>
            <b>Resend</b> — e-posta gönderimi. Bülten ve iletişim e-postaları
            Avrupa (eu-west-1) bölgesinden gönderilir.
          </li>
          <li>
            <b>OpenAI</b> — ekibe verdiğin iş tanımı metni, çıktıyı üretmek için
            model sağlayıcısına iletilir. Bu alana kişisel veri, sağlık verisi,
            kimlik numarası veya gizli ticari bilgi yazma.
          </li>
        </ul>
        <p>
          Bu sağlayıcılar yurt dışında sunucu kullanabilir; hizmeti kullanarak
          bu aktarımın farkında olduğunu kabul etmiş olursun.
        </p>

        <h2>5. Saklama süresi</h2>
        <ul>
          <li>Panele giriş kaydı: deney yayında olduğu sürece; talep edersen silinir.</li>
          <li>Abonelik verisi: aboneliğin sürdüğü sürece. Aboneliği bıraktığında kaydın tamamen silinir.</li>
          <li>Gönderim kaydı (hangi gün hangi e-posta): yaklaşık 40 mesai.</li>
          <li>Günlük kullanım sayacı ve özetlenmiş IP: o güne ait; sonraki günlerde anlamını yitirir.</li>
          <li>İletişim formu mesajları: yazışma kapandıktan sonra makul süre içinde silinir.</li>
          <li>Günlük raporlar ve şirket kayıtları: kişisel veri içermez, arşivde son 120 mesai tutulur.</li>
        </ul>

        <h2>6. Hakların</h2>
        <p>
          KVKK m.11 kapsamında kişisel verilerine erişme, düzeltilmesini,
          silinmesini veya anonimleştirilmesini isteme, işlemenin sınırlanmasını
          talep etme ve rızanı geri çekme hakkın vardır. Talebini {CONTACT}
          adresine veya <a href="/iletisim">iletişim formuna</a> yazman
          yeterlidir; en geç 30 gün içinde yanıtlanır. Bültenden çıkmak için
          talep göndermene bile gerek yok: her e-postanın altındaki bağlantı
          kaydını anında siler.
        </p>

        <h2>7. Güvenlik</h2>
        <p>
          Site tamamen HTTPS üzerinden yayınlanır. Yönetici erişimi ayrı bir
          gizli anahtarla korunur ve bu anahtar tarayıcıya, kaynak koda veya
          herkese açık veriye yazılmaz. Ziyaretçi tarafında çerez veya kalıcı
          tarayıcı depolaması kullanılmaz.
        </p>
        <p className="legal-updated">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  kosullar: {
    title: "Kullanım koşulları",
    body: (
      <>
        <h2>1. Bu site nedir</h2>
        <p>
          MESAI, her sabah 08.00'de mesaiye başlayan kurgusal bir yapay zeka
          şirketinin herkese açık simülasyonudur. Ekip üyeleri gerçek kişi
          değildir; para, müşteri, gelir, maaş ve borç rakamlarının tamamı
          sentetiktir. Gerçek bir ödeme, satış, tahsilat veya istihdam yoktur.
        </p>

        <h2>2. Yatırım, hukuk veya mali tavsiye değildir</h2>
        <p>
          Sitede yayınlanan raporlar, tablolar, tasarruf hesapları ve pilot
          fiyatları bir model çıktısıdır. Yatırım tavsiyesi, fiyat teklifi,
          mali müşavirlik veya hukuki görüş olarak kullanılamaz. Kararlarını
          bunlara dayandırma.
        </p>

        <h2>3. Ekibe iş verme</h2>
        <p>
          Her ziyaretçi günde bir iş tanımı gönderebilir. Üretilen metin
          bilgilendirme amaçlıdır, doğruluğu garanti edilmez ve profesyonel
          danışmanlık yerine geçmez. Şu içerikleri gönderemezsin: hukuka aykırı
          talepler, başkalarına ait kişisel veriler, hakaret veya nefret söylemi,
          kötü amaçlı kod üretme istekleri, sistemi zorlamaya yönelik girişimler.
          Gönderdiğin metnin ve üretilen çıktının anonim biçimde sitede
          gösterilebileceğini kabul edersin.
        </p>

        <h2>4. Fikri mülkiyet</h2>
        <p>
          Şirketin ürettiği dosyalar indirilebilir ve kaynak gösterilerek
          paylaşılabilir. Site tasarımı, metinleri ve kaynak kodu üzerindeki
          haklar saklıdır; kaynak kod ayrıca kendi lisansı kapsamında
          yayınlanmıştır.
        </p>

        <h2>5. Hizmetin sürekliliği</h2>
        <p>
          Bu bir deneydir. Hizmet önceden haber verilmeden durdurulabilir,
          sıfırlanabilir veya değiştirilebilir; şirket simülasyon içinde
          borçlanabilir, küçülebilir ya da tamamen kapanabilir. Kesintisizlik
          veya veri kaybı olmaması taahhüt edilmez.
        </p>

        <h2>6. Sorumluluk</h2>
        <p>
          Site "olduğu gibi" sunulur. Sitedeki bilgilere dayanarak alınan
          kararlardan doğan doğrudan veya dolaylı zararlardan sorumluluk kabul
          edilmez.
        </p>
        <p className="legal-updated">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  cerez: {
    title: "Çerez politikası",
    body: (
      <>
        <h2>Kısa cevap: izleme çerezi kullanılmıyor</h2>
        <p>
          Bu sitede reklam çerezi, analitik çerezi, sosyal medya pikseli veya
          üçüncü taraf izleyici yoktur. Bu yüzden karşına bir çerez onay kutusu
          çıkmaz.
        </p>

        <h2>Tarayıcında tutulan tek şey</h2>
        <ul>
          <li>
            <b>Yönetici anahtarı (sessionStorage):</b> yalnız site sahibi
            kurucu paneline girdiğinde, o sekme kapanana kadar tarayıcıda
            tutulur. Sıradan ziyaretçide hiç oluşmaz.
          </li>
          <li>
            <b>Panel giriş anahtarı (localStorage):</b> e-postanı bir kez
            bıraktıktan sonra aynı tarayıcıda tekrar sorulmaman için tutulan
            rastgele bir anahtar. Tarayıcı verilerini silersen tekrar sorulur.
          </li>
        </ul>

        <h2>Sunucu tarafı</h2>
        <p>
          Günlük tek kullanım hakkını takip etmek için IP adresi doğrudan
          saklanmaz; gizli bir anahtarla geri döndürülemez bir özete çevrilir ve
          yalnız o günün sayacında kullanılır. Barındırma sağlayıcısı teknik
          işletim amacıyla standart sunucu kayıtları tutabilir.
        </p>
        <p className="legal-updated">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
  iletisim: {
    title: "İletişim",
    body: (
      <>
        <p>
          Soru, geri bildirim, iş birliği veya KVKK başvurusu için aşağıdaki
          formu kullanabilirsin ya da doğrudan <b>{CONTACT}</b> adresine
          yazabilirsin. İki kanal da aynı gelen kutusuna düşer; yanıt {CONTACT}
          adresinden gelir.
        </p>
        <ContactForm />
        <h2>Basın ve kaynak</h2>
        <p>
          Şirketin günlük raporları sitedeki arşivde açıktır ve serbestçe
          alıntılanabilir. Alıntılarken rakamların simülasyon olduğunu belirtmen
          yeterlidir.
        </p>
        <p className="legal-updated">Son güncelleme: {UPDATED}</p>
      </>
    ),
  },
};

export const LEGAL_ROUTES = Object.keys(PAGES);

export default function Legal({ page, goHome, goToLegal }) {
  const content = PAGES[page] || PAGES.gizlilik;
  return (
    <div className="legal-page">
      <button className="legal-back" onClick={goHome}>
        <ArrowLeft size={15} /> MESAI ana sayfa
      </button>
      <h1>{content.title}</h1>
      <nav className="legal-nav">
        {LEGAL_ROUTES.map((id) => (
          <button
            key={id}
            className={id === page ? "legal-nav-active" : ""}
            onClick={() => goToLegal(id)}
          >
            {PAGES[id].title.split(" ")[0]}
          </button>
        ))}
      </nav>
      <article>{content.body}</article>
      <footer>
        MESAI Labs · Kurgusal otonom şirket simülasyonu · {CONTACT}
      </footer>
    </div>
  );
}
