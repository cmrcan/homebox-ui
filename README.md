# Homebox UI

Homebox için Türkçe, duyarlı ve açık/koyu temalı alternatif frontend. **OpenUI5 1.154.0** ve TypeScript kullanır. Homebox API bağlantısı ve veriler mevcut Homebox sunucusunda kalır.

## v0.4.0 — OpenUI5

- Vue şablonları, Preline ve Tailwind kaldırıldı. Arayüz OpenUI5'in gerçek `sap.m` / `sap.f` kontrolleriyle oluşturulur; Web Components sarmalayıcısı kullanılmaz.
- Horizon açık ve koyu temalar; tercih tarayıcıda saklanır. Mobil menü, klavyeyle gezinme, duyarlı tablo ve ürün kartları.
- OpenUI5 kaynakları, derlenmiş tema CSS dosyaları, ikonlar, fontlar ve lisanslar imajda bulunur. Çalışma sırasında CDN veya internet bağlantısı gerekmez.
- Giriş, şifre göster/gizle, davet koduyla kayıt ve koleksiyon seçimi.
- Genel bakış, envanter arama/filtreleme, arşiv ve sayfalama; kart/liste görünümü.
- Ürün oluşturma/düzenleme, onaylı silme, fotoğraf/belge yükleme, etiket yazdırma bağlantısı.
- Konumlar, etiketler, ürün türleri, alan şablonları ve metin/sayı/evet-hayır/tarih özel alanları.
- Ürün türüne varsayılan alan şablonu bağlama; ürün formuna şablondan alan ekleme.
- Ürün bazında bakım ekleme/tamamlama/silme ve genel bakım listesi.
- Profil, şifre ve koleksiyon ayarları; davet kodu, üye yönetimi ve onaylı hesap silme.
- CSV içe/dışa aktarma, bildirimler ve koleksiyon bakım araçları.

OpenUI5 tüm ekranları oluşturur. `@vue/reactivity` yalnızca mevcut API/oturum/işlem durumunu yönetmek için tutulmuştur.

### Mevcut kurulumu güncelleme

Daha önce yayımlanan imajla kurulmuş `/opt/homebox-ui/compose.yaml` dosyanız için:

```bash
cd /opt/homebox-ui
docker compose pull
docker compose up -d
curl -fsS http://127.0.0.1:3101/healthz
```

Aynı Homebox adresini açın; gerekirse `Ctrl+Shift+R` ile yenileyin. Docker ağı,
`HOMEBOX_UPSTREAM` ve Nginx Proxy Manager hedefi (`homebox-ui:80`) değişmez.
Arayüz güncellemesi veritabanını taşımaz veya Homebox backend sürümünü yükseltmez.

### Bilinen sınırlar

- Ürün türüne bağlı varsayılan şablon seçimi bu tarayıcıda saklanır. Alan şablonlarının kendisi Homebox'ta durur.
- API anahtarları, OIDC ve sunucu yedeklerini yönetme henüz yoktur.
- Yönetim uç noktalarının kullanılabilirliği sunucu sürümüne ve kullanıcının yetkilerine bağlıdır.
- Tarayıcı testleri taklit Homebox API'sini kullanır; bu sürüm kullanıcının canlı sunucusunda henüz denenmemiştir.

## Logo

Sağlanan SVG `src/assets/homebox-logo.svg` dosyasında korunur ve giriş ekranında
oranı değiştirilmeden gösterilir. Koyu tema için görünürlüğü uyarlanır.

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

## Derleme yapısı

`npm ci` sonrasında `postinstall`, `ui5.yaml` içindeki sabit OpenUI5 sürümünü
UI5 CLI ile derler. `scripts/ui5-resources.mjs` üretilmiş kaynakları
`public/resources/` altına taşır; bu klasör git'e eklenmez. Horizon LESS dosyaları
UI5 Tooling ile CSS'e çevrilir ve kütüphane preload/version dosyaları hazırlanır.
`npm run build`, TypeScript kontrolü ve Vite üretim paketini oluşturur.

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

CI, yayımlanan Docker konteynerinin sağlık yanıtını, derlenmiş OpenUI5 kaynaklarını ve Nginx yapılandırmasını kontrol eder. İlk gerçek kurulumda önce ayrı UI portundan giriş/arama/düzenleme/yükleme akışını doğrulayın, ardından NPM hedefini değiştirin.

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
