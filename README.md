# Homebox UI

Homebox için Türkçe, duyarlı ve açık/koyu temalı alternatif frontend. Vue 3, TypeScript, Tailwind CSS 4 ve Preline UI 4.2 tema/varyant stillerini kullanır. Homebox'ın API'sine aynı adres üzerinden bağlanır; veriler Homebox sunucusunda kalır.

Masaüstü ve mobil ekran örnekleri `docs/preview-desktop.png` ve `docs/preview-mobile.png` dosyalarında bulunur.

## v0.3.0 kapsamı

- Preline UI tema ve varyant stilleri; Tailwind Forms ile tutarlı form kontrolleri. Etkileşimler Vue ve yerel HTML dialog ile yönetilir.
- Telefon ve tablet odaklı yerleşim: 16 px temel yazı, büyük kontroller, alt gezinme ve odak tutan mobil menü.
- Dar ekranda tek sütunlu, tam ekran ürün formları; tablette kart ızgarası; telefonda yatay ürün kartları ve tablo yerine okunabilir liste.
- Sade giriş ekranı: e-posta ve şifre; şifre göster/gizle; ayrı davet koduyla kayıt görünümü. API sürümü seçilmez.
- Giriş, koleksiyon seçimi, genel bakış, kart/tablo envanter, arama, filtre, arşiv ve sayfalama.
- Ürün oluşturma, düzenleme, silme; fotoğraf ve belge yükleme; konum ve etiket yönetimi.
- **Özel alanlar:** her üründe metin, sayı, evet/hayır ve tarih alanları.
- **Ürün türleri:** ekle, düzenle, sil; türe varsayılan alan şablonu bağla (yeni ürün eklerken alanlar otomatik gelir).
- **Alan şablonları:** şablon oluştur/düzenle/sil; ürün formunda "Şablondan ekle".
- **Kullanıcılar:** profil, şifre, koleksiyon adı/para birimi, davet kodu oluşturma, üye listesi/çıkarma, hesap silme. Yeni kişi giriş ekranındaki "Davet koduyla hesap oluştur" bölümünden kayıt olur.
- **Bakım:** ürün detayında kayıt ekleme/tamamlama/silme; genel bakım listesi.
- **Araçlar:** CSV içe/dışa aktarma, bildirimler, toplu bakım eylemleri, etiket yazdırma bağlantısı.
- Yalnızca Homebox hesabıyla giriş; envanter ve değişiklikler doğrudan Homebox API üzerinden yönetilir.

### Bilinen sınırlar

