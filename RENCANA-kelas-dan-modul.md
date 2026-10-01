# Rencana: sederhanakan model menjadi Kelas + Modul

Status: **RENCANA — belum ada kode yang ditulis.**
Keputusan yang sudah diambil: `jalur` dibuang total (andalakan `modul.kategori`), migrasi besar sekaligus.

---

## 1. Garis pemisah yang dipakai

Tidak semua kemunculan `jalur` bisa dihapus dengan perlakuan yang sama. Ada dua jenis:

| Jenis | Contoh | Perlakuan |
|---|---|---|
| **Taksonomi / kunci join** | `modul.jalur`, `batch.jalur`, `peserta.jalur`, `soal_paket.jalur` | **HAPUS** |
| **Label cakupan konten** | `rubrik.jalur`, `pendaftar.jalur` | **JADI KOLOM TEKS BEBAS** |

Alasan perbedaan ini:

- `modul`, `kelas`, `peserta`, `paket soal` saling berelasi lewat `jalur` sebagai kunci. Inilah sumber bug: nilai yang sama disimpan di 4 tempat tanpa constraint silang, dan hasilnya 2 peserta + 2 paket soal sudah tidak cocok.
- `rubrik` isinya benar-benar spesifik program — "Arsitektur RAG" (B3), "Kualitas prompt" (B1), "Kreativitas output" (A). Ini isi, bukan relasi.
- `pendaftar` menyimpan minat calon peserta (6 baris). Ini data prospek, bukan taksonomi.

---

## 2. Skema target

Empat tabel inti + satu tabel join. Tidak ada lagi konsep jalur.

```
kelas        (id, kode, nama, status, tanggal_mulai, tanggal_akhir,
              kapasitas_maks, instruktur_utama_fk, asisten_fk, created_at)
modul        (id, kode, judul, kategori, urutan_sesi, durasi_menit, content_md, ...)
jadwal_sesi  (id, modul_id, KELAS_ID, kode_sesi_friendly, judul_sesi,
              tanggal_kelas, jam_mulai, jam_akhir, link_rapat, lokasi, status_sesi, ...)
peserta      (id, user_id, nama_lengkap, ..., KELAS_ID, ...)      -- tanpa jalur
sesi_peserta (id, sesi_id, peserta_id)                            -- satu-satunya sumber penugasan
```

Tabel pendukung **tidak tersentuh** — semuanya sudah bergantung ke `peserta` atau `sesi_peserta`, bukan ke `jalur`:
`absensi`, `catatan_ketik`, `learning_sketches`, `portfolio_item`, `pembayaran`, `quiz_attempt`, `soal_butir`, `soal_paket`, `lesson_plan_segmen`, `studi_kasus`, `parent_user`, `parent_child_link`, `rubrik`, `pendaftar`, `sertifikat`, `placement_respons`, `survei_respons`, `soal_butir_view`.

`soal_paket.jalur` dihapus; `kode_paket` dan `sesi_target` sudah memuat kode modul (`PRE-B201`, `POST-G01`, `sesi_target = 'B201'`), jadi tidak ada informasi yang hilang.

---

## 3. Objek yang dihapus

| Objek | Alasan |
|---|---|
| tabel `batch` (6 baris) | digantikan `kelas` |
| `peserta.jalur` | sumber bug yang sudah terbukti |
| `modul.jalur` | digantikan `modul.kategori` yang sudah ada (ETHC, FND, TOOL, PROJ, PRES, PRMP, PROD, CODE, AUTO, ARCH) |
| `jadwal_sesi.batch_id` | diganti `kelas_id` |
| `rubrik.jalur` → `rubrik.program text` | label cakupan isi |
| `pendaftar.jalur` → `pendaftar.minat_program text` | label minat calon peserta |
| `soal_paket.jalur` → 4 baris jadi `soal_paket.program text` | hanya paket generik `PRE/POST-TEST-JALUR-B1` yang butuh; 113 baris lain dihapus langsung |
| fungsi `public.my_batch_ids()` | → `public.my_kelas_ids()` |
| policy `batch_read`, `batch_write_admin`, `batch_write_instruktur` | → `kelas_read`, `kelas_write_admin`, `kelas_write_instruktur` |
| halaman `/kelola-batch` (`KelolaBatch.tsx`) | duplikat `/kelola-kelas`, keduanya menulis tabel yang sama |
| blok "Kelola Jalur" di `KelolaModul.tsx` (119 baris) | mengelola tabel `jalur` yang **tidak pernah dibuat** di database |

---

## 4. Migration `0025_kelas_dan_modul.sql`

