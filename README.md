# Homebox UI

Homebox için Türkçe, duyarlı ve açık/koyu temalı alternatif frontend. Vue 3, TypeScript ve Tailwind CSS 4 kullanır. Homebox'ın API'sine aynı adres üzerinden bağlanır; veriler Homebox sunucusunda kalır.

Masaüstü ve mobil ekran örnekleri `docs/preview-desktop.png` ve `docs/preview-mobile.png` dosyalarında bulunur.

## v0.1.0 kapsamı

- Homebox hesabıyla giriş; mevcut koleksiyonlar arasında geçiş.
- Toplam ürün, satın alma değeri, konum ve garanti istatistikleri.
- Kart/tablo görünümü; sunucuda arama, konum/etiket filtresi, arşiv ve sayfalama.
- Ürün oluşturma, tam kayıt düzenleme ve onayla silme.
- Marka, model, seri numarası, satın alma tarihi/değeri, garanti bitişi, adet, etiket ve notlar.
- Fotoğraf, fatura, garanti belgesi, kılavuz ve diğer dosyaları yükleme/görüntüleme.
- Konum ve etiket oluşturma/düzenleme.
- Mobil menü, klavye odağı, `/` ile arama, `Esc` ile pencereyi kapatma.
- Sunucuya veri göndermeyen, oturum içi örnek envanter modu.

Bu ilk sürüm tüm Homebox özelliklerini değiştirmez. Bakım takvimi, toplu içe/dışa aktarma, etiket yazdırma, özel alan şeması düzenleme, OIDC, kullanıcı yönetimi ve yedekler için mevcut Homebox arayüzünü kullanın. Düzenleme sırasında mevcut özel alanlar, sigorta, garanti detayları, satış bilgileri ve ürün ilişkileri korunur.

## API uyumluluğu

Varsayılan API, **Homebox v0.26.2** kaynak koduna (`e01dd737238a3fa7e1a6454b37de6c6fc88c86e4`) göre hazırlanmıştır: `/api/v1/entities`, `/entity-types`, `/tags`, `/groups`, `/users`.

Giriş ekranındaki **Bağlantı seçenekleri** altında eski `/items` + `/locations` API'si seçilebilir; bu adaptör v0.23.0 şeması temel alınarak yazılmıştır. Sunucudaki sürümü kontrol edin. Yeni sürümler için otomatik API garantisi verilmez. Kullanıcının canlı Homebox sunucusunda henüz doğrulanmamıştır.

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

`HOMEBOX_URL`, mevcut Homebox'ın API'yi sunan tam adresidir. Vite `/api` isteklerini bu adrese iletir. Tarayıcıdan `http://localhost:5173` adresini açın. Demo için sunucu bağlantısı gerekmez.

## Doğrulama

```bash
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

API testleri kimlik doğrulama/tenant başlıklarını, filtre parametrelerini, konum sayfalamasını, dosya token'larını, multipart yüklemeyi ve düzenlemede bilgi korunmasını kontrol eder. Tarayıcı testleri masaüstü/mobil demo akışını ve kaynak şemasını izleyen **taklit API** ile giriş, oluşturma, dosya yükleme ve oturum sona ermesini kontrol eder. Bunlar gerçek Homebox sunucusuyla entegrasyon testi yerine geçmez.

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
