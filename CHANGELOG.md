# Changelog

## 0.5.0

- Convert the complete application to native OpenUI5 MVC: UIComponent, manifest routing, XML views/fragments, TypeScript controllers and UI5 JSONModel.
- Replace the custom sidebar/ShellBar with ToolPage, grouped SideNavigation and a ToolHeader with the Homebox logo, search, collection, theme and profile controls.
- Remove Vue reactivity and Vite. Use UI5 CLI, TypeScript-to-UI5 transpilation and UI5's development proxy.
- Configure the REST service URI in manifest.json while preserving Homebox API/session/tenant behavior.
- Preserve inventory, custom fields, organizers, templates, maintenance, users, CSV, notifications and tools.
- Reset session-scoped models on expiry/logout; validate deep links, the native MVC component and responsive navigation.

## 0.4.0

- Replace the Vue template/Preline/Tailwind UI with native OpenUI5 1.154.0 controls.
- Add locally built Horizon light/dark themes, Fiori shell, responsive inventory table and accessible dialogs.
- Preserve Homebox authentication, API adapters, inventory, fields, organizers, maintenance, user and collection management, CSV, notifications and tools.
- Build and serve the complete UI5 runtime locally; preserve the existing Docker/Nginx upstream contract.
- Validate production assets and CSP in browser tests; update desktop, tablet and mobile interaction coverage.

## 0.3.0

- Sağlanan Homebox SVG logosu giriş ekranına, mobil üst bölüme ve masaüstü/mobil menüye eklendi; açık/koyu tema desteği ve sekme simgesi.

- Preline UI 4.2 tema ve varyant stilleri ile Tailwind Forms projeye eklendi.
- 16 px temel yazı, daha büyük metinler, en az 44 px ikon düğmeleri ve 48 px form kontrolleri.
- Telefon/tablet için alt gezinme ve odak tutan, Escape ile kapanan mobil menü.
- Telefonlarda yatay ürün kartları, okunabilir liste ve tam ekran tek sütunlu formlar.
- Giriş ekranı sadeleştirildi; API/bağlantı seçenekleri kaldırıldı. Sunucu uyumluluğu girişten sonra otomatik belirlenir.
- Şifre göster/gizle ve ayrı davet koduyla kayıt görünümü.
- Tablet test projesi; dar ekran, dokunma alanı, gezinme ve API algılama kontrolleri.

## 0.2.1

- Demo giriş düğmesi, örnek envanter verileri ve tüm demo işlem dalları kaldırıldı.
- Ürün, konum/etiket, tür ve şablon işlemleri yalnızca Homebox API üzerinden çalışır.
- Bakım, kullanıcı ve araç sayfalarındaki demo kısıtları kaldırıldı.
- Masaüstü/mobil tarayıcı testleri gerçek giriş akışını kullanan test API verilerine taşındı.
- Ürün ve konum formlarında Vue/TypeScript derlemesini engelleyen iki şablon ifadesi düzeltildi.

## 0.2.0

- Arayüz Preline UI tasarım diline taşındı; tek parça `App.vue` bileşenlere ve ortak bir store'a bölündü.
- Ürünlerde düzenlenebilir özel alanlar (metin, sayı, evet/hayır, tarih).
- Ürün türleri ekranı (ekle, düzenle, sil) ve türe bağlanabilen varsayılan alan şablonu.
- Alan şablonları ekranı ve ürün formunda "Şablondan ekle".
- Kullanıcı ekranı: profil, şifre, koleksiyon, davet kodu, üyeler, hesap silme; giriş ekranında davet koduyla kayıt.
- Bakım kayıtları (ürün detayında ve genel liste), bildirimler, CSV içe/dışa aktarma, toplu bakım araçları ve etiket yazdırma bağlantısı.

## 0.1.0

- Türkçe Vue 3 ve Tailwind CSS 4 frontend.
- Homebox 0.26.2 entities API ve eski items API adaptörü.
- Giriş, koleksiyon seçimi, genel bakış, ürün kayıtları, dosyalar, konumlar ve etiketler.
- Açık/koyu görünüm, mobil navigasyon ve oturum içi demo.
- Mevcut Homebox'a bağımsız Docker frontend olarak bağlantı.
- API ve masaüstü/mobil tarayıcı testleri; GitHub Actions ve GHCR imaj akışı.