Semua langkah dalam satu file, satu transaksi. Urutan penting — jangan dibalik.

| # | Langkah | Catatan |
|---|---|---|
| 0 | `0024a_dump_sebelum_refactor.sql` (file terpisah) | dump 7 tabel ke tabel `_backup_*`. **WAJIB**, ini satu-satunya rollback |
| 1 | `create table kelas` + salin isi `batch` (tanpa kolom `jalur`) | `kelas.kode` = `batch.kode_batch` |
| 2 | `alter table peserta rename column batch_id to kelas_id` | rename lebih aman daripada tambah+hapus |
| 3 | `alter table jadwal_sesi rename column batch_id to kelas_id` | idem |
| 4 | buat `my_kelas_ids()` + 3 policy `kelas_*`, drop policy `batch_*` | ikut `alter table kelas enable row level security` |
| 5 | backfill `rubrik.program` / `pendaftar.minat_program` dari `jalur` | sebelum drop |
| 6 | backfill `soal_paket.program` untuk 4 paket `*-TEST-JALUR-*` | sebelum drop |
| 7 | perbarui RPC: `nilai_kuis` (0022), `daftar_akun` (0021), `admin_create_peserta` (0013/0019) | lihat bagian 5 |
| 8 | `drop table batch` | cascades ke `jadwal_sesi.batch_id`? **tidak**, sudah di-rename di langkah 3 |
| 9 | `drop column` jalur di `modul`, `peserta`, `rubrik`, `pendaftar`, `sertifikat`, `soal_paket` | satu per satu, cek error |
| 10 | `notify pgrst, 'reload schema'` | |

Yang **tidak** diubah: nama tabel `jadwal_sesi` dan `sesi_peserta` tetap, supaya diff-nya kecil dan tidak menyentuh seluruh 20 tabel pendukung.

---

## 5. RPC yang perlu diperbarui

| RPC | File asal | Yang perlu diubah |
|---|---|---|
| `nilai_kuis` | 0022 | membaca `peserta.jalur` ke `v_jalur` tapi **tidak memakainya** untuk filter (ada komentar sengaja di baris 76). Cukup hapus variabelnya. |
| `daftar_akun` / registrasi | 0021 | parameter `p_jalur text default 'A'` dan `p_batch_id uuid`. Harus jadi `p_kelas_id`. Param `p_jalur` diterima lalu diabaikan supaya tidak broke client lama. |
| `admin_create_peserta` | 0013, 0019 | sama — ganti `p_batch_id` → `p_kelas_id`, `p_jalur` diabaikan. |
| `my_batch_ids()` | 0002 | dipakai 3 policy; dipecah di langkah 4. |

`0022` baris 194 menyisipkan profil Budi ke batch dengan `where b.jalur = 'B1'` — harus jadi `where k.kode = 'PAHAI-B1-2601'`.

---

## 6. Verifikasi (jalankan sebagai query terpisah, setelah migration)

Semua harus mengembalikan `0`:

```sql
-- a. tidak ada jadwal yang menunjuk kelas yang tidak ada
select count(*) from jadwal_sesi j
  left join kelas k on k.id = j.kelas_id where k.id is null;

-- b. tidak ada peserta yang menunjuk kelas yang tidak ada
select count(*) from peserta p
  left join kelas k on k.id = p.kelas_id where p.kelas_id is not null and k.id is null;

-- c. jumlah sesi per peserta tidak berubah (sebelum: 8)
select count(*) from sesi_peserta;

-- d. tidak ada sisa kolom jalur
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and column_name in ('jalur','batch_id');

-- e. jumlah modul & paket soal tidak berubah (48 & 117)
select (select count(*) from modul) as modul, (select count(*) from soal_paket) as paket;
```

Lalu cek manual di aplikasi: `/belajar` tiap peserta, `/absensi` instruktur, `/kelola-kelas`, `/kelola-sesi`, `/kuis`, `/pendaftaran`.

---

## 7. Rollback

- Sebelum migration: `pg_dump`/SQL Editor, atau rely on `_backup_*` tables.
- Sesudah migration: `batch` sudah di-drop, jadi rollback harus restore penuh dari dump. Karena itu langkah 0 tidak bisa dilewati.
- Kalau ragu, jalankan langkah 1–7 dulu (tidak ada yang hilang), verifikasi, baru lanjut 8–10.

---

## 8. Perubahan frontend

