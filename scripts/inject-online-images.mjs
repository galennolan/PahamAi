import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MODULE_IMAGES = {
  // Jalur A - Anak
  A01: {
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80',
    caption: 'Mengenal Robot Cerdas dan Kecerdasan Buatan (AI) Ramah Anak',
  },
  A02: {
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1000&q=80',
    caption: 'Perbandingan Kecerdasan Manusia dan Kecerdasan Buatan',
  },
  A03: {
    url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1000&q=80',
    caption: 'Berkomunikasi dan Memberi Perintah (Prompt) ke Asisten AI',
  },
  A04: {
    url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1000&q=80',
    caption: 'Eksplorasi Cerita dan Imajinasi Bersama AI',
  },
  A05: {
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    caption: 'Kreasi Seni dan Gambar Digital Menggunakan AI',
  },
  A06: {
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    caption: 'Detektif AI: Membedakan Karya Buatan AI vs Manusia',
  },
  A07: {
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
    caption: 'Etika, Keamanan, dan Privasi dalam Berinteraksi dengan AI',
  },
  A08: {
    url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80',
    caption: 'Kolaborasi Proyek Akhir Kreatif Berbasis AI',
  },
  A09: {
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80',
    caption: 'Keterampilan Presentasi dan Percaya Diri Menyampaikan Karya',
  },

  // Jalur B1 - Pemula Dewasa
  B101: {
    url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=80',
    caption: 'Konsep Dasar Artificial Intelligence, Machine Learning, dan Large Language Models',
  },
  B102: {
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80',
    caption: 'Ekosistem dan Alat Kerja AI Modern untuk Pekerja Kreatif & Profesional',
  },
  B103: {
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80',
    caption: 'Prinsip Dasar Prompt Engineering dan Struktur Instruksi Efektif',
  },
  B104: {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80',
    caption: 'Pemanfaatan AI untuk Otomasi Tugas Kantor dan Produktivitas Harian',
  },
  B105: {
    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1000&q=80',
    caption: 'Memahami Batasan AI: Bias Data, Halusinasi, dan Validasi Informasi',
  },
  B106: {
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    caption: 'Pengerjaan Proyek Mini Aplikatif untuk Portofolio Pemula',
  },
  B107: {
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80',
    caption: 'Keterampilan Komunikasi dan Presentasi Hasil Implementasi AI',
  },

  // Jalur B2 - Menengah
  B201: {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80',
    caption: 'Teknik Lanjutan Prompt Engineering: Few-Shot dan Chain-of-Thought',
  },
  B202: {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
    caption: 'Optimasi Output AI: Parameter Suhu (Temperature) dan Struktur Respon',
  },
  B203: {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80',
    caption: 'Analisis Data Kompleks dan Pemrosesan Dokumen Menggunakan AI',
  },
  B204: {
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80',
    caption: 'Keamanan Sistem: Menangkal Prompt Injection dan Kebocoran Data',
  },
  B205: {
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
    caption: 'Dasar Pemrograman Python untuk Mengontrol dan Menghubungkan Model AI',
  },
  B206: {
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
    caption: 'Arsitektur Automasi Alur Kerja Terintegrasi Berbasis Bot',
  },
  B207: {
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
    caption: 'Integrasi API Model Bahasa: Request, Headers, dan Penanganan Error',
  },
  B208: {
    url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
    caption: 'Membangun Antarmuka Pengguna dan Menanamkan Fitur AI ke Produk Digital',
  },
  B209: {
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80',
    caption: 'Workshop Kolaborasi Proyek AI Tingkat Menengah',
  },
  B210: {
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80',
    caption: 'Demo Showcase dan Uji Coba Produk Terintegrasi AI',
  },
  B211: {
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80',
    caption: 'Evaluasi Pemahaman, Pengujian Komprehensif, dan Kilas Balik Materi',
  },

  // Jalur B3 - Tingkat Lanjut & Arsitektur
  B301: {
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
    caption: 'Arsitektur Sistem AI Modern: Microservices, Gateway, dan Manajemen Sesi',
  },
  B302: {
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80',
    caption: 'Mekanisme Retrieval-Augmented Generation (RAG) dan Basis Data Vektor',
  },
  B303: {
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
    caption: 'Eksekusi Alat Eksternal: Tool-Use dan Function Calling pada LLM',
  },
  B304: {
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    caption: 'Rancang Bangun Autonomous AI Agent dengan Siklus Penalaran ReAct',
  },
  B305: {
    url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80',
    caption: 'Strategi Optimasi Model: Fine-Tuning, Prompt Engineering, atau RAG',
  },
  B306: {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
    caption: 'Benchmarking dan Metrik Evaluasi Performa Model AI Skala Produksi',
  },
  B307: {
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
    caption: 'Keamanan Tingkat Lanjut: Red Teaming, Sandboxing, dan AI Safety Protocol',
  },
  B308: {
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    caption: 'Sprint Workshop Capstone: Pembangunan Solusi AI End-to-End',
  },
  B309: {
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80',
    caption: 'Presentasi dan Uji Ketahanan Teknis Proyek Capstone di Hadapan Reviewer',
  },
  B310: {
    url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80',
    caption: 'Ulasan Portofolio Kode, Code Review, dan Verifikasi Capstone',
  },
  B311: {
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
    caption: 'Kelulusan, Sertifikasi Kompetensi AI, dan Kesiapan Karier Profesional',
  },

  // Jalur GAFB (Generative AI for Beginners)
  G01: {
    url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=80',
    caption: 'Dasar-Dasar Generative AI dan Transformasi Industri Teknologi',
  },
  G03: {
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80',
    caption: 'Teknik Menyusun Prompt Presisi untuk Hasil Maksimal',
  },
  G04: {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80',
    caption: 'Prompt Engineering Tingkat Lanjut: Struktur JSON dan Peran Sistem',
  },
  G05: {
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
    caption: 'Membangun Aplikasi Berbasis AI Menggunakan Gemini dan OpenAI API',
  },
  G06: {
    url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1000&q=80',
    caption: 'Arsitektur dan Alur Percakapan Chatbot Interaktif',
  },
  G09: {
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80',
    caption: 'Presentasi dan Komunikasi Solusi Berbasis Generative AI',
  },
  G10: {
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80',
    caption: 'Evaluasi Komprehensif dan Penilaian Pemahaman Generative AI',
  },
};

