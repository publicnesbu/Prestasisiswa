# Portal Prestasi Siswa SMKNESBU

Dashboard web modern untuk menampilkan data prestasi siswa **SMK Negeri 1 Bumijawa**. Data diambil otomatis dari Google Spreadsheet — tanpa backend, tanpa database.

## Fitur

- Statistik total prestasi & siswa terdaftar
- Pencarian multi-kolom (NIS, nama, kegiatan, peringkat, dll.)
- Filter tingkat lomba (Kabupaten, Provinsi, Nasional, Internasional)
- Thumbnail foto dari Google Drive
- Feed kartu ala Instagram dengan foto prestasi
- Bagikan langsung ke WhatsApp, Facebook, X, Telegram, atau salin teks
- Urutan otomatis dari tanggal lomba terbaru
- Refresh data manual

## Struktur Spreadsheet

Buat Google Spreadsheet dengan dua sheet:

### Sheet `PRESTASI`

| Kolom | Contoh |
|-------|--------|
| nama_kegiatan | Lomba Web Design |
| penyelenggara | Disdik Jateng |
| nis | 1234567890 |
| nama_siswa | Budi Santoso |
| tanggal | 2025-03-15 |
| tempat | Semarang |
| tingkat_lomba | Provinsi |
| peringkat | Juara 1 |
| dokumen | https://drive.google.com/... |
| foto | https://drive.google.com/... |

### Sheet `DATASISWA`

| Kolom | Contoh |
|-------|--------|
| nis | 1234567890 |
| nama_peserta_didik | Budi Santoso |
| kelas | XII RPL 1 |
| jenis_kelamin | L |

## Konfigurasi

1. Buka `app.js` dan ganti `SHEET_ID` dengan ID spreadsheet Anda (dari URL Google Sheets).
2. Atur spreadsheet menjadi **"Anyone with the link can view"** (publik).
3. Pastikan nama sheet persis: `PRESTASI`, `DATASISWA`, dan `AKUN`.
4. Buat sheet `AKUN` dengan kolom berikut:

| IDUSER | USER | NAMAUSER | PASSWORD | ROLE |
|--------|------|----------|----------|------|
| 1 | admin | Administrator | admin123 | admin |

Contoh akun login di sheet `AKUN` akan otomatis dicocokkan di halaman login admin.

## Login Admin & Manajemen Prestasi

Halaman login sudah ditambahkan di UI utama. Saat pengguna berhasil login menggunakan data di sheet `AKUN`, maka akan tampil panel untuk:

- melihat data prestasi terkini
- menambah prestasi baru
- menyimpan data ke sheet `PRESTASI`

Supaya penambahan data dapat berjalan ke Google Sheet secara nyata, gunakan Google Apps Script (contoh file `apps-script.gs` yang tersedia di workspace) lalu isi `ADMIN_SCRIPT_URL` di `app.js` dengan URL deployment Apps Script.

### Contoh Apps Script

1. Buka Google Apps Script.
2. Buat project baru.
3. Salin isi file `apps-script.gs`.
4. Ganti `SHEET_ID` di script dengan ID spreadsheet Anda.
5. Deploy sebagai Web App.
6. Salin URL deployment ke `ADMIN_SCRIPT_URL` di `app.js`.

Dengan cara ini, halaman admin bisa login dari `AKUN` dan menambahkan data baru ke `PRESTASI`.

## Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit: Portal Prestasi Siswa SMKNESBU"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Lalu di GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**.

Situs akan tersedia di `https://USERNAME.github.io/REPO/`.

## Jalankan Lokal

Cukup buka `index.html` di browser, atau gunakan live server:

```bash
npx serve .
```

## File

| File | Fungsi |
|------|--------|
| `index.html` | Struktur halaman |
| `styles.css` | Desain UI |
| `app.js` | Logika fetch & render data |
| `logo.png` | Logo sekolah |

## Lisensi

Proyek ini dibuat untuk keperluan internal SMK Negeri 1 Bumijawa.