### Inti (tidak banyak — alur belajar sudah tidak bergantung jalur)
| File | Perubahan |
|---|---|
| `src/services/penugasan.ts` | **tidak berubah** secara fungsional. Hanya `urutModulDariSesi` (baris 52) yang perlu tiebreaker: `urutan_sesi` sekarang bisa seri antar program, jadi sort jadi `urutan_sesi` lalu `kode`. |
| `src/pages/Belajar.tsx` | hapus pemanasan cache jalur (baris 49–50) |
| `src/pages/Sesi.tsx` | tidak berubah |

### Layer service
| File | Perubahan |
|---|---|
| `src/services/modul.ts` | hapus `listModulByJalur`, `listModulByKategori(jalur,…)`, `listJalurInfo`, `listJalurs`, `createJalur`, `updateJalur`, `deleteJalur`. Ubah `getModulFromCache` (baris 81) yang meng-loop daftar jalur hardcode → satu kunci cache `modul-semua`. `listJadwalByBatch` → `listJadwalByKelas`. |
| `src/services/kelas.ts` (baru) | `listKelas`, `createKelas`, `updateKelas`, `deleteKelas` —Kpindahkan dari `KelolaKelas.tsx` |
| `src/types/index.ts` | hapus `Jalur`, `JalurInfo`, `JALUR_FALLBACK`; `Peserta.batch_id` → `kelas_id`; tambah tipe `Kelas` |

### Halaman admin
| File | Perubahan |
|---|---|
| `src/pages/KelolaKelas.tsx` | jadi satu-satunya UI kelas (87 baris `batch`) |
| `src/pages/KelolaBatch.tsx` | **dihapus**, route `/kelola-batch` dihapus dari `App.tsx` + `Layout.tsx` |
| `src/pages/KelolaModul.tsx` | hapus 119 baris UI jalur; filter kategori pakai `modul.kategori` |
| `src/pages/KelolaSesi.tsx` | `batch_id` → `kelas_id` (35 baris) |
| `src/pages/KelolaPeserta.tsx` | hapus kolom jalur dari form |
| `src/pages/Absensi.tsx` | `batch_id` → `kelas_id` (41 baris) |
| `src/pages/Kuis.tsx` | filter paket pakai awalan `kode_paket`, bukan `jalur` |

### Marketing / pendaftaran
| File | Perubahan |
|---|---|
| `src/pages/Landing.tsx`, `Pendaftaran.tsx`, `MarketingDashboard.tsx` | daftar program jadi konstanta frontend (`PROGRAM: {kode, nama,Deskripsi, harga, usia, jumlahSesi}`), dikirim sebagai `minat_program` |
| `src/pages/KelolaSoal.tsx` | hapus filter jalur di layar soal |

---

## 9. Hubungan dengan migration 0024 (yang belum dijalankan)

`0024_pembenahan_data_penugasan.sql` sudah ditulis tapi belum sempat berhasil dijalankan. Kalau 0025 langsung dikerjakan, isinya perlu dipecah:

| Langkah 0024 | Masih perlu? |
|---|---|
| 1. samakan `peserta.jalur` dengan `batch.jalur` | **Tidak** — `peserta.jalur` dihapus di 0025 |
| 2. hapus penugasan lintas batch (joko) | **Ya** — masih relevan, jadi bagian dari backfill kelas |
| 3. hapus jadwal duplikat G01/G02 | **Ya** |
| 4. `wadada` → `A01` | **Ya** |
| 5. perbaiki `jam_akhir` | **Ya** |
| 6. lengkapi penugasan tertinggal (Siti) | **Ya** |

Saran: fold langkah 2–6 ke dalam `0025`, lalu jangan jalankan `0024` sama sekali. Kalau `0024` sudah terlanjur dijalankan, tidak ada yang rusak — 0025 idempoten terhadap perbaikannya.

---

## 10. Yang perlu diputuskan sebelum mulai

1. **Nama tabel baru: `kelas` atau `kelas_ajar`?** `kelas` tidak bentrok dengan keyword SQL mana pun di Postgres, jadi aman — tapi perlu konsisten dengan nama lain di UI.
2. **`modul.kategori` mau jadi penyaring utama katalog?** Nilainya sekarang tersebar: jalur A punya 5 kategori (ETHC, FND, TOOL, PROJ, PRES), B3 punya 5 (PROJ, ARCH, PRES, AUTO, ETHC). Kalau kategori tidak dipakai sebagai filter, urutan tampilan cukup pakai `kode`.
3. **4 paket uji generik (`PRE/POST-TEST-JALUR-B1`) masih dipakai?** Kalau tidak, lebih baik dihapus daripada diberi kolom `program`.
4. **Halaman `/modul` untuk admin masih perlu?** Route `/modul` dan `/kelola-modul` sekarang menunjuk hampir sama.