function insertImageSnippet(content, imgConfig) {
  if (!content) return content;
  // Jika sudah ada gambar markdown, jangan duplikasi
  if (/!\[.*?\]\(.*?\)|<img.*?>/i.test(content)) {
    return content;
  }

  const snippet = `\n\n![${imgConfig.caption}](${imgConfig.url})\n\n`;

  // Cari posisi ideal: tepat setelah judul utama '# ...'
  const titleMatch = content.match(/^#\s+[^\n]+/m);
  if (titleMatch && titleMatch.index !== undefined) {
    const insertPos = titleMatch.index + titleMatch[0].length;
    return content.slice(0, insertPos) + snippet + content.slice(insertPos);
  }

  // Jika tidak ada heading '#', sisipkan di awal
  return snippet + content;
}

async function main() {
  const { data: moduls, error } = await supabase
    .from('modul')
    .select('id, kode, judul, content_md, materi_peserta_md');

  if (error) {
    console.error('Error fetching modules:', error);
    process.exit(1);
  }

  console.log(`Checking ${moduls.length} modules...`);
  let updatedCount = 0;

  for (const m of moduls) {
    const imgConfig = MODULE_IMAGES[m.kode];
    if (!imgConfig) {
      console.log(`No image config for ${m.kode} (might already have images or custom)`);
      continue;
    }

    let needsUpdate = false;
    const updates = {};

    if (m.content_md) {
      const newContent = insertImageSnippet(m.content_md, imgConfig);
      if (newContent !== m.content_md) {
        updates.content_md = newContent;
        needsUpdate = true;
      }
    }

    if (m.materi_peserta_md) {
      const newMateri = insertImageSnippet(m.materi_peserta_md, imgConfig);
      if (newMateri !== m.materi_peserta_md) {
        updates.materi_peserta_md = newMateri;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const { error: upErr } = await supabase
        .from('modul')
        .update(updates)
        .eq('id', m.id);

      if (upErr) {
        console.error(`Failed to update ${m.kode}:`, upErr.message);
      } else {
        console.log(`✅ Berhasil menyisipkan gambar online ke modul ${m.kode} (${m.judul})`);
        updatedCount++;
      }
    } else {
      console.log(`ℹ️ Modul ${m.kode} sudah memiliki gambar atau tidak perlu diupdate.`);
    }
  }

  console.log(`\n🎉 SELESAI: ${updatedCount} modul berhasil diperbarui dengan gambar online (.jpg)!`);
}

main();
