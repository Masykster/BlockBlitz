# BlockBlitz — HTML5 Offline + Capacitor Android

Versi aplikasi mobile offline dari **BlockBlitz** (dibangun dari `BlockBlitz.html`) menggunakan **Vite + Tailwind CSS v3 + aset lokal + Capacitor 8**. Seluruh font (`Fredoka`, `Inter`), ikon (`Font Awesome`), efek suara (Web Audio API), partikel, tema warna, dan penyimpanan progres berjalan **100% offline** tanpa koneksi internet.

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

## Unduh APK Langsung (GitHub Releases)

Setiap push ke branch `main` otomatis membangun APK terbaru dan menerbitkannya langsung ke halaman **Releases**:
- 👉 **[https://github.com/Masykster/BlockBlitz/releases](https://github.com/Masykster/BlockBlitz/releases)**

Unduh **`BlockBlitz-debug.apk`** langsung dari bagian *Assets* pada rilis `latest` dan instal di HP Android Anda (aktifkan *Izinkan instalasi dari sumber tidak dikenal* bila diminta).

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

# 4. Sinkronisasi hasil build web ke proyek Android
npm run cap:sync

# 5. (Opsional) Generate ulang icon & splash screen setelah ubah SVG di assets/
npm run cap:assets
```

> **Catatan**: File asli `BlockBlitz.html` tetap disimpan di root proyek sebagai backup/referensi.

---

## CI/CD GitHub Actions & Rilis Versi

Workflow [.github/workflows/build-android-apk.yml](.github/workflows/build-android-apk.yml):
- Setiap push ke `main`/`master` otomatis menguji, membangun, dan memperbarui Release **`latest`** dengan `BlockBlitz-debug.apk`.
- Untuk menerbitkan rilis versi permanen (misal `v1.0.0`):
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```
- *(Opsional)* Jika ingin CI juga membangun **Signed Release APK (`BlockBlitz-release.apk`)**, tambahkan 4 **Repository Secrets** di GitHub (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
