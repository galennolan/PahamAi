import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Error: VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ============================================================================
// METADATA 9 PERTEMUAN FUNDAMENTAL DATA ANALYST
// ============================================================================

const MODUL_INDUK = {
  id: 'MOD-DA-01',
  kode: 'MOD-DA-01',
  nama: 'Fundamental Data Analyst',
  deskripsi: 'Kurikulum analisis data komprehensif: CRISP-DM, Preprocessing, Supervised (Decision Tree & Linear Regression), Unsupervised (K-Means, Apriori, PCA), dan Evaluasi Model (9 Pertemuan).',
  total_pertemuan: 9,
};

const PERTEMUAN_LIST = [
  {
    sesi: 1,
    kode: 'FDA-P01',
    file: '0406_P01.md',
    judul: 'Pertemuan 1: Pengenalan Machine Learning, Profesi Data & Tipe Atribut Data',
    ringkas: 'Konsep dasar AI, Machine Learning, perbedaan peran Data Analyst vs Data Scientist, tahapan pipeline data, dan taksonomi atribut data (Nominal, Ordinal, Interval, Rasio).',
    soal: [
      {
        no: 1,
        pertanyaan: 'Manakah dari pernyataan berikut yang paling tepat membedakan peran Data Analyst dengan Data Scientist?',
        pilihan_a: 'Data Analyst fokus pada deep learning kompleks, sedangkan Data Scientist hanya membuat dashboard spreadsheet.',
        pilihan_b: 'Data Analyst fokus menganalisis data historis untuk insight bisnis, sedangkan Data Scientist lebih fokus merancang model prediktif machine learning tingkat lanjut.',
        pilihan_c: 'Data Analyst bertanggung jawab atas instalasi hardware server, sedangkan Data Scientist mengelola pemasaran produk.',
        pilihan_d: 'Tidak ada perbedaan sama sekali antara Data Analyst dan Data Scientist dalam praktiknya.',
        kunci: 'B',
        pembahasan: 'Data Analyst berfokus pada eksplorasi data historis, pelaporan, dan visualisasi untuk menjawab pertanyaan bisnis saat ini. Sementara Data Scientist membangun model prediktif, algoritma machine learning, dan eksperimen data skala besar.',
      },
      {
        no: 2,
        pertanyaan: 'Tipe data atribut "Tingkat Kepuasan Pelanggan" (Sangat Puas, Puas, Cukup, Kurang) termasuk ke dalam jenis atribut...',
        pilihan_a: 'Nominal',
        pilihan_b: 'Interval',
        pilihan_c: 'Ordinal',
        pilihan_d: 'Rasio',
        kunci: 'C',
        pembahasan: 'Atribut Ordinal adalah data kategorikal yang memiliki urutan atau tingkatan nilai yang bermakna (misal: tingkat kepuasan, jenjang pendidikan, ranking), namun jarak numerik mutlak antartingkatan tidak dapat dihitung matematis.',
      },
    ],
  },
  {
    sesi: 2,
    kode: 'FDA-P02',
    file: '0406_P02.md',
    judul: 'Pertemuan 2: Framework CRISP-DM, Baseline Model, Overfitting & Underfitting',
    ringkas: 'Standar industri CRISP-DM (6 fase), perancangan baseline model sebagai patokan evaluasi, serta deteksi dan penanganan overfitting dan underfitting.',
    soal: [
      {
        no: 1,
        pertanyaan: 'Urutan 6 fase dalam framework Cross-Industry Standard Process for Data Mining (CRISP-DM) yang benar adalah...',
        pilihan_a: 'Data Preparation ➔ Business Understanding ➔ Data Understanding ➔ Evaluation ➔ Modeling ➔ Deployment',
        pilihan_b: 'Business Understanding ➔ Data Understanding ➔ Data Preparation ➔ Modeling ➔ Evaluation ➔ Deployment',
        pilihan_c: 'Modeling ➔ Evaluation ➔ Deployment ➔ Business Understanding ➔ Data Understanding ➔ Data Preparation',
        pilihan_d: 'Business Understanding ➔ Modeling ➔ Evaluation ➔ Data Preparation ➔ Data Understanding ➔ Deployment',
        kunci: 'B',
        pembahasan: 'Standar CRISP-DM dimulai dari pemahaman bisnis (Business Understanding), pengenalan data (Data Understanding), penyiapan data (Data Preparation), pemodelan (Modeling), pengujian (Evaluation), hingga peluncuran sistem (Deployment).',
      },
      {
        no: 2,
        pertanyaan: 'Kondisi di mana model machine learning memperoleh akurasi 99% pada data latih (training), namun hanya 52% pada data baru (testing) disebut...',
        pilihan_a: 'Underfitting',
        pilihan_b: 'Baseline Fit',
        pilihan_c: 'Overfitting',
        pilihan_d: 'High Bias',
        kunci: 'C',
        pembahasan: 'Overfitting terjadi ketika model terlalu "menghafal" kebisingan (noise) dan detail spesifik data latih (High Variance, Low Bias), sehingga gagal melakukan generalisasi dengan baik pada data uji baru yang belum pernah dilihat.',
      },
    ],
  },
  {
    sesi: 3,
    kode: 'FDA-P03',
    file: '0406_P03.md',
    judul: 'Pertemuan 3: Pembagian Data (Train/Val/Test), K-Fold Cross Validation & Data Preprocessing',
    ringkas: 'Teknik pembagian dataset, validasi silang K-Fold, penanganan missing values (imputasi), deteksi outlier, dan standarisasi/normalisasi fitur.',
    soal: [
      {
        no: 1,
        pertanyaan: 'Apa tujuan utama menyisihkan "Validation Set" terpisah dari "Testing Set" dalam alur pemodelan supervised learning?',
        pilihan_a: 'Untuk mempercepat waktu kompilasi kode Python scikit-learn.',
        pilihan_b: 'Untuk menyetel hyperparameter dan memilih arsitektur model terbaik selama proses pelatihan tanpa membocorkan data evaluasi final (Testing Set).',
        pilihan_c: 'Untuk menggantikan peran data latih (Training Set) secara keseluruhan.',
        pilihan_d: 'Untuk menghapus fitur data yang memiliki nilai missing.',
        kunci: 'B',
        pembahasan: 'Validation set digunakan untuk membandingkan model dan menala (tune) hyperparameter selama fase iterasi. Testing set disembunyikan sampai akhir sebagai pengujian objektif independen (unbiased final evaluation).',
      },
      {
        no: 2,
        pertanyaan: 'Metode transformasi data yang mengubah rentang nilai fitur numerik menjadi tepat berada di antara [0, 1] dikenal sebagai...',
        pilihan_a: 'Standarisasi Z-Score',
        pilihan_b: 'Min-Max Normalization',
        pilihan_c: 'One-Hot Encoding',
        pilihan_d: 'Mean Imputation',
        kunci: 'B',
        pembahasan: 'Min-Max Normalization menskalakan data ke rentang tertutup [0, 1] dengan rumus (x - min) / (max - min). Berbeda dengan StandardScaler (Z-Score) yang memusatkan rata-rata di 0 dan standar deviasi 1.',
      },
    ],
  },
  {
    sesi: 4,
    kode: 'FDA-P04',
    file: '0406_P04.md',
    judul: 'Pertemuan 4: Supervised Learning: Klasifikasi Menggunakan Decision Tree & Evaluasi',
    ringkas: 'Algoritma pohon keputusan, kriteria pemisahan node (Gini Impurity, Information Gain / Entropy), dan metrik evaluasi klasifikasi (Confusion Matrix, Precision, Recall, F1).',
    soal: [
      {
        no: 1,
        pertanyaan: 'Pada algoritma Decision Tree, metrik yang mengukur tingkat ketidakmurnian atau keacakan probabilitas suatu subset data disebut...',
        pilihan_a: 'Entropy atau Gini Index',
        pilihan_b: 'R-Squared',
        pilihan_c: 'Mean Squared Error',
        pilihan_d: 'Silhouette Coefficient',
        kunci: 'A',
        pembahasan: 'Gini Impurity dan Entropy (Information Gain) adalah dua metrik utama untuk mengukur kemurnian kelas data pada node pohon keputusan guna menentukan atribut mana yang paling efektif memecah data.',
      },
      {
        no: 2,
        pertanyaan: 'Jika dalam deteksi penyakit berbahaya kita sangat ingin meminimalkan pasien sakit yang salah didiagnosis sebagai sehat (False Negative), maka metrik evaluasi yang wajib diprioritaskan adalah...',
        pilihan_a: 'Precision',
        pilihan_b: 'Recall (Sensitivitas)',
        pilihan_c: 'Specificity',
        pilihan_d: 'Adjusted Rand Index',
        kunci: 'B',
        pembahasan: 'Recall = TP / (TP + FN). Semakin tinggi Recall, semakin sedikit False Negative (kasus positif nyata yang terlewat). Pada skenario medis atau deteksi penipuan, Recall sangat krusial.',
      },
    ],
  },
  {
    sesi: 5,
    kode: 'FDA-P05',
    file: '0406_P05.md',
    judul: 'Pertemuan 5: Supervised Learning: Pemodelan Regresi Menggunakan Linear Regression',
    ringkas: 'Prinsip regresi linear sederhana dan berganda, estimasi Ordinary Least Squares (OLS), alur CRISP-DM regresi, dan metrik evaluasi (MSE, RMSE, R², MAPE).',
    soal: [
      {
        no: 1,
        pertanyaan: 'Nilai R-Squared (R²) sebesar 0.85 pada model Linear Regression memiliki arti bahwa...',
        pilihan_a: 'Tingkat akurasi klasifikasi model adalah 85%.',
        pilihan_b: '85% variabilitas variabel target dapat dijelaskan oleh variabel independen (fitur) dalam model.',
        pilihan_c: 'Galat prediksi model selalu meleset sebesar 15 unit.',
        pilihan_d: 'Model mengalami overfitting parah sebesar 85%.',
        kunci: 'B',
        pembahasan: 'Koefisien determinasi R-Squared (R²) mengukur proporsi variansi variabel dependen (target) yang mampu diterangkan oleh variabel independen (fitur) dalam persamaan regresi.',
      },
      {
        no: 2,
        pertanyaan: 'Kelebihan utama metrik Root Mean Squared Error (RMSE) dibandingkan Mean Squared Error (MSE) adalah...',
        pilihan_a: 'RMSE tidak memperhitungkan galat negatif.',
        pilihan_b: 'Nilai RMSE memiliki satuan yang sama dengan variabel target aslinya sehingga lebih mudah diinterpretasikan.',
        pilihan_c: 'RMSE selalu menghasilkan nilai 0 hingga 1.',
        pilihan_d: 'RMSE kebal terhadap nilai outlier ekstrem.',
        kunci: 'B',
        pembahasan: 'Karena RMSE merupakan akar kuadrat dari MSE, satuannya kembali setara dengan satuan variabel target (misal: Rupiah, Kilogram, Derajat Celcius), menjadikannya intuitif untuk dievaluasi oleh pemangku kepentingan.',
      },
    ],
  },
  {
    sesi: 6,
    kode: 'FDA-P06',
    file: '0406_P06.md',
    judul: 'Pertemuan 6: Unsupervised Learning: Pengelompokan Data Menggunakan K-Means Clustering',
    ringkas: 'Konsep klasterisasi data tanpa label, algoritma K-Means, penentuan jumlah klaster optimal (Elbow Method), dan evaluasi klaster (Silhouette Score, Davies-Bouldin Index).',
    soal: [
      {
        no: 1,
        pertanyaan: 'Bagaimana metode "Elbow Method" membantu Data Analyst dalam menentukan jumlah klaster (k) optimal pada K-Means?',
        pilihan_a: 'Dengan mencari titik di mana nilai akurasi mencapai 100%.',
        pilihan_b: 'Dengan mengamati grafik Inersia (WCSS) vs nilai k, dan memilih titik "siku" di mana penurunan inersia mulai melambat secara drastis.',
        pilihan_c: 'Dengan menghitung jumlah kolom dalam dataset dibagi dua.',
        pilihan_d: 'Dengan memilih nilai k di mana jumlah outlier terbanyak ditemukan.',
        kunci: 'B',
        pembahasan: 'Elbow Method memplotkan Within-Cluster Sum of Squares (WCSS / Inersia) terhadap berbagai nilai k. Titik tekukan siku (elbow) mengindikasikan penambahan klaster berikutnya tidak lagi memberikan reduksi inersia yang signifikan.',
      },
      {
        no: 2,
        pertanyaan: 'Silhouette Score bernilai +0.78 pada hasil klasterisasi K-Means menunjukkan bahwa...',
        pilihan_a: 'Klaster yang terbentuk terpisah sangat jelas (dense and well separated).',
        pilihan_b: 'Klaster tumpang tindih dan tidak dapat dibedakan.',
        pilihan_c: 'Data memiliki banyak nilai duplikat.',
        pilihan_d: 'Algoritma K-Means gagal konvergen.',
        kunci: 'A',
        pembahasan: 'Silhouette Score berkisar dari -1 hingga +1. Nilai mendekati +1 (>0.7) menandakan sampel sangat dekat dengan anggota klasternya sendiri dan terpisah jauh dari klaster tetangga (struktur klaster sangat kuat).',
      },
    ],
  },
  {
    sesi: 7,
    kode: 'FDA-P07',
    file: '0406_P07.md',
    judul: 'Pertemuan 7: Unsupervised Learning: Association Rule Mining & Algoritma Apriori',
    ringkas: 'Analisis keranjang belanja (Market Basket Analysis), algoritma Apriori, dan metrik asosiasi: Support, Confidence, Lift, Leverage, dan Conviction.',
    soal: [
      {
        no: 1,
        pertanyaan: 'Pada aturan asosiasi {Roti} ➔ {Mentega}, jika diketahui transaksi {Roti, Mentega} muncul 30 kali dari total 100 transaksi, maka nilai Support-nya adalah...',
        pilihan_a: '0.30 (30%)',
        pilihan_b: '3.00',
        pilihan_c: '0.70 (70%)',
        pilihan_d: '0.03 (3%)',
        kunci: 'A',
        pembahasan: 'Support(A ➔ B) dihitung dari frekuensi kemunculan itemset A dan B bersamaan dibagi total seluruh transaksi: 30 / 100 = 0.30 (30%).',
      },
      {
        no: 2,
        pertanyaan: 'Suatu aturan asosiasi memiliki nilai Lift = 2.45. Makna bisnis dari nilai Lift ini adalah...',
        pilihan_a: 'Pembelian produk A dan produk B terjadi secara independen tanpa hubungan apa pun.',
        pilihan_b: 'Pelanggan yang membeli produk A memiliki kecenderungan membeli produk B 2.45 kali lebih tinggi dibandingkan ekspektasi pembelian secara acak.',
        pilihan_c: 'Penjualan produk B menurun sebesar 2.45% jika produk A dipromosikan.',
        pilihan_d: 'Aturan asosiasi tersebut tidak valid dan harus dihapus.',
        kunci: 'B',
        pembahasan: 'Lift = Confidence / Support(B). Jika Lift > 1, terdapat korelasi positif yang kuat antara antecedent dan consequent; pelanggan yang membeli A secara signifikan lebih mungkin membeli B dibanding kebetulan acak.',
      },
    ],
  },
  {
    sesi: 8,
    kode: 'FDA-P08',
    file: '0406_P08.md',
    judul: 'Pertemuan 8: Unsupervised Learning: Dimensionality Reduction Menggunakan PCA',
    ringkas: 'Masalah Curse of Dimensionality, konsep Principal Component Analysis (PCA), reduksi dimensi ortogonal, Eigenvalue/Eigenvector, dan rasio variansi terjelaskan.',
    soal: [
      {
        no: 1,
        pertanyaan: 'Tujuan fundamental dari teknik reduksi dimensi seperti Principal Component Analysis (PCA) adalah...',
        pilihan_a: 'Menambahkan fitur tiruan sebanyak mungkin agar model semakin lambat.',
        pilihan_b: 'Mengurangi jumlah variabel/fitur dataset dengan mempertahankan sebanyak mungkin variabilitas dan informasi penting.',
        pilihan_c: 'Mengubah masalah unsupervised learning menjadi supervised learning secara otomatis.',
        pilihan_d: 'Menghapus seluruh fitur numerik dan menyisakan data kategorikal.',
        kunci: 'B',
        pembahasan: 'PCA mentransformasi fitur-fitur yang berkorelasi menjadi sekumpulan komponen utama (Principal Components) yang saling ortogonal (tidak berkorelasi), mereduksi dimensi data sekaligus meminimalkan kehilangan informasi.',
      },
      {
        no: 2,
        pertanyaan: 'Jika 2 komponen utama (PC1 dan PC2) memiliki Cumulative Explained Variance Ratio sebesar 88%, ini mengindikasikan bahwa...',
        pilihan_a: 'Model kehilangan 88% informasi asli dari dataset.',
        pilihan_b: 'Hanya dengan 2 komponen tersebut, 88% dari total variabilitas dataset asli berhasil dipertahankan.',
        pilihan_c: 'Akurasi model klasifikasi pasti bernilai 88%.',
        pilihan_d: 'Terdapat 88 fitur yang harus dibuang dari dataset.',
        kunci: 'B',
        pembahasan: 'Cumulative Explained Variance Ratio 88% berarti 88% dinamika/variansi seluruh data berdimensi tinggi telah terangkum hanya dalam 2 komponen PC1 dan PC2, memungkinkan visualisasi 2D yang sangat representatif.',
      },
    ],
  },
  {
    sesi: 9,
    kode: 'FDA-P09',
    file: '0406_P09.md',
    judul: 'Pertemuan 9: Evaluasi Komprehensif Performa Model Machine Learning',
    ringkas: 'Sintesis metrik evaluasi model machine learning (Regresi, Klasifikasi, Clustering, Asosiasi, PCA) dan panduan pengambilan keputusan bisnis berbasis data.',
    soal: [
      {
        no: 1,
        pertanyaan: 'Manakah pasangan tipe model machine learning dan metrik evaluasi standarnya yang PALING tepat di bawah ini?',
        pilihan_a: 'Regresi ➔ Confusion Matrix & F1-Score',
        pilihan_b: 'Clustering ➔ Silhouette Score & Davies-Bouldin Index',
        pilihan_c: 'Klasifikasi ➔ Mean Squared Error (MSE)',
        pilihan_d: 'Association Rules ➔ R-Squared & MAPE',
        kunci: 'B',
        pembahasan: 'Clustering dievaluasi menggunakan Silhouette Score dan Davies-Bouldin Index. Regresi dievaluasi dengan MSE/RMSE/R². Klasifikasi dievaluasi dengan Confusion Matrix/F1-Score. Aturan Asosiasi dievaluasi dengan Support/Confidence/Lift.',
      },
      {
        no: 2,
        pertanyaan: 'Dalam konteks evaluasi model untuk keputusan bisnis, mengapa metrik MAPE (Mean Absolute Percentage Error) sering disukai oleh manajemen non-teknis?',
        pilihan_a: 'Karena MAPE dinyatakan dalam bentuk persentase relatif error sehingga mudah dipahami tingkat kesalahan prediksinya secara intuitif.',
        pilihan_b: 'Karena MAPE selalu bernilai nol untuk model regresi linier.',
        pilihan_c: 'Karena MAPE dapat dipakai untuk menghitung akurasi model klasifikasi.',
        pilihan_d: 'Karena MAPE tidak memerlukan data testing sama sekali.',
        kunci: 'A',
        pembahasan: 'MAPE menyajikan rata-rata deviasi galat dalam format persentase (misal: rata-rata kesalahan prediksi penjualan adalah 4.5%), memudahkan manajemen dan audiens bisnis memahami akurasi model tanpa bingung satuan teknis.',
      },
    ],
  },
];

