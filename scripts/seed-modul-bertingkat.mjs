import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Error: VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ============================================================================
// DAFTAR MODUL UTAMA (PAYUNG KURIKULUM)
// ============================================================================

export const DAFTAR_MODUL_INDUK = [
  {
    id: 'MOD-AI-01',
    kode: 'MOD-AI-01',
    nama: 'Dasar Kecerdasan Buatan & Prompt Engineering',
    deskripsi: 'Fondasi komprehensif konsep AI, arsitektur Large Language Model (LLM), teknik prompt profesional, etika, dan produktivitas.',
    total_pertemuan: 14,
  },
  {
    id: 'MOD-AI-02',
    kode: 'MOD-AI-02',
    nama: 'Machine Learning & Deep Learning',
    deskripsi: 'Pembelajaran mesin teoritis dan praktis: Supervised/Unsupervised, Neural Networks, Computer Vision, dan NLP terapan.',
    total_pertemuan: 14,
  },
  {
    id: 'MOD-AI-03',
    kode: 'MOD-AI-03',
    nama: 'AI Engineering, RAG & Autonomous Agents',
    deskripsi: 'Arsitektur sistem cerdas tingkat lanjut: Integrasi API LLM, Vector Database, RAG, Tool-Use, Multi-Agent, dan Deployment Produksi.',
    total_pertemuan: 14,
  },
];

// 14 Pertemuan untuk Modul 1
const PERTEMUAN_MODUL_1 = [
  { p: 1, judul: 'Pengantar AI & Lanskap Model Generatif' },
  { p: 2, judul: 'Arsitektur LLM & Mekanisme Tokenisasi' },
  { p: 3, judul: 'Dasar-Dasar Prompt Engineering & Structured JSON' },
  { p: 4, judul: 'Role Prompting & System Instructions' },
  { p: 5, judul: 'Few-Shot Prompting & In-Context Learning' },
  { p: 6, judul: 'Chain-of-Thought (CoT) & Penalaran Kompleks' },
  { p: 7, judul: 'AI untuk Produktivitas Dokumen & Analisis Teks' },
  { p: 8, judul: 'Evaluasi Tengah Semester (UTS): Studi Kasus Prompting' },
  { p: 9, judul: 'Analisis Data Tabular & Visualisasi dengan AI' },
  { p: 10, judul: 'Etika AI, Bias Algoritma & Halusinasi' },
  { p: 11, judul: 'Keamanan Prompt: Injection & Jailbreak Defense' },
  { p: 12, judul: 'Otomasi Alur Kerja Tanpa Kode (No-Code AI Workflows)' },
  { p: 13, judul: 'Perancangan Solusi AI untuk Bisnis' },
  { p: 14, judul: 'Evaluasi Akhir Semester (UAS) & Presentasi Portofolio' },
];

// 14 Pertemuan untuk Modul 2
const PERTEMUAN_MODUL_2 = [
  { p: 1, judul: 'Fondasi Matematika & Python untuk Machine Learning' },
  { p: 2, judul: 'Data Preprocessing, Cleaning & Feature Engineering' },
  { p: 3, judul: 'Supervised Learning: Regresi Linear & Logistik' },
  { p: 4, judul: 'Supervised Learning: Decision Trees & Random Forest' },
  { p: 5, judul: 'Metrik Evaluasi Model: Precision, Recall, F1 & ROC' },
  { p: 6, judul: 'Unsupervised Learning: K-Means Clustering & PCA' },
  { p: 7, judul: 'Pengantar Jaringan Saraf Tiruan (Artificial Neural Networks)' },
  { p: 8, judul: 'Evaluasi Tengah Semester (UTS): Praktikum Model Klasifikasi' },
  { p: 9, judul: 'Deep Learning: Arsitektur Convolutional Neural Networks (CNN)' },
  { p: 10, judul: 'Deep Learning: Recurrent Neural Networks (RNN & LSTM)' },
  { p: 11, judul: 'Revolusi Arsitektur Transformer & Self-Attention' },
  { p: 12, judul: 'Model Pre-training vs Transfer Learning' },
  { p: 13, judul: 'Optimasi Hiperparameter & Regularisasi Model' },
  { p: 14, judul: 'Evaluasi Akhir Semester (UAS) & Capstone ML Model' },
];

