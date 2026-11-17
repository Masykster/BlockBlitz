# BlockBlitz — HTML5 Offline + Capacitor Android & iOS (Beta)

Versi aplikasi mobile offline dari **BlockBlitz** (dibangun dari `BlockBlitz.html`) menggunakan **Vite + Tailwind CSS v3 + aset lokal + Capacitor 8** (`v0.0.1-beta`). Seluruh font (`Fredoka`, `Inter`), ikon (`Font Awesome`), efek suara (Web Audio API), partikel, tema warna, dan penyimpanan progres berjalan **100% offline** tanpa koneksi internet.

---

## Fitur Utama & Mode Permainan
- **Main Menu & Lanjutkan per Mode**: Pilihan 4 mode dengan tombol *Lanjutkan* dan skor terbaik terpisah tiap mode:
  1. **Klasik**: Mode endless 8×8 autentik.
  2. **Bom Blast**: Muncul blok bom berpenghitung mundur yang harus dipecahkan sebelum menyentuh `0` (+50 bonus defuse).
  3. **Time Blitz**: Balapan 90 detik dengan bonus `+3 detik × jumlah baris` tiap pembersihan garis (maks 120 detik).
  4. **Petualangan**: Stage bertahap dengan papan rintangan awal dan target baris per level.
- **4 Booster Taktis**: *Acak Balok*, *Putar*, *Palu 3×3* (hancurkan area 3×3 di papan), dan *Undo* (kembalikan 1 langkah terakhir).
- **Pengaturan & Statistik Offline**: Toggle Suara, toggle Getaran Haptics, **3 Tema Warna** (*Biru Galaksi*, *Neon Gelap*, *Hutan Zamrud*), serta catatan statistik pemain.
- **Fullscreen Status Bar & Performa Smooth**: Drag proxy murni GPU (`translate3d`), *immersive sticky* status bar Android, *safe-area* notch/punch-hole, dan tombol Back bertingkat (*Pause → Main Menu → Double-tap keluar*).

---

## Unduh APK & IPA Langsung (GitHub Releases Beta)

Setiap push ke branch `main` atau tag `v*` otomatis membangun **Android Release APK** dan **iPhone iOS IPA** serta menerbitkannya sebagai **Pre-release (`v0.0.1-beta`)** dan memperbarui **`latest`**:
- 👉 **[https://github.com/Masykster/BlockBlitz/releases](https://github.com/Masykster/BlockBlitz/releases)**

### Cara Instalasi
- **Android (`.apk`)**: Unduh **`BlockBlitz-v0.0.1-beta-release.apk`** dari *Assets* pada rilis `v0.0.1-beta` atau `latest`, lalu instal langsung di HP Android (aktifkan *Izinkan instalasi dari sumber tidak dikenal* bila diminta).
- **iPhone / iOS (`.ipa`)**: Unduh **`BlockBlitz-v0.0.1-beta-unsigned.ipa`** (kompatibel iOS 15+), lalu *sideload* ke iPhone menggunakan **Sideloadly**, **AltStore**, atau **SideStore** dengan Apple ID Anda.

---

## Perintah Pengembangan Lokal

```bash
# 1. Jalankan di browser lokal
npm run dev

# 2. Jalankan unit test logika game & mode
npm test

# 3. Build bundle produksi offline + audit bebas CDN eksternal
npm run build
npm run audit:offline

# 4. Sinkronisasi hasil build web ke proyek Android & iOS
npm run cap:sync

# 5. (Opsional) Generate ulang icon & splash screen setelah ubah SVG di assets/
npm run cap:assets
```

> **Catatan**: File asli `BlockBlitz.html` tetap disimpan di root proyek sebagai backup/referensi.

---

## CI/CD GitHub Actions & Rilis Versi

Workflow [.github/workflows/build-android-apk.yml](.github/workflows/build-android-apk.yml) memiliki 3 job otomatis (`build-android`, `build-ios`, `publish-release`):
- Setiap push ke `main`/`master` atau tag `v*` otomatis menjalankan `npm test`, `npm run build`, `npm run audit:offline`, lalu membangun **Android Release APK** (`ubuntu-latest`) dan **iOS IPA** (`macos-latest`), kemudian menerbitkan Pre-release/Release versi saat ini (mis. `v0.0.1-beta`) serta memperbarui Release **`latest`**.
- **Android Signing**: Jika `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, dan `ANDROID_KEY_PASSWORD` belum diset di GitHub Secrets, CI menandatangani Release APK otomatis dengan Beta Release Keystore agar tetap bisa langsung diinstal.
- **iOS Signing (Opsional)**: Default-nya CI menghasilkan `.ipa` *unsigned (sideload-ready)* untuk AltStore/SideStore/Sideloadly. Jika Anda ingin Signed Ad-Hoc/App Store `.ipa`, tambahkan Secrets `IOS_P12_BASE64`, `IOS_P12_PASSWORD`, `IOS_MOBILEPROVISION_BASE64`, dan opsional `IOS_EXPORT_METHOD`.