// ============================================================================
// GENERATOR KONTEN MARKDOWN PERKULIAHAN BERMUTU TINGGI
// ============================================================================

function generateMarkdownContent(item, rawContent) {
  // Bersihkan teks mentah slide dari header PDF
  const cleanSlide = rawContent
    .replace(/^#\s*PDF Source:.*$/gm, '')
    .replace(/##\s*---\s*Page\s*\d+\s*---/gi, '\n')
    .replace(/\[Image \/ Non-extractable content\]/gi, '')
    .trim();

  // Ekstrak poin-poin penting
  const lines = cleanSlide.split('\n').map(l => l.trim()).filter(Boolean);
  const keyPoints = lines.slice(0, 45).join('\n> ');

  return `# ${item.judul}

> [!NOTE]
> **Modul Utama:** Fundamental Data Analyst (Kurikulum 9 Pertemuan)  
> **Sesi:** Pertemuan ke-${item.sesi}  
> **Durasi Belajar:** 100 Menit (Teori & Praktikum Terpadu)  
> **Metodologi Utama:** CRISP-DM (Cross-Industry Standard Process for Data Mining)  
> **Capaian Pembelajaran (CPMK):** Mahasiswa mampu menguasai konsep, metodologi teknis, implementasi kode Python, dan interpretasi bisnis dari materi ${item.judul}.

---

## 1. Capaian Pembelajaran & Urgensi Topik

Topik **${item.judul}** adalah fondasi penting dalam profesi seorang **Data Analyst** dan **Data Scientist**. Pemahaman terhadap konsep ini memungkinkan praktisi data untuk mengolah data mentah menjadi wawasan bisnis (*actionable insights*) serta membangun model prediktif yang andal.

### Indikator Keberhasilan Pembelajaran:
- **Konsep Teoretis:** Memahami definisi, dasar matematika/statistik, dan terminologi standar industri.
- **Implementasi Komputasi:** Mampu menuliskan kode Python dengan pustaka populer (*pandas, scikit-learn, numpy, matplotlib/seaborn*).
- **Interpretasi Metrik:** Mampu membaca output evaluasi model dan menghubungkannya dengan keputusan strategis bisnis.

---

## 2. Pembahasan Materi Inti

### A. Konteks Teoretis & Alur Kerja
${item.ringkas}

Dalam arsitektur analitik modern, alur pengolahan data mengikuti alur terstruktur:

\`\`\`
Data Mentah (Raw Data)
       │
       ▼
[ Data Preprocessing ] ───> Imputasi Missing Values, Normalisasi, Encoding
       │
       ▼
[ Model Pipeline ]    ───> Pemilihan Algoritma & Pelatihan Model
       │
       ▼
[ Evaluasi & Metrik ] ───> Pengujian Kinerja terhadap Data Independen
       │
       ▼
[ Wawasan Bisnis ]    ───> Keputusan Strategis Berbasis Data
\`\`\`

---

### B. Catatan Konsep Penting dari Silabus Perkuliahan

> ${keyPoints.slice(0, 1500)}

---

### C. Contoh Implementasi Praktis dengan Python

Berikut adalah template kode implementasi standar industri untuk topik pertemuan ini:

\`\`\`python
# Template Praktikum: ${item.judul}
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

print("🚀 Memulai Praktikum Sesi ${item.sesi}: ${item.kode}")

# 1. Menyiapkan data simulasi / membaca file dataset
# df = pd.read_csv('dataset.csv')
print("Status: Dataset berhasil dimuat dan siap diproses.")
\`\`\`

> [!TIP]
> **Praktik Terbaik Industri:** Selalu pastikan Anda memisahkan data sebelum melakukan *data imputation* atau *scaling* untuk mencegah terjadinya **Data Leakage** (kebocoran data uji ke dalam proses pelatihan).

---

## 3. Rangkuman & Poin Kunci

1. **Relevansi Bisnis:** Setiap analisis data dan pemodelan harus berakar pada pemahaman masalah bisnis (*Business Understanding*) yang jelas.
2. **Kualitas Data:** Kualitas model machine learning secara langsung ditentukan oleh kualitas data yang diumpankan (*Garbage In, Garbage Out*).
3. **Validasi Berkelanjutan:** Jangan mengandalkan satu metrik tunggal; gunakan kombinasi metrik yang representatif terhadap kebutuhan bisnis Anda.

---

## 4. Latihan Mandiri & Diskusi Perkuliahan

- Tuliskan resume pemahaman Anda di tab **Catatan Perkuliahan**.
- Ujilah pemahaman Anda dengan menekan tombol **🎮 Mulai Kuis Quizizz** untuk mengerjakan kuis evaluasi 2 butir soal interaktif pertemuan ini!
`;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Memulai Pembuatan Modul Baru: Fundamental Data Analyst (9 Pertemuan)...\n');

  // 1. Bersihkan data modul lama jika ada
  console.log('🧹 Menghapus data lama dengan kode FDA-*...');
  await supabase.from('modul').delete().ilike('kode', 'FDA-%');
  await supabase.from('soal_paket').delete().ilike('kode_paket', 'KUIS-FDA-%');
  console.log('✓ Pembersihan selesai.');

  // 2. Baca file markdown dan buat payload modul
  const modulPayload = [];
  const baseDir = path.resolve('modul');

  for (const item of PERTEMUAN_LIST) {
    const filePath = path.join(baseDir, item.file);
    let rawContent = '';
    if (fs.existsSync(filePath)) {
      rawContent = fs.readFileSync(filePath, 'utf-8');
    }

    const markdown = generateMarkdownContent(item, rawContent);

    modulPayload.push({
      kode: item.kode,
      judul: item.judul,
      urutan_sesi: item.sesi,
      durasi_menit: 100,
      content_md: markdown,
      materi_peserta_md: markdown,
      offline_material_path: MODUL_INDUK.id, // 'MOD-DA-01'
      slide_url: null, // Hindari nested iframe
      kategori: 'PROD',
    });
  }

  console.log(`\n📚 Memasukkan ${modulPayload.length} pertemuan Fundamental Data Analyst ke tabel modul...`);
  const { data: insertedModul, error: errModul } = await supabase
    .from('modul')
    .insert(modulPayload)
    .select('id, kode, judul, urutan_sesi');

  if (errModul) {
    console.error('❌ Gagal insert modul:', errModul.message);
    process.exit(1);
  }
  console.log(`✓ Berhasil memasukkan ${insertedModul.length} modul pertemuan!`);

  // 3. Masukkan paket soal dan butir soal kuis Quizizz
  console.log('\n🎮 Menyiapkan 9 Paket Kuis Quizizz & 18 Butir Soal...');
  const paketPayload = PERTEMUAN_LIST.map((item) => ({
    kode_paket: `KUIS-${item.kode}`,
    program: MODUL_INDUK.id,
    tipe: 'kuis',
    sesi_target: item.kode,
    durasi_menit: 5,
  }));

  const { error: errPaket } = await supabase.from('soal_paket').insert(paketPayload);
  if (errPaket) {
    console.error('❌ Gagal insert soal_paket:', errPaket.message);
  } else {
    console.log(`✓ Berhasil membuat 9 paket kuis (${paketPayload.map(p => p.kode_paket).join(', ')}).`);
  }

  const butirPayload = [];
  for (const item of PERTEMUAN_LIST) {
    for (const q of item.soal) {
      butirPayload.push({
        kode_paket: `KUIS-${item.kode}`,
        no_soal: q.no,
        pertanyaan: q.pertanyaan,
        pilihan_a: q.pilihan_a,
        pilihan_b: q.pilihan_b,
        pilihan_c: q.pilihan_c,
        pilihan_d: q.pilihan_d,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
        bobot_skor: 50,
      });
    }
  }

  const { error: errButir } = await supabase.from('soal_butir').insert(butirPayload);
  if (errButir) {
    console.error('❌ Gagal insert soal_butir:', errButir.message);
  } else {
    console.log(`✓ Berhasil membuat ${butirPayload.length} butir soal pilihan ganda.`);
  }

  // 4. Buat / Pastikan ada kelas demo untuk modul Fundamental Data Analyst
  console.log('\n🏫 Memastikan kelas Fundamental Data Analyst tersedia...');
  const { data: existingKelas } = await supabase.from('kelas').select('*').eq('kode', 'KLS-FDA-01').maybeSingle();

  let kelasId = existingKelas?.id;
  if (!kelasId) {
    const { data: newKelas, error: errK } = await supabase
      .from('kelas')
      .insert({
        kode: 'KLS-FDA-01',
        nama: 'Kelas Fundamental Data Analyst — Angkatan 01',
        status: 'terbuka',
        tanggal_mulai: new Date().toISOString().slice(0, 10),
        kapasitas_maks: 35,
      })
      .select('id')
      .single();

    if (!errK && newKelas) {
      kelasId = newKelas.id;
      console.log(`✓ Kelas baru "Kelas Fundamental Data Analyst — Angkatan 01" berhasil dibuat.`);
    }
  } else {
    console.log(`✓ Kelas "KLS-FDA-01" sudah ada (ID: ${kelasId}).`);
  }

  // 5. Jadwalkan 9 pertemuan ke jadwal_sesi kelas tersebut
  if (kelasId) {
    console.log('📅 Menjadwalkan 9 pertemuan ke jadwal_sesi kelas...');
    await supabase.from('jadwal_sesi').delete().eq('kelas_id', kelasId);

    const today = new Date();
    const jadwalPayload = insertedModul
      .sort((a, b) => a.urutan_sesi - b.urutan_sesi)
      .map((p, idx) => {
        const sesDate = new Date(today);
        sesDate.setDate(today.getDate() + (p.urutan_sesi - 1) * 7);
        return {
          kelas_id: kelasId,
          modul_id: p.id,
          kode_sesi_friendly: p.kode,
          judul_sesi: p.judul,
          tanggal_kelas: sesDate.toISOString().slice(0, 10),
          jam_mulai: '09:00:00',
          jam_akhir: '10:40:00',
          lokasi: 'Laboratorium Data Science',
          status_sesi: idx === 0 ? 'berlangsung' : 'belum',
        };
      });

    const { data: insertedJadwal, error: errJ } = await supabase
      .from('jadwal_sesi')
      .insert(jadwalPayload)
      .select('id, kode_sesi_friendly');

    if (!errJ && insertedJadwal) {
      console.log(`✓ Berhasil menjadwalkan ${insertedJadwal.length} sesi pertemuan ke kelas.`);

      // Daftarkan seluruh murid yang ada ke kelas ini jika ada
      const { data: pesertas } = await supabase.from('peserta').select('id');
      if (pesertas && pesertas.length > 0) {
        const spPayload = insertedJadwal.flatMap((j) =>
          pesertas.map((p) => ({
            sesi_id: j.id,
            peserta_id: p.id,
          }))
        );
        try {
          await supabase.from('sesi_peserta').insert(spPayload);
          console.log(`✓ Menautkan peserta ke sesi belajar.`);
        } catch (e) {
          console.warn('Info sesi_peserta:', e.message);
        }
      }
    }
  }

  console.log('\n🎉 SUKSES BESAR!');
  console.log('Modul "Fundamental Data Analyst" (MOD-DA-01) dengan 9 pertemuan telah aktif dan siap diakses di Paham AI!');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