// 14 Pertemuan untuk Modul 3
const PERTEMUAN_MODUL_3 = [
  { p: 1, judul: 'Ekosistem Modern AI Engineering & Cloud API' },
  { p: 2, judul: 'Pemrograman Python: Memanggil OpenAI & Gemini API' },
  { p: 3, judul: 'Streaming Response, Error Handling & Rate Limiting' },
  { p: 4, judul: 'Representasi Vektor & Text Embeddings' },
  { p: 5, judul: 'Vector Database: Pengenalan ChromaDB & pgvector' },
  { p: 6, judul: 'Arsitektur Dasar Retrieval-Augmented Generation (RAG)' },
  { p: 7, judul: 'Advanced RAG: Chunking Strategies & Hybrid Search' },
  { p: 8, judul: 'Evaluasi Tengah Semester (UTS): Implementasi Sistem RAG' },
  { p: 9, judul: 'Function Calling & Tool-Use pada LLM' },
  { p: 10, judul: 'Membangun Autonomous AI Agents dengan ReAct Pattern' },
  { p: 11, judul: 'Multi-Agent Collaboration dengan LangGraph' },
  { p: 12, judul: 'Fine-Tuning Model Lokal via Ollama & LoRA' },
  { p: 13, judul: 'Observabilitas, Evaluasi LLM & Semantic Caching' },
  { p: 14, judul: 'Evaluasi Akhir Semester (UAS) & Capstone Production Deployment' },
];

function generateMateriMarkdown(modulNama, pertemuanKe, judul) {
  return `# Pertemuan ${pertemuanKe}: ${judul}

> [!NOTE]
> **Modul Utama:** ${modulNama}  
> **Sesi:** Pertemuan ke-${pertemuanKe} (Standar 14 Pertemuan Perkuliahan)  
> **Durasi:** 100 Menit (2 SKS)  
> **Capaian Pembelajaran:** Mahasiswa memahami konsep inti topik ini dan mampu mengimplementasikannya dalam skenario nyata.

---

## 1. Capaian Pembelajaran & Urgensi Topik
Topik **${judul}** merupakan bagian penting dalam kurikulum **${modulNama}**. Pada pertemuan ini, peserta akan mempelajari teori fundamental, studi kasus industri, dan latihan terpandu.

### Indikator Keberhasilan:
- Menjelaskan konsep dasar dan terminologi teknis.
- Mengidentifikasi kelebihan dan tantangan praktis.
- Menguji contoh implementasi secara langsung.

---

## 2. Pembahasan Materi Inti

### A. Konsep Fundamental
Dalam ekosistem teknologi modern, pemahaman yang presisi mengenai arsitektur sistem adalah kunci efisiensi komputasi dan keberhasilan produk.

\`\`\`
Input Data / Instruksi ───> [ Pemrosesan Komputasi ] ───> Validasi & Output Terstruktur
\`\`\`

### B. Contoh Implementasi & Studi Kasus
Berikut adalah skenario penerapan praktis pada sistem produksi:

> [!TIP]
> **Praktik Terbaik:** Selalu validasi data masukan dan terapkan prinsip keamanan (*defensive design*) sebelum mengirimkan data ke sistem inferensi.

---

## 3. Rangkuman & Poin Kunci
1. Materi pertemuan ke-${pertemuanKe} membangun landasan bagi sesi-sesi berikutnya.
2. Konsistensi latihan mandiri akan mempercepat penguasaan materi secara menyeluruh.

---

## 4. Latihan Mandiri & Diskusi
- Tuliskan ringkasan pemahaman Anda di tab **Catatan Perkuliahan**.
- Uji konsep ini dengan membuat studi kasus mini sesuai bidang minat Anda!
`;
}

