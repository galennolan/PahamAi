import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Butuh VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// ID Tetap untuk Kelas Demo
const KELAS_ID = {
  A: '11111111-1111-1111-1111-111111111111',
  B1: '22222222-2222-2222-2222-222222222222',
  B2: '33333333-3333-3333-3333-333333333333',
  B3: '44444444-4444-4444-4444-444444444444',
};

async function main() {
  console.log('🚀 Memulai Database Seeding Lengkap (Paham AI)...\n');

  // ==========================================
  // 1. Ambil data peserta & kelas yang ada
  // ==========================================
  const { data: pesertaList, error: pErr } = await sb.from('peserta').select('id, user_id, nama_lengkap, email, kelas_id');
  if (pErr) throw new Error(`Gagal ambil peserta: ${pErr.message}`);

  const muridBudi = pesertaList.find((p) => p.email === 'murid@paham.ai');
  const muridSiti = pesertaList.find((p) => p.email === 'murid2@paham.ai');

  if (!muridBudi) {
    console.warn('⚠️ Peserta murid@paham.ai belum ada. Jalankan node scripts/seed-users.mjs terlebih dahulu.');
    return;
  }

  // ==========================================
  // 2. Seed Jadwal Sesi & Sesi Peserta untuk Murid
  // ==========================================
  console.log('📌 1. Memeriksa jadwal & penugasan sesi peserta...');
  const { data: sesiPesertaList } = await sb
    .from('sesi_peserta')
    .select('id, sesi_id, peserta_id, jadwal_sesi(id, kode_sesi_friendly, modul_id)')
    .eq('peserta_id', muridBudi.id);

  console.log(`   Ditemukan ${sesiPesertaList?.length || 0} penugasan sesi untuk ${muridBudi.nama_lengkap}.`);

  const spFirst = sesiPesertaList?.[0];
  const spSecond = sesiPesertaList?.[1];

  // ==========================================
  // 3. Seed Catatan Ketik
  // ==========================================
  console.log('\n📌 2. Seeding Catatan Ketik...');
  if (spFirst) {
    const { data: existCatatan } = await sb.from('catatan_ketik').select('id').eq('sesi_peserta_id', spFirst.id).maybeSingle();
    if (!existCatatan) {
      const { error } = await sb.from('catatan_ketik').insert({
        sesi_peserta_id: spFirst.id,
        catatan_text: '### Rangkuman Sesi 1\n\n- AI adalah sistem komputer yang dapat meniru kecerdasan manusia.\n- Model LLM (seperti GPT & Claude) bekerja dengan memprediksi token berikutnya berdasarkan probabilitas.\n- Pembelajaran berpusat pada pemahaman prompt yang presisi dan etika verifikasi.',
        status_pengumpulan: true,
        sync_status: 'synced',
      });
      if (error) console.error('   ✗ Catatan ketik:', error.message);
      else console.log('   ✓ Catatan ketik berhasil dibuat untuk Sesi 1');
    } else {
      console.log('   ↻ Catatan ketik sudah ada.');
    }
  }

  // ==========================================
  // 4. Seed Learning Sketches (TLDraw Whiteboard Snapshot)
  // ==========================================
  console.log('\n📌 3. Seeding Learning Sketches (TLDraw Canvas)...');
  if (spFirst) {
    const { data: existSketch } = await sb.from('learning_sketches').select('id').eq('sesi_peserta_id', spFirst.id).maybeSingle();
    if (!existSketch) {
      const sampleSnapshot = {
        meta: { name: 'Catatan Visual Sesi 1' },
        records: [
          { id: 'shape:text_1', type: 'text', x: 120, y: 100, props: { text: 'Arsitektur Prompting' } },
          { id: 'shape:arrow_1', type: 'arrow', x: 280, y: 110, props: { text: 'Next Token' } },
        ],
      };
      const { error } = await sb.from('learning_sketches').insert({
        sesi_peserta_id: spFirst.id,
        snapshot: sampleSnapshot,
        sync_status: 'synced',
      });
      if (error) console.error('   ✗ Learning sketches:', error.message);
      else console.log('   ✓ Learning sketches snapshot berhasil dibuat.');
    } else {
      console.log('   ↻ Learning sketches sudah ada.');
    }
  }

  // ==========================================
  // 5. Seed Pembayaran
  // ==========================================
  console.log('\n📌 4. Seeding Data Pembayaran...');
  for (const p of [muridBudi, muridSiti].filter(Boolean)) {
    const { data: existBayar } = await sb.from('pembayaran').select('id').eq('peserta_id', p.id).maybeSingle();
    if (!existBayar) {
      const isLunas = p.email === 'murid@paham.ai';
      const { error } = await sb.from('pembayaran').insert({
        peserta_id: p.id,
        biaya_total: 2500000,
        dibayar: isLunas ? 2500000 : 1250000,
        due_date: '2026-11-15',
        status_bayar: isLunas ? 'lunas' : 'cicilan',
        lock_status: 'terbuka',
        metode: 'transfer_bank',
        bukti_transfer_url: 'https://example.com/receipt-demo.jpg',
        refund_status: 'tidak_ajukan',
        rollover_count: 0,
      });
      if (error) console.error(`   ✗ Pembayaran ${p.nama_lengkap}:`, error.message);
      else console.log(`   ✓ Pembayaran ${p.nama_lengkap} (${isLunas ? 'Lunas' : 'Cicilan'})`);
    } else {
      console.log(`   ↻ Pembayaran ${p.nama_lengkap} sudah ada.`);
    }
  }

  // ==========================================
  // 6. Seed Portfolio Item
  // ==========================================
  console.log('\n📌 5. Seeding Portfolio Item...');
  const { data: existPorto } = await sb.from('portfolio_item').select('id').eq('id_peserta_fk', muridBudi.id).maybeSingle();
  if (!existPorto) {
    const { error } = await sb.from('portfolio_item').insert({
      id_peserta_fk: muridBudi.id,
      kode_sesi: 'B106',
      item_url: 'https://github.com/paham-ai/smart-customer-support-agent',
      item_type: 'github',
      tanggal: '2026-10-18',
      deskripsi: 'Customer Support AI Agent dengan Integrasi Knowledge Base FAQ dan Fallback Human Operator.',
    });
    if (error) console.error('   ✗ Portfolio item:', error.message);
    else console.log('   ✓ Portfolio item berhasil ditambahkan.');
  } else {
    console.log('   ↻ Portfolio item sudah ada.');
  }

  // ==========================================
  // 7. Seed Sertifikat
  // ==========================================
  console.log('\n📌 6. Seeding Sertifikat Kelulusan...');
  const { data: existSertif } = await sb.from('sertifikat').select('id').eq('id_peserta_fk', muridBudi.id).maybeSingle();
  if (!existSertif) {
    const { error } = await sb.from('sertifikat').insert({
      id_peserta_fk: muridBudi.id,
      nomor_seri: 'PAHAI-2026-B1-0089',
      level_lulus: 'Dengan Pujian (Distinction)',
      tanggal_terbit: '2026-10-25',
      file_url: 'https://paham.ai/storage/certificates/PAHAI-2026-B1-0089.pdf',
      signed_by: 'Budi Instruktur (Head of Academic)',
    });
    if (error) console.error('   ✗ Sertifikat:', error.message);
    else console.log('   ✓ Sertifikat kelulusan berhasil diterbitkan.');
  } else {
    console.log('   ↻ Sertifikat sudah ada.');
  }

  // ==========================================
  // 8. Seed Placement Respons
  // ==========================================
  console.log('\n📌 7. Seeding Placement Test Respons (Leads)...');
  const { data: pendaftarList } = await sb.from('pendaftar').select('id, nama_lengkap, email').limit(2);
  if (pendaftarList && pendaftarList.length > 0) {
    for (const [idx, lead] of pendaftarList.entries()) {
      const { data: existPlace } = await sb.from('placement_respons').select('id').eq('id_pendaftar_fk', lead.id).maybeSingle();
      if (!existPlace) {
        const { error } = await sb.from('placement_respons').insert({
          id_pendaftar_fk: lead.id,
          jawaban_json: {
            pengalaman_coding: 'dasar',
            pemahaman_llm: 'pernah_pakai_chatgpt',
            tujuan_belajar: 'otomasi_pekerjaan_kantor',
            skor_analitikal: 80,
          },
          skor_blok1: 85,
          level_akhir: idx === 0 ? '2' : '3',
          rekomendasi_kelas: 'Menengah Batch 1 Solo',
          tanggal: '2026-09-25',
        });
        if (error) console.error(`   ✗ Placement respons ${lead.nama_lengkap}:`, error.message);
        else console.log(`   ✓ Placement respons ${lead.nama_lengkap} tersimpan.`);
      } else {
        console.log(`   ↻ Placement respons ${lead.nama_lengkap} sudah ada.`);
      }
    }
  }

  // ==========================================
  // 9. Seed Survei Kepuasan (NPS)
  // ==========================================
  console.log('\n📌 8. Seeding Survei Kepuasan (NPS)...');
  const { data: existSurvei } = await sb.from('survei_respons').select('id').eq('id_peserta_fk', muridBudi.id).maybeSingle();
  if (!existSurvei) {
    const { error } = await sb.from('survei_respons').insert({
      kelas_id: muridBudi.kelas_id || KELAS_ID.B1,
      id_peserta_fk: muridBudi.id,
      kelompok: 'peserta',
      nps: 10,
      rating_materi: 5,
      rating_instruktur: 5,
      rating_nilai_uang: 5,
      feedback: 'Kursus AI terbaik! Materi sangat terstruktur, banyak praktik hands-on, dan bimbingan instruktur sangat detail.',
    });
    if (error) console.error('   ✗ Survei respons:', error.message);
    else console.log('   ✓ Survei respons berhasil diinput.');
  } else {
    console.log('   ↻ Survei respons sudah ada.');
  }

  // ==========================================
  // 10. Periksa & Perbaiki Hygiene Jadwal Sesi yang Tidak Valid
  // ==========================================
  console.log('\n📌 9. Memeriksa & Membersihkan Hygiene Jadwal Sesi...');
  // Perbaiki jam cross-midnight jika ada
  const { data: invalidTime } = await sb
    .from('jadwal_sesi')
    .select('id, jam_mulai, jam_akhir')
    .filter('jam_akhir', 'lte', '02:00:00');

  if (invalidTime && invalidTime.length > 0) {
    for (const row of invalidTime) {
      await sb.from('jadwal_sesi').update({ jam_akhir: '23:59:59' }).eq('id', row.id);
      console.log(`   ✓ Perbaiki jam_akhir untuk sesi ${row.id}`);
    }
  }

  console.log('\n🎉 Selesai! Semua tabel database Paham AI telah terisi data demo yang koheren & valid.');
}

main().catch((err) => {
  console.error('\n❌ Terjadi kesalahan:', err);
  process.exit(1);
});