- Ürün türüne bağlı varsayılan şablon seçimi **bu tarayıcıda** saklanır (Homebox'ta tür başına şema olmadığı varsayımıyla). Alan şablonlarının kendisi Homebox'ta durur.
- Kullanıcı yönetimi, bakım, bildirim, içe/dışa aktarma ve etiket uç noktaları Homebox'ın bilinen API yollarına göre yazıldı ve canlı sunucuda doğrulanmadı. Yollar `src/api.ts` içinde tek yerde durur; farklıysa orada düzeltin.
- API anahtarları, OIDC ve yedekler henüz yok.
- `docs/preview-*.png` görselleri eski tasarımdır.

## Logo

Giriş ekranı, masaüstü kenar çubuğu ve mobil üst bölüm aynı `HomeboxBrand` bileşenini kullanır.
Sağlanan Homebox SVG dosyası `src/assets/homebox-logo.svg` konumunda bulunur ve üretim paketine
inline olarak dahil edilir. Oranları korunur; yazı ve vurgu rengi açık/koyu temadan gelir.
Tarayıcı sekmesi simgesi aynı SVG içindeki kutu sembolünden oluşturulmuştur.

## API uyumluluğu

Varsayılan API, **Homebox v0.26.2** kaynak koduna (`e01dd737238a3fa7e1a6454b37de6c6fc88c86e4`) göre hazırlanmıştır: `/api/v1/entities`, `/entity-types`, `/tags`, `/groups`, `/users`.

API ailesi girişten sonra sunucudan otomatik belirlenir. `/entity-types` destekleniyorsa entities API kullanılır. Bu uç nokta 404 döndürürse eski `/items` uç noktasının çalıştığı doğrulanır ve legacy adaptörü seçilir. Oturum, ağ ve diğer sunucu hataları sürüm değişikliği olarak yorumlanmaz. Legacy adaptörü v0.23.0 şeması temel alınarak yazılmıştır; yeni sunucu sürümleri için otomatik uyumluluk garantisi verilmez.

## Mevcut Homebox'a bağlama (Docker)

Bu Compose dosyası **yalnızca frontend** başlatır. Homebox'ı yükseltmez, mevcut volume'leri veya veritabanını bağlamaz. Mevcut Homebox konteynerini çalışır bırakın.

1. Homebox konteynerinin adını ve Docker ağını öğrenin:

   ```bash
   docker ps --format 'table {{.Names}}\t{{.Ports}}'
   docker inspect homebox --format '{{json .NetworkSettings.Networks}}'
   ```

   Konteyner adı farklıysa `homebox` yerine onu yazın.

2. Bu projeyi sunucuda açın. `.env.example` dosyasını `.env` olarak kopyalayın:

   ```bash
   cp .env.example .env
   ```

3. `.env` içinde gerçek ağ ve konteyner adını yazın:

   ```dotenv
   HOMEBOX_DOCKER_NETWORK=homebox_default
   HOMEBOX_UPSTREAM=http://homebox:7745
   HOMEBOX_UI_PORT=3101
   HOMEBOX_UI_BIND=127.0.0.1
   ```

   Ağ, kullanıcı tanımlı bir Docker bridge ağı olmalıdır. Homebox yalnızca varsayılan `bridge` üzerindeyse yeni bir ortak ağ oluşturabilirsiniz:

   ```bash
   docker network create homebox-ui-network
   docker network connect homebox-ui-network homebox
   ```

   Sonra `HOMEBOX_DOCKER_NETWORK=homebox-ui-network` yazın. Homebox Compose ile yönetiliyorsa yeniden oluşturulduğunda bu ağ üyeliğini korumak için ağı kendi Compose dosyasına da ekleyin.

4. Frontend'i başlatın:

   ```bash
   docker compose up -d --build
   ```

   Aynı sunucudan `http://127.0.0.1:3101` adresini açın. LAN üzerinden erişmek için bind değerini `0.0.0.0` yapıp yeniden başlatın. Önceden kurulu Homebox arayüzü kendi portunda çalışmaya devam eder.

### Nginx Proxy Manager ile aynı alan adında kullanma

- Yeni UI konteynerini NPM'nin bridge ağına da bağlayın:

  ```bash
  docker network connect NPM_AG_ADI homebox-ui
  ```

- Proxy Host hedefi: **HTTP / `homebox-ui` / `80`**.
- Mevcut Homebox alan adını bu hedefe yönlendirin. Frontend içindeki Nginx `/api/` isteklerini mevcut Homebox'a iletir; tarayıcıda CORS ayarı gerekmez.
- NPM macvlan kullanıyorsa UI'yi `0.0.0.0:3101` üzerinde yayınlayıp NPM'den sunucunun erişilebilir LAN adresine yönlendirin. macvlan konteynerlerinin ana makineye varsayılan erişim kısıtını ağınızda ayrıca çözmeniz gerekebilir; ağ yapılandırmasını otomatik değiştirmeyin.
- Geri dönmek için NPM hedefini önceki Homebox adresi/portuna alın, ardından UI'yi `docker compose down` ile durdurun.

Dosyalar varsayılan olarak 100 MB ile sınırlıdır; gerekirse `deploy/default.conf.template` içindeki `client_max_body_size` değerini değiştirin. Oturum bilgileri sessionStorage içinde tutulur; şifre saklanmaz. Dosya URL'leri upstream'in dosyalara özel token'ını kullanır; proxy bu URL'leri erişim loguna yazmaz.

## Yerel geliştirme

Node.js 22 veya daha yeni sürüm:

```bash
npm ci
HOMEBOX_URL=http://SUNUCU_IP:3100 npm run dev
```

`HOMEBOX_URL`, mevcut Homebox'ın API'yi sunan tam adresidir. Vite `/api` isteklerini bu adrese iletir. Tarayıcıdan `http://localhost:5173` adresini açın. Uygulamayı kullanmak için çalışan bir Homebox sunucusu ve kullanıcı hesabı gerekir.

## Doğrulama

```bash
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

API testleri kimlik doğrulama/tenant başlıklarını, filtre parametrelerini, konum sayfalamasını, dosya token'larını, multipart yüklemeyi ve düzenlemede bilgi korunmasını kontrol eder. Tarayıcı testleri kaynak şemasını izleyen **taklit API** ile masaüstü, telefon ve tablet üzerinde giriş, arama, filtreleme, düzenleme, silme, özel alanlar, dosya yükleme ve oturum sona ermesini kontrol eder. Geçersiz girişin envanteri açmadığı da doğrulanır. Girişte API seçeneği olmadığı, giriş alanlarının okunabilir boyutu, şifre görünürlüğü, mobil menü ve 320–1440 px genişliklerde yatay taşma da kontrol edilir. Test verileri yalnızca testlerde bulunur. Bunlar gerçek Homebox sunucusuyla entegrasyon testi yerine geçmez.

Docker yapılandırması bu geliştirme ortamında Docker bulunmadığı için çalıştırılmamıştır. İlk gerçek kurulumda önce ayrı UI portundan giriş/arama/düzenleme/yükleme akışını doğrulayın, ardından NPM hedefini değiştirin.

## GitHub repo ve container image

Repo: [cmrcan/homebox-ui](https://github.com/cmrcan/homebox-ui).

Sunucuda projeyi almak ve kurmak için:

```bash
git clone https://github.com/cmrcan/homebox-ui.git
cd homebox-ui
cp .env.example .env
# .env içinde mevcut Homebox Docker ağını ve adresini yazın.
docker compose up -d --build
```

Repo private ise klonlama sırasında GitHub hesabınızla kimlik doğrulamanız gerekir.

CI, test ve build sonrası `ghcr.io/cmrcan/homebox-ui:latest` imajını amd64/arm64 için üretir. Repo private ise GHCR'den çekmek için ayrıca giriş gerekebilir. İmaj hazır olduktan sonra Compose içindeki yerel `image` değerini bu adresle değiştirip `build` satırını kaldırabilirsiniz.

## Kaynak ve lisans

Bağımsız frontend uygulaması; Homebox backend kodu veya veritabanı bu projeye dahil değildir. API sözleşmeleri [sysadminsmedia/homebox](https://github.com/sysadminsmedia/homebox) kaynak koduyla karşılaştırılmıştır. Homebox ekibine ve özgün projenin geliştiricilerine teşekkürler.

Bu bağımsız frontend projesi, repo oluşturulurken seçilen MIT lisansı ile sunulur; tam metin [LICENSE](LICENSE) dosyasındadır. Homebox backend bu repoya dahil değildir ve kendi lisansı altında dağıtılır.