async function seed() {
  console.log('🚀 Memulai Seeding Modul Bertingkat (3 Modul x 14 Pertemuan)...\n');

  // 1. Bersihkan modul lama
  console.log('🧹 Membersihkan modul lama...');
  const { data: oldList } = await supabase.from('modul').select('id');
  if (oldList && oldList.length > 0) {
    await supabase.from('modul').delete().in('id', oldList.map((m) => m.id));
    console.log(`✓ Terhapus ${oldList.length} baris modul lama.`);
  }

  // 2. Buat data untuk semua pertemuan
  const allPertemuanPayload = [];

  const modulsConfig = [
    { info: DAFTAR_MODUL_INDUK[0], list: PERTEMUAN_MODUL_1, prefix: 'AI01' },
    { info: DAFTAR_MODUL_INDUK[1], list: PERTEMUAN_MODUL_2, prefix: 'AI02' },
    { info: DAFTAR_MODUL_INDUK[2], list: PERTEMUAN_MODUL_3, prefix: 'AI03' },
  ];

  for (const mConfig of modulsConfig) {
    for (const item of mConfig.list) {
      const kode = `${mConfig.prefix}-P${String(item.p).padStart(2, '0')}`;
      const judul = `Pertemuan ${item.p}: ${item.judul}`;
      const materi = generateMateriMarkdown(mConfig.info.nama, item.p, item.judul);

      allPertemuanPayload.push({
        kode,
        judul,
        urutan_sesi: item.p,
        durasi_menit: 100,
        content_md: materi,
        materi_peserta_md: materi,
        offline_material_path: mConfig.info.id, // ID MODUL INDUK
        slide_url: mConfig.info.nama,           // NAMA MODUL INDUK
        kategori: null,
      });
    }
  }

  console.log(`\n📚 Memasukkan ${allPertemuanPayload.length} pertemuan baru ke tabel modul...`);
  const { data: inserted, error: insErr } = await supabase
    .from('modul')
    .insert(allPertemuanPayload)
    .select('id, kode, judul, urutan_sesi, offline_material_path');

  if (insErr) {
    console.error('❌ Gagal memasukkan modul:', insErr.message);
    process.exit(1);
  }
  console.log(`✓ Berhasil memasukkan ${inserted.length} pertemuan.`);

  // 3. Hubungkan setiap kelas dengan modul pilihan
  console.log('\n📅 Menugaskan kelas ke modul yang sesuai...');
  const { data: kelasList } = await supabase.from('kelas').select('id, kode, nama');
  const { data: pesertaList } = await supabase.from('peserta').select('id, user_id, nama_lengkap, kelas_id');

  // Pasangkan kelas ke modul:
  // Kelas pertama & kedua -> MOD-AI-01
  // Kelas ketiga & keempat -> MOD-AI-02
  // Kelas kelima & keenam -> MOD-AI-03
  const today = new Date();
  const jadwalPayload = [];

  for (let idx = 0; idx < (kelasList || []).length; idx++) {
    const k = kelasList[idx];
    const targetModulId = idx < 2 ? 'MOD-AI-01' : idx < 4 ? 'MOD-AI-02' : 'MOD-AI-03';
    const pertemuanModul = inserted.filter((p) => p.offline_material_path === targetModulId);

    console.log(`   - Kelas "${k.nama}" (${k.kode}) mempelajari Modul: ${targetModulId} (${pertemuanModul.length} sesi)`);

    for (const p of pertemuanModul) {
      const sesDate = new Date(today);
      sesDate.setDate(today.getDate() + (p.urutan_sesi - 1) * 7);

      jadwalPayload.push({
        kelas_id: k.id,
        modul_id: p.id,
        kode_sesi_friendly: p.kode,
        judul_sesi: p.judul,
        tanggal_kelas: sesDate.toISOString().slice(0, 10),
        jam_mulai: '09:00:00',
        jam_akhir: '10:40:00',
        lokasi: 'Ruang Perkuliahan AI',
        status_sesi: p.urutan_sesi === 1 ? 'selesai' : p.urutan_sesi === 2 ? 'berlangsung' : 'belum',
      });
    }
  }

  const { data: insertedJadwal, error: jErr } = await supabase
    .from('jadwal_sesi')
    .insert(jadwalPayload)
    .select('id, kelas_id, modul_id, kode_sesi_friendly');

  if (jErr) {
    console.error('❌ Gagal membuat jadwal sesi:', jErr.message);
  } else {
    console.log(`✓ Berhasil membuat ${insertedJadwal.length} sesi jadwal kelas.`);

    // 4. Hubungkan ke sesi_peserta
    const spPayload = [];
    for (const peserta of (pesertaList || [])) {
      const sesiUntukPeserta = insertedJadwal.filter((j) => j.kelas_id === peserta.kelas_id);
      for (const s of sesiUntukPeserta) {
        spPayload.push({
          sesi_id: s.id,
          peserta_id: peserta.id,
        });
      }
    }

    if (spPayload.length > 0) {
      const { data: insertedSP, error: spErr } = await supabase
        .from('sesi_peserta')
        .insert(spPayload)
        .select();

      if (spErr) console.warn('Catatan sesi_peserta:', spErr.message);
      else console.log(`✓ Berhasil menugaskan ${insertedSP.length} sesi ke peserta.`);
    }
  }

  console.log('\n🎉 SEEDING SELESAI!');
  console.log('   Tersedia 3 Modul Kurikulum Utama, masing-masing memiliki 14 Pertemuan.');
}

seed().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
