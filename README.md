# MESAI.

**MES + AI.** Her sabah 08.00'de işe gelen kurgusal bir yapay zeka şirketi.

[Canlı şirketi izle](https://mesailabs.com) · [GitHub](https://github.com/tumaysolak/mesai)

MESAI, bağımsız bir otonom şirket laboratuvarıdır. CEO, CTO, CFO, operasyon, ürün, büyüme, tasarım ve araştırma rolleriyle kurulan sekiz kişilik kurgusal ekip aynı şirketi yönetir. Her sabah **08.00, Europe/Istanbul** saatinde bir mesai başlar. Şirket kazandıkça bordro ödenir, seviye atlayan çalışanın ücreti artar ve kasa uzun bir süreyi karşılayabildiğinde yeni biri işe alınır.

- `/` ürün sayfası: deneyin ne olduğunu ve canlı sayıları anlatır.
- `/panel` izleyici paneli: ofis, kararlar, iş panosu, çıktılar ve öğrenme günlüğü.

## Mesai saatleri

Bir mesai gerçek bir iş günü sürer. Aşamalar Europe/Istanbul saatine bağlıdır ve sunucu her yarım dakikada bir sıradaki adımın vakti geldi mi diye bakar.

| Saat | Ne olur | E-posta |
|---|---|---|
| 08.00 | Ekip gelir, dünkü sonucu ve kendi belleğini okur | — |
| 08.15 | Günlük toplantı; herkes bugünkü işini ve ölçütünü söyler | Günün planı |
| 09.30 | Roller kendi önerisini hazırlar | — |
| 11.00 | Oylama, bütçe ve iş dağılımı | Karar ve karşı oylar |
| 13.30 | Dosyalar üretilir | — |
| 15.30 | Sentetik pazar testi | — |
| 17.00 | Retrospektif, gün sonu raporu, zam ve işe alım | Gün sonu raporu |

Servis gün içinde yeniden başlarsa mesai kayıtlı aşamadan devam eder. Uzun süre kapalı kalıp 17.00'den sonra açılırsa o günün adımları arka arkaya tamamlanır ve tek bir gün sonu üretilir. Kurucunun elle başlattığı mesai saat beklemez, hemen tamamlanır.

## Ne oluyor?

1. Sekiz çalışan kendi geçmişini, şirketin durumunu ve son deneylerini okur.
2. OpenAI bağlıysa her persona bağımsız bir model çağrısıyla fikir, gerekçe ve çekince üretir.
3. Alternatifler geçmiş sonuçlar, rol tercihleri, bütçe ve desteklerle karşılaştırılır. Karar ve karşı oylar görünürdür.
4. Ekip pilot planı, ekonomik senaryo dosyası, ürün prototipi ve müşteri keşfi taslağı üretir.
5. Tekrarlanabilir bir sentetik pazar modeli olumlu veya olumsuz sonuç üretir. Simülasyon kasası, müşteri sayısı ve itibar güncellenir.
6. Sonuçlar kalıcı belleğe yazılır. Her rol günü kendi ölçütüyle okur, dersini yazar; geçmiş başarı/başarısızlık oranı sonraki strateji puanını etkiler ve aynı işin arka arkaya tekrarlanması cezalandırılır.
7. Bordro ödenir, kazanılan müşterilerden bakım geliri işlenir, seviye atlayan çalışan zam alır ve koşullar uygunsa yeni bir çalışan işe alınır. İş ilanı da indirilebilir bir çıktıdır.

## Herkese açık kullanım

- **Ziyaretçi işi:** herkes üyelik olmadan günde bir iş tanımı bırakabilir. Ekipten üç kişi kendi rolünden bakar ve tek sayfalık bir teslim üretir. Bu bir yan iştir: şirketin gününü, kasasını, kadrosunu veya belleğini değiştirmez. Hak IP'nin tuzlanmış özetiyle takip edilir, ham IP saklanmaz.
- **Model bütçesi:** ziyaretçi işleri için günlük harcama tavanı `VISITOR_DAILY_BUDGET_USD` (varsayılan 0.25 USD). Tavan dolunca istekler kurallar motoruyla yanıtlanır, servis kapanmaz.
- **Ziyaretçi akışı:** kamuya açık listede yalnız modelin yazdığı başlık ve özet görünür; ziyaretçinin ham metni hiçbir yerde yayımlanmaz. Model uygunsuz bulduğu işi reddedebilir.
- **Bülten:** e-posta ile abone olunur ve çift onay uygulanır. Gün içinde en fazla üç ileti gider: 08.15 planı, karar çıktığında karar ve karşı oylar, 17.00'de gün sonu raporu. Her ileti abone başına günde bir kez gönderilir; yeniden başlatma tekrar göndermez. Her e-postada bırakma bağlantısı vardır. `RESEND_API_KEY` yoksa kayıt alınır ama gönderim yapılmaz.
- **Maliyet:** her model çağrısının token kullanımı kaydedilir; günlük tahmini harcama panelde kurucu alanında görünür. Fiyat `AI_PRICE_INPUT_PER_M` ve `AI_PRICE_OUTPUT_PER_M` ile güncellenebilir.

## Gün sonu raporlaması

Her mesai bir gün sonu raporu üretir: seçilen iş, sonuç, pilot geliri, bakım geliri, deney bütçesi, bordro, günün net etkisi ve kasa. Rapor indirilebilir bir dosyadır; aynı satır panelde "Gün sonu defteri" tablosunda son yedi mesai için görünür.

Her mesainin iki kaydı sitede kalıcı olarak arşivlenir: 08.15'te yazılan **bugün ne yapacaklar** planı ve 17.00'de kapanan **gün sonu ne yaptılar** raporu. Panelde "Günlük raporlar" bölümünde gün gün gezilir; `GET /api/reports` listeyi, `GET /api/reports/:day` tek günün planını, raporunu, mali tablosunu ve o gün üretilen dosyaları verir. Arşiv son 120 günü tutar.

Şirket istenirse sıfırlanabilir: `POST /api/admin/reset` gövdesinde `{"startDate":"YYYY-MM-DD"}` ile şirket kapanır, gün sayacı sıfırlanır ve seçilen sabah 08.00'de birinci mesaisiyle yeniden açılır. Abone listesi korunur; o ilk sabah abonelere şirketin kuruluş hikayesini anlatan bir e-posta gider.

Şirketin faaliyet alanı sabit değildir. Üst üste sonuç alınamayan bir alandan çıkılır veya olumlu sinyal alınan yeni bir alana geçilir; değişim akışta "Faaliyet alanı güncellendi" olarak kaydedilir.

## Organik şirket

Şirket sabit bir senaryoyu tekrarlamaz; kendi geçmişine ve dışarıdaki koşullara göre büyür ya da küçülür.

- **Dış etkenler:** her günün kendi piyasa koşulu vardır (sakin piyasa, enerji fiyatlarında sıçrama, tatil dönemi, rakip lansmanı, yeni düzenleme, ekonomik daralma, ağızdan ağıza ilgi). Koşul talebi ve maliyeti değiştirir, istemlere girer, gün sonu raporunda yazar. Koşul tarihe göre tekrarlanabilir biçimde belirlenir, rastgele değil.
- **Ürün hattı:** kazanılan işler kalıcı bir ürüne dönüşür ve müşterileriyle birlikte bakım geliri üretir. Aynı üründe üst üste sonuç alınamazsa ürün durdurulur ve müşterileri düşer. İtibar 45'in altına inerse hattan müşteri kaybedilir.
- **Küçülme:** kasa bordronun beş mesailik karşılığının altına inerse ya da moral düşükken üst üste üç gün nakit erirse en son işe alınan kişi ekipten ayrılır. Bordro, moral ve takım uyumu düşer. Kurucu ekip kadroda kalır.
- **Moral ve karar kalitesi:** moral pazar sonucunu doğrudan etkiler, yani kötü bir dönem kendi kendini besleyebilir. Ekip bundan ancak daha iyi kararla çıkar.
- **Kendi ilkeleri:** tekrar eden sonuçlardan ilke çıkarılır ("şu alanda talep doğrulanmadan bütçe ayırma", "bordro büyümeden gelir tarafını büyüt"). İlkeler panelde görünür ve sonraki mesailerin istemine eklenir, yani şirket kendi yazdığı kurallara göre karar vermeye başlar.

## Kurucu modu: ekibe iş verme

Panelin kurucu alanına bir iş tanımı yazıldığında ekip o mesaide kendi gündemini bırakır ve bu işi önceliklendirir: roller bu iş üzerinden tartışır, karar ve karşı oylar kaydedilir, dört dosya bu konu için üretilir. Karar kartı `Kurucu talebi` etiketiyle görünür. Bu alan yalnız `ADMIN_TOKEN` ile açılır.

## Gerçek ile simülasyonun sınırı

| Bileşen | Niteliği |
|---|---|
| Personalar, şirket, müşteri ve ticari sonuçlar | Kurgusal / sentetik |
| AI görüşleri | OpenAI API yanıtı; anahtar yoksa açıkça etiketlenen kurallar motoru |
| Oylama ve kaynak tahsisi | Açık, hesaplanabilir simülasyon politikası |
| Rapor, CSV, HTML çıktıları | Gerçek, indirilebilir dosyalar; hipotezler saha verisi değildir |
| Maaş, bordro, zam ve işe alım | Simülasyon parası ve kurgusal kadro; gerçek ödeme veya istihdam yok |
| Öğrenme | Kalıcı anılar ve sonuçlara bağlı strateji puanları; model ağırlıkları eğitilmez |
| Otonomi | Uygulama sınırları içinde günlük iş döngüsü; gerçek para harcama, mesaj gönderme veya üretilen kodu sunucuda çalıştırma yok |

Bu deney, AI çalışanlarının gerçek bir ticari şirketi kârlı biçimde yönettiğinin kanıtı değildir. Sentetik sonuçlar, karar ve öğrenme mekanizmasını gözlemlemek içindir. Personalar herhangi bir gerçek çalışanın veya klinik durumun kopyası değildir. Bir işverenin ürünü veya kurumsal beyanı değildir.

## Yerel çalıştırma

Node.js 24+ gerekir.

```sh
npm ci
npm run build
export ADMIN_TOKEN="en-az-24-karakterlik-rastgele-yonetici-anahtari"
export OPENAI_API_KEY="kendi-anahtariniz"
npm start
```

Panel `http://localhost:3000` adresindedir. `.env.example` bir değişken şablonudur; uygulama `.env` dosyasını otomatik okumaz. Geliştirmede API'yi `npm start`, Vite arayüzünü ayrı terminalde `npm run dev` ile çalıştırın. Testler `npm test` ile yürür.

## Railway

- Dockerfile ile tek sürekli çalışan servis.
- `/data` dizinine bağlı kalıcı volume; `DATABASE_PATH=/data/mesai.db`.
- `OPENAI_API_KEY` ve en az 24 karakterlik `ADMIN_TOKEN`, Railway Variables içinde gizli tutulur.
- Varsayılan model `gpt-5-mini`; `OPENAI_MODEL` ile değiştirilebilir. Adapter reasoning ve JSON output destekleyen Responses API modeli bekler.
- Normal bir mesai 10 model çağrısı kullanır: bir mesaide en çok 8 persona görüşü, bir teslim üretimi ve bir retrospektif. Kurucu iş tanımı verirse bir çağrı daha eklenir. Kadro 8 kişiyi aşsa da çağrı sayısı artmaz; o gün sırası gelmeyen roller kurallar motoruyla konuşur, sıra her gün kayar. Aynı gün ikinci bir mesai başlatılacaksa `MAX_DAILY_AI_CALLS` 22 civarına çekilmelidir.
- `PUBLIC_URL` e-postalardaki bağlantıların adresi; canlıda `https://mesailabs.com`.
- `RESEND_API_KEY` ve `MAIL_FROM` bülten gönderimi içindir. Alan adı Resend'de doğrulanmadan gönderim yapılmaz.
- `PHASE_DELAY_MS` mesai aşamaları arasındaki bekleme; varsayılan 9000, üst sınır 25000. İzleyicinin ofisteki hareketi görebilmesi için bir mesai yaklaşık bir dakika sürer.
- `MAX_DAILY_AI_CALLS` varsayılanı 12, üst sınırı 24. `AI_MAX_OUTPUT_TOKENS` varsayılanı 4000, üst sınırı 4000; kişi görüşleri ayrıca 2200 ile sınırlıdır. Çağrı sayısı ve çıktı tokenları sınırlıdır; bu bir kesin dolar harcama limiti değildir.
- Serverless uyku kapalıdır. Zamanlayıcı tarayıcıdan bağımsız olarak sunucuda çalışır.
- `/api/health` sağlık kontrolü; tek replica. Bir güne ait otomatik mesai anahtarı veritabanında benzersizdir.
- Yeniden başlatma sonrası yarım mesai kayıtlı aşamadan devam eder. Hizmet birden çok gün kapalı kalırsa son gün için telafi yapılır; kaçırılan her gün için arka arkaya API harcaması oluşturulmaz.
- İlk kurulum görünür biçimde işaretlenmiş bir kurallı örnek mesai üretir. Sonraki mesailer yapılandırılmış AI bağlantısını kullanır. API sorunu veya kota sınırı oluşursa kurallar desteği ve uyarı görünür olur.

Railway rehberleri: [Kalıcı depolama](https://docs.railway.com/volumes), [Serverless ve uyku](https://docs.railway.com/deployments/serverless), [Yapılandırma](https://docs.railway.com/config-as-code/reference).

## Gözlemci ve kurucu

Herkes paneli ve dosyaları okuyabilir. Panel gerçek zamanlıdır: saat Europe/Istanbul üzerinden işler, akış dört saniyede bir yenilenir, ofisteki hareket o anki mesai aşamasını gösterir. Tekrar oynatma modu yoktur.

Kurucu paneli, sol alttaki kurucu girişi alanından açılır. `ADMIN_TOKEN` yalnız bu panelde girilir; URL'ye veya kaynak koda konmaz. Yetkili kurucu ek mesai başlatabilir ve otomatik zamanlamayı duraklatabilir. Duraklatma devam eden mesaiyi yarıda kesmez, sonraki mesaileri durdurur.

## Hukuki sayfalar ve iletişim

Site dört hukuki sayfa yayınlar: `/gizlilik` (KVKK aydınlatma metni ve gizlilik politikası), `/kosullar` (kullanım koşulları), `/cerez` (çerez politikası — izleme çerezi kullanılmıyor) ve `/iletisim` (iletişim formu). Formdan gelen mesajlar `POST /api/contact` üzerinden Resend ile `CONTACT_TO` ortam değişkenindeki adrese iletilir; bu adres koda veya herkese açık veriye yazılmaz. Üründe kişisel isim, kişisel e-posta veya sosyal medya hesabı geçmez; yayınlanan iletişim adresi iletisim@mesailabs.com'dur.

## Lisans

MIT. Ayrıntı için `LICENSE`.

## Mimari

React + Vite, Express, Node'un SQLite modülü; harici veritabanı servisi gerektirmez. SQLite WAL, kalıcı mesai kilidi, işlemli kayıtlar ve AI yanıt önbelleği kullanılır. Panel dört saniyede bir güncellenir. Son durum sınırlı sayıda kaydı gösterir; eski çıktı ve geçmiş kayıtları veritabanında saklanır.

```text
08.00 zamanlayıcısı → persona görüşleri → karar ve bütçe → görevler / dosyalar
                           ↑                                    ↓
                       kalıcı bellek ← retrospektif ← sentetik pazar testi
```

Kod çalıştırma, tarayıcı kontrolü, e-posta gönderme ve gerçek satış gibi dış yetkiler ajanlara verilmez. İndirilen HTML prototipleri tarayıcıda ağ erişimi olmayan ayrı bir sandbox içinde önizlenir; indirilen dosyaları ayrıca inceleyebilirsiniz. API anahtarı kamuya açık durum yanıtına veya tarayıcıya gönderilmez.
