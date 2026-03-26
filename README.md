# 📺 Dizi Takipçi — Chrome Extension

<p align="center">
  <strong>hdfilmcehennemi'de hangi dizi bölümünde kaldığını otomatik takip eden Chrome eklentisi.</strong>
</p>

---

## ✨ Özellikler

- 🔍 **Otomatik Algılama** — Dizi bölüm sayfasını açtığında URL'den dizi, sezon ve bölüm otomatik tespit edilir
- ▶️ **Video Takibi** — Video bitince bölüm numarası otomatik +1 ilerler (%90 geçilince de yedek kayıt yapılır)
- ⏭️ **Otomatik Sonraki Bölüm** — Video bittiğinde 5 saniyelik geri sayımla sonraki bölüme otomatik yönlendirilir (iptal edilebilir)
- 🖼️ **iframe Desteği** — Video player iframe içinde olsa bile çalışır
- 💾 **Kalıcı Kayıt** — Tüm veriler `chrome.storage.local`'da saklanır, tarayıcı kapansa bile kaybolmaz
- 🎨 **Sinematik Arayüz** — Karanlık tema, şık tasarım (Bebas Neue + DM Sans fontları)
- 📋 **Dizi Listesi** — Popup'tan tüm dizileri filtrele, ara, düzenle, sil
- ➕ **Manuel Ekleme** — Otomatik algılamanın yanı sıra `+` butonuyla manuel dizi de ekleyebilirsin

---

## 📸 Ekran Görüntüleri

> <img width="1795" height="952" alt="Ekran görüntüsü 2026-03-27 004722" src="https://github.com/user-attachments/assets/49a973d2-a566-4046-8285-f5a4b9a58c15" />

> <img width="1652" height="788" alt="Ekran görüntüsü 2026-03-27 004157" src="https://github.com/user-attachments/assets/e72fccfc-b5a6-4735-b886-6185dcf5cd97" />


---

## 🚀 Kurulum

1. Bu repoyu klonla veya ZIP olarak indir:
   ```bash
   git clone https://github.com/KULLANICI_ADI/series-tracker-v2.git
   ```
2. Chrome'da `chrome://extensions/` sayfasını aç
3. Sağ üstteki **Geliştirici modu** anahtarını aç
4. **"Paketlenmemiş öğe yükle"** butonuna tıkla
5. İndirdiğin `series-tracker-v2` klasörünü seç
6. Eklenti kuruldu! ✅ hdfilmcehennemi'de herhangi bir dizi bölümü aç, otomatik çalışacaktır.

---

## 📁 Dosya Yapısı

```
series-tracker-v2/
├── manifest.json    → Eklenti tanımı, izinler, content script eşleşmeleri
├── content.js       → Siteye enjekte: URL parse, video dinleme, otomatik yönlendirme
├── background.js    → Service worker: mesaj yönetimi, storage güncellemeleri
├── popup.html       → Eklenti popup arayüzü (HTML)
├── popup.js         → Popup mantığı: liste render, filtreleme, CRUD
└── styles.css       → Karanlık sinematik tema
```

---

## ⚙️ Nasıl Çalışır

### 1. Otomatik Algılama
hdfilmcehennemi'de bir dizi bölümü açtığında, `content.js` URL'yi analiz eder:
```
/dizi/better-call-saul-izle-33346/sezon-3/bolum-9-hd13/
       └── slug                    └── sezon └── bölüm
```
Dizi adı sayfadaki `<h1>` elementinden okunur, bulunamazsa slug'dan üretilir.

### 2. Video Takibi
- `<video>` elementinin `ended` event'i dinlenir
- Video bittiğinde bölüm numarası otomatik +1 ilerletilir
- %90 geçildiğinde de yedek kayıt yapılır (yarım bırakmaya karşı önlem)

### 3. Otomatik Sonraki Bölüm
Video bittiğinde ekranın sağ alt köşesinde geri sayımlı bildirim çıkar:
> ⏭️ Sonraki bölüme **5** saniye içinde geçiliyor...
> 
> `[ İptal Et ]`

### 4. iframe Desteği
Video player çoğu zaman iframe içinde çalışır. Eklenti `all_frames: true` ile hem ana sayfada hem iframe'de aktiftir. iframe'deki video event'leri `background.js` üzerinden ana frame'e iletilir.

### 5. Popup Arayüzü
Eklenti ikonuna tıklayarak:
- 📋 Tüm dizilerini listele
- 🔎 İsme göre ara
- 🏷️ Filtrele: **İzliyorum** / **Beklemede** / **Bitti**
- ✏️ Düzenle, 🗑️ sil, ⏭️ sonraki bölüme atla
- ➕ Manuel dizi ekle

---

## 🌐 Desteklenen Domain'ler

| Domain |
|--------|
| `hdfilmcehennemi.com` |
| `hdfilmcehennemi.net` |
| `hdfilmcehennemi.nl` |
| `hdfilmcehennemi.tv` |
| `hdfilmcehennemi.to` |
| `fullhdfilmcehennemi.com` |
| `hdfilmcehennemi2.com` |

> ⚠️ Site yeni bir domain'e taşınırsa, `manifest.json` içindeki `host_permissions` ve `content_scripts.matches` listelerine yeni domain eklenmelidir.

---

## 🛠️ Geliştirme

### Yeni Domain Ekleme
`manifest.json` dosyasında iki listeye de yeni domain'i ekle:
```json
"host_permissions": [
  "*://*.yenidomain.com/*"
],
"content_scripts": [{
  "matches": [
    "*://*.yenidomain.com/*"
  ]
}]
```
Ardından `chrome://extensions/` sayfasından eklentiyi yenile.

### Storage Yapısı
```json
{
  "dizi_takipci_data": [
    {
      "id": "abc123",
      "slug": "better-call-saul-izle-33346",
      "name": "Better Call Saul",
      "season": 3,
      "episode": 10,
      "status": "watching",
      "note": "",
      "autoAdded": true,
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000
    }
  ]
}
```

| Alan | Açıklama |
|------|----------|
| `slug` | URL'deki dizi tanımlayıcısı |
| `name` | Sayfadan okunan veya slug'dan üretilen dizi adı |
| `season` / `episode` | Kalınan sezon ve bölüm numarası |
| `status` | `watching` · `paused` · `done` |
| `autoAdded` | Otomatik mi eklendi yoksa manuel mi |

---

## 📝 Bilinen Kısıtlamalar

- **Domain değişiklikleri** — Site yeni domain'e geçtiğinde `manifest.json` güncellenmelidir
- **Çoklu profil** — `chrome.storage.local` Chrome profili bazlıdır; farklı profillerde veri paylaşılmaz
- **Otomatik "bitti" tespiti** — Sezon/dizi son bölümü otomatik algılanmaz; popup'tan manuel olarak "Bitti" olarak işaretlenebilir

---

## 📄 Lisans

Bu proje açık kaynaklıdır. İstediğiniz gibi kullanabilir ve değiştirebilirsiniz.
