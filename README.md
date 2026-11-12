# Homebox UI

Homebox için Türkçe, duyarlı alternatif frontend. **OpenUI5 1.154.0** üzerinde standart **MVC** uygulamasıdır: `UIComponent`, `manifest.json`, UI5 Router, XML view/fragment, TypeScript controller ve `JSONModel`. Veriler mevcut Homebox backend'inde kalır.

## v0.5.0 — UI5 MVC ve ToolPage

- Üstte Homebox logolu `sap.tnt.ToolHeader`: hızlı arama, koleksiyon seçimi, yenileme, tema ve profil.
- `sap.tnt.ToolPage` içinde gruplu `SideNavigation`; altta ürün ekleme, kullanıcılar, araçlar ve çıkış. Masaüstünde daraltılabilir, telefonda açılıp kapanır.
- Varsayılan Horizon koyu tema; mevcut açık/koyu tercihi korunur. Homebox SVG açık/koyu temada kendi renkleriyle gösterilir.
- Her sayfa XML view, kullanıcı olayları ayrı controller, tekrar kullanılan formlar/pencereler XML fragment olarak tanımlıdır.
- Tüm uygulama durumu ve form bağlamaları UI5 `JSONModel` ile yönetilir. Vue reaktivitesi ve Vite kaldırılmıştır.
- `manifest.json` routing ayarları URL hash'lerini ve doğrudan sayfa bağlantılarını yönetir (`#inventory`, `#locations`, `#templates`, vb.).
- Giriş/oturum yenileme, koleksiyon seçimi, envanter arama/filtre/arşiv/sayfalama, kart/tablo görünümü.
- Ürün ekleme/düzenleme/onaylı silme, fotoğraf/belge yükleme ve etiket yazdırma bağlantısı.
- Konumlar, etiketler, türler, özel alanlar ve alan şablonları; türe varsayılan şablon ve şablondan alan ekleme.
- Ürün bakım kayıtları, genel bakım listesi, profil/şifre/koleksiyon, davet ve üye yönetimi.
- CSV içe/dışa aktarma, bildirimler ve toplu bakım araçları.

## Geliştirme yapısı

| Dosya / klasör                  | Görev                                                                    |
| ------------------------------- | ------------------------------------------------------------------------ |
| `webapp/Component.ts`           | UI5 component yaşam döngüsü, model ve Router kurulumu                    |
| `webapp/manifest.json`          | Kütüphaneler, root view, routing, REST veri kaynağı, CSS                 |
| `webapp/view/`                  | Sayfaların XML view dosyaları                                            |
| `webapp/controller/`            | Ekran olayları ve işlem akışları; ortak davranışlar BaseController'da    |
| `webapp/fragment/`              | Ürün, konum, şablon ve kayıt pencereleri; ortak XML alan editörü         |
| `webapp/model/AppModel.ts`      | UI5 JSONModel durumu, oturum, koleksiyon ve envanter işlemleri           |
| `webapp/model/formatter.ts`     | Görüntüleme formatları                                                   |
| `webapp/service/HomeboxApi.ts`  | Homebox REST istemcisi; auth, tenant, API adaptörleri ve dosyalar        |
| `webapp/assets/`, `webapp/css/` | Homebox logoları ve yerleşim stilleri                                    |
| `ui5.yaml`                      | OpenUI5 sürümü, framework kütüphaneleri, build ve development middleware |

Homebox bir REST API sunduğu için servis katmanı bu sözleşmeyi kullanır.
Component, `manifest.json` içindeki `sap.app/dataSources/homebox/uri` adresini
servise verir; controller'lar servisi AppModel üzerinden kullanır. OData protokolü
varsayılmaz. Kullanıcı token'ı ve `X-Tenant` davranışı korunur.

## Bilgisayarda çalıştırma

Node.js 22 veya üzeri kullanın. Windows PowerShell'de:

```powershell
git pull --ff-only origin main
npm.cmd ci
$env:HOMEBOX_URL = "http://SUNUCU_IP:7745"
npm.cmd run dev
```

`SUNUCU_IP` yerine Homebox backend'inizin erişilebilir adresini yazın.
Tarayıcıdan `http://localhost:5173` adresini açın. `npm run dev`, UI5 CLI server'ını
başlatır; TypeScript modülleri UI5 modüllerine dönüştürülür. UI5 proxy middleware
`/api` isteklerini `HOMEBOX_URL` adresindeki `/api` yoluna iletir.

İlk `dev` veya `build` sırasında UI5 Tooling framework kütüphanelerini indirip
önbelleğe alır. Ayrı bir `postinstall`/kaynak kopyalama adımı gerekmez.
Kaynak değişikliklerinden sonra tarayıcıyı yenileyin.

Yeni bir UI5 kütüphanesi kullanacaksanız `ui5.yaml` içindeki `framework.libraries`
listesine ve `webapp/manifest.json` içindeki `sap.ui5.dependencies.libs` alanına
ekleyin. Tüm OpenUI5 kaynaklarının ayrı klonu inceleme/geliştirme içindir;
uygulamanın kütüphane sürümünü `ui5.yaml` belirler.

## Derleme ve doğrulama

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run preview
```

Üretim derlemesi `ui5 build --all` ile yapılır. TypeScript controller'lar UI5
modüllerine çevrilir; XML view/fragment'ler component preload'a dahil edilir;
Horizon temaları, framework kütüphaneleri ve sürüm metadata'sı `dist/` altına
hazırlanır. Runtime için CDN bağlantısı gerekmez. `preview` yalnızca derlenmiş
arayüzü incelemek ve test etmek içindir; backend bağlantısıyla geliştirme için
`npm run dev` kullanın.

API testleri veri koruma, auth/tenant başlıkları, dosya yükleme ve yapılandırılan
REST URI'sini kontrol eder. Tarayıcı testleri masaüstü, telefon ve tablette taklit
Homebox API'si ile çalışır. Kullanıcının canlı Homebox sunucusundaki son doğrulama
kurulumdan sonra yapılır.

## Mevcut Docker kurulumunu güncelleme

```bash
cd /opt/homebox-ui
docker compose pull
docker compose up -d
curl -fsS http://127.0.0.1:3101/healthz
```

Ardından aynı Homebox adresini açıp gerekirse `Ctrl+Shift+R` ile yenileyin.
Mevcut `HOMEBOX_UPSTREAM`, Docker ağı ve Nginx Proxy Manager hedefi
(`homebox-ui:80`) aynı kalır. Backend sürümü ve veritabanı bu işlemle değiştirilmez.

## Bilinen sınırlar

- Ürün türüne bağlı varsayılan şablon tercihi bu tarayıcıda saklanır; alan şablonlarının kendisi Homebox'ta durur.
- API anahtarları, OIDC ve sunucu yedeklerini yönetme henüz yoktur.
- Yönetim uç noktaları ve yetkiler Homebox backend sürümüne bağlıdır.

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
