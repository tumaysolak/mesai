# MESAI.

**MES + AI.** Her sabah 08.00'de işe gelen kurgusal bir yapay zeka şirketi.

[Canlı şirketi izle](https://mesai-production.up.railway.app) · [GitHub](https://github.com/tumaysolak/mesai)

MESAI, Tümay Solak'ın bağımsız otonom şirket laboratuvarıdır. CEO, CTO, CFO, operasyon, ürün, büyüme, tasarım ve araştırma rolleriyle kurulan sekiz kişilik kurgusal ekip aynı şirketi yönetir. Her sabah **08.00, Europe/Istanbul** saatinde bir mesai başlar. Şirket kazandıkça bordro ödenir, seviye atlayan çalışanın ücreti artar ve kasa uzun bir süreyi karşılayabildiğinde yeni biri işe alınır.

- `/` ürün sayfası: deneyin ne olduğunu ve canlı sayıları anlatır.
- `/panel` izleyici paneli: ofis, kararlar, iş panosu, çıktılar ve öğrenme günlüğü.

## Ne oluyor?

1. Sekiz çalışan kendi geçmişini, şirketin durumunu ve son deneylerini okur.
2. OpenAI bağlıysa her persona bağımsız bir model çağrısıyla fikir, gerekçe ve çekince üretir.
3. Alternatifler geçmiş sonuçlar, rol tercihleri, bütçe ve desteklerle karşılaştırılır. Karar ve karşı oylar görünürdür.
4. Ekip pilot planı, ekonomik senaryo dosyası, ürün prototipi ve müşteri keşfi taslağı üretir.
5. Tekrarlanabilir bir sentetik pazar modeli olumlu veya olumsuz sonuç üretir. Simülasyon kasası, müşteri sayısı ve itibar güncellenir.
6. Sonuçlar kalıcı belleğe yazılır. Her rol günü kendi ölçütüyle okur, dersini yazar; geçmiş başarı/başarısızlık oranı sonraki strateji puanını etkiler ve aynı işin arka arkaya tekrarlanması cezalandırılır.
7. Bordro ödenir, kazanılan müşterilerden bakım geliri işlenir, seviye atlayan çalışan zam alır ve koşullar uygunsa yeni bir çalışan işe alınır. İş ilanı da indirilebilir bir çıktıdır.

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
- Normal bir mesai 10 model çağrısı kullanır: en çok `MAX_DAILY_AI_CALLS - 4` kadar persona görüşü, bir teslim üretimi ve bir retrospektif. Kurucu iş tanımı verirse bir çağrı daha eklenir. Kadro büyüse de çağrı sayısı sabit kalır; sırası gelmeyen roller o gün kurallar motoruyla konuşur.
- `PHASE_DELAY_MS` mesai aşamaları arasındaki bekleme; varsayılan 9000, üst sınır 25000. İzleyicinin ofisteki hareketi görebilmesi için bir mesai yaklaşık bir dakika sürer.
- `MAX_DAILY_AI_CALLS` varsayılanı 12, üst sınırı 24. `AI_MAX_OUTPUT_TOKENS` varsayılanı 4000, üst sınırı 4000; kişi görüşleri ayrıca 2200 ile sınırlıdır. Çağrı sayısı ve çıktı tokenları sınırlıdır; bu bir kesin dolar harcama limiti değildir.
- Serverless uyku kapalıdır. Zamanlayıcı tarayıcıdan bağımsız olarak sunucuda çalışır.
- `/api/health` sağlık kontrolü; tek replica. Bir güne ait otomatik mesai anahtarı veritabanında benzersizdir.
- Yeniden başlatma sonrası yarım mesai kayıtlı aşamadan devam eder. Hizmet birden çok gün kapalı kalırsa son gün için telafi yapılır; kaçırılan her gün için arka arkaya API harcaması oluşturulmaz.
- İlk kurulum görünür biçimde işaretlenmiş bir kurallı örnek mesai üretir. Sonraki mesailer yapılandırılmış AI bağlantısını kullanır. API sorunu veya kota sınırı oluşursa kurallar desteği ve uyarı görünür olur.

Railway rehberleri: [Kalıcı depolama](https://docs.railway.com/volumes), [Serverless ve uyku](https://docs.railway.com/deployments/serverless), [Yapılandırma](https://docs.railway.com/config-as-code/reference).

## Gözlemci ve kurucu

Herkes paneli ve dosyaları okuyabilir. “Demoyu izle” geçmiş mesainin kayıtlarını tekrar oynatır; yeni AI çağrısı veya gerçek durum değişikliği yapmaz.

Kurucu paneli, sol alttaki Tümay Solak alanından açılır. `ADMIN_TOKEN` yalnız bu panelde girilir; URL'ye veya kaynak koda konmaz. Yetkili kurucu ek mesai başlatabilir ve otomatik zamanlamayı duraklatabilir. Duraklatma devam eden mesaiyi yarıda kesmez, sonraki mesaileri durdurur.

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
