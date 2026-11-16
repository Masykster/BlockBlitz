# BlockBlitz — HTML5 Offline + Capacitor Android

Versi aplikasi mobile offline dari **BlockBlitz** (dibangun dari `BlockBlitz.html`) menggunakan **Vite + Tailwind CSS v3 + aset lokal + Capacitor 8**. Seluruh font (`Fredoka`, `Inter`), ikon (`Font Awesome`), efek suara (Web Audio API), partikel, dan penyimpanan progres berjalan **100% offline** tanpa koneksi internet.

---

## Fitur Utama Mobile Offline
- **100% Offline Bundle**: Seluruh aset lokal terbundel di `dist/` dan diverifikasi oleh `npm run audit:offline`.
- **Auto-Save Progres**: Papan 8×8, 3 balok tray, skor, combo streak, dan sisa booster otomatis tersimpan di `localStorage` saat bermain maupun saat aplikasi di-minimize.
- **Haptic Feedback**: Getaran halus via `@capacitor/haptics` saat mengangkat balok, meletakkan balok, memecah baris/kolom, atau Game Over.
- **Portrait Lock & Safe-Area**: Orientasi terkunci Portrait (`AndroidManifest.xml`), mendukung edge-to-edge Android 15/16 lewat `env(safe-area-inset-*)` dan Capacitor `SystemBars`.
- **Tombol Back Android**: Double-tap tombol Back untuk keluar dengan toast konfirmasi *"Tekan sekali lagi untuk keluar"*.
- **Custom App Icon & Splash Screen**: Dihasilkan dari SVG di `assets/` ke seluruh densitas `mipmap-*` dan `drawable*`.

---

## Perintah Pengembangan Lokal

```bash
# 1. Jalankan di browser lokal
npm run dev

# 2. Jalankan unit test logika game
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

## Build APK Otomatis via GitHub Actions (CI/CD)

Workflow siap pakai tersedia di `.github/workflows/build-android-apk.yml`.

### 1. Inisialisasi Git Mandiri & Push ke GitHub
> [!IMPORTANT]
> Pastikan Anda menjalankan `git init` **di dalam folder `D:\Projek\Main\BlockBlastClone`** (bukan memakai `.git` dari folder induk `D:\Projek`) agar file `.github/workflows/build-android-apk.yml` berada di root repository GitHub Anda.

```bash
cd D:\Projek\Main\BlockBlastClone
git init -b main
git add .
git commit -m "feat: initial BlockBlitz HTML5 + Capacitor Android project"
git remote add origin https://github.com/Masykster/BlockBlitz.git
git push -u origin main
```

### 2. Unduh APK dari GitHub Actions
1. Buka tab **Actions** repository di [https://github.com/Masykster/BlockBlitz/actions](https://github.com/Masykster/BlockBlitz/actions).
2. Workflow **Build BlockBlitz Android APK** otomatis berjalan setiap push ke `main`/`master`, tag `v*`, atau bisa dipicu manual lewat tombol **Run workflow**.
3. Setelah status hijau, buka hasil run tersebut lalu unduh **Artifacts → `BlockBlitz-debug-apk`** (`BlockBlitz-debug.apk`).
4. Salin `.apk` ke HP Android dan instal langsung (aktifkan *Izinkan instalasi dari sumber tidak dikenal* bila diminta).

### 3. (Opsional) Signed Release APK & GitHub Releases
Secara default CI selalu menghasilkan `BlockBlitz-debug.apk` yang siap instal tanpa perlu konfigurasi secret.

Jika Anda ingin CI juga membangun **Signed Release APK (`BlockBlitz-release.apk`)**:
1. Buat keystore Android:
   ```bash
   keytool -genkey -v -keystore blockblitz-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias blockblitz
   ```
2. Konversi file `.jks` ke Base64 dan tambahkan 4 **Repository Secrets** di **GitHub Settings → Secrets and variables → Actions**:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. Untuk menerbitkan APK di halaman **GitHub Releases**, dorong tag versi:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

---

## Alternatif: Build APK Lokal lewat Android Studio
Jika ingin mem-build APK langsung di PC:
1. Pasang **Android Studio** (Android SDK API 36 + JDK 21 bawaan Android Studio).
2. Jalankan `npm run cap:sync` lalu `npm run cap:open`.
3. Di Android Studio pilih **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
