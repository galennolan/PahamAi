import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';
import {
  Shield,
  Smartphone,
  Target,
  Award,
  Lightbulb,
  Users,
  MapPin,
  ArrowRight,
  Check,
  Sparkles,
  Brain,
  Code,
  GraduationCap,
  Bot,
} from 'lucide-react';

const JALUR_CARDS = [
  { key: 'MOD-AI-01', label: 'Dasar AI & Prompting', desc: '14 sesi · 100 menit (2 SKS)', price: 'Rp 650.000', color: 'bg-emerald-500/20', icon: Lightbulb, features: ['Konsep LLM & Tokenisasi', 'Advanced Prompt Engineering', 'No-Code AI & Productivity'] },
  { key: 'MOD-AI-02', label: 'Machine Learning & DL', desc: '14 sesi · 100 menit (2 SKS)', price: 'Rp 950.000', color: 'bg-blue-500/20', icon: Code, features: ['Supervised & Unsupervised', 'Neural Networks & CNN/RNN', 'Transformer Architecture'] },
  { key: 'MOD-AI-03', label: 'AI Engineering & Agents', desc: '14 sesi · 100 menit (2 SKS)', price: 'Rp 1.450.000', color: 'bg-amber-500/20', icon: Bot, features: ['Vector DB & RAG Pipeline', 'ReAct Autonomous Agents', 'Production Deployment'] },
];

const FEATURES = [
  { icon: Shield, title: 'Aman & Privasi', desc: 'Sistem terstruktur, RLS Supabase, UU PDP compliant' },
  { icon: Smartphone, title: 'Offline-First PWA', desc: 'Modul perkuliahan & catatan tersimpan lokal, sync otomatis' },
  { icon: Target, title: 'Standar Kurikulum 14 Pertemuan', desc: 'Setiap modul memuat 14 pertemuan terstruktur lengkap dengan kuis' },
  { icon: Award, title: 'Sertifikat Kompetensi', desc: 'Nomor seri PAHAI/[TAHUN]/[MODUL]/[NOMOR], valid nasional' },
  { icon: Lightbulb, title: 'Project-Based Learning', desc: 'Setiap pertemuan menghasilkan pemahaman dan latihan nyata' },
  { icon: Users, title: 'Hybrid & Kampus', desc: 'Dukungan kelas luring maupun daring berbasis teknologi modern' },
];

const TESTIMONIALS = [
  { name: 'Rian Pratama', role: 'Mahasiswa Teknik Informatika', text: '"Materi 14 pertemuannya sangat runut. Dari dasar prompt sampai arsitektur Transformer."' },
  { name: 'Budi Santoso', role: 'Data Analyst', text: '"Praktek Machine Learning langsung terarah. Kuis interaktif Quizizz bikin cepat paham konsep."' },
  { name: 'Dina Kusuma', role: 'Software Engineer', text: '"Modul AI Engineering sangat aplikatif. RAG dan autonomous agent bisa langsung diterapkan di kerjaan."' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[surface]/50 to-transparent" />
        <div className="mx-auto max-w-6xl relative z-10 text-center">
          <span className="inline-block rounded-[9999px] border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-text mb-6">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Batch Baru Oktober 2026 Dibuka
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Literasi AI <span className="text-primary-text">Praktis</span> untuk Semua
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-fg-muted max-w-2xl mx-auto">
            Dari anak SD hingga profesional. Belajar prompt, coding, RAG, & agent AI
            dengan metode project-based, mentor lokal, & sertifikat resmi.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pendaftaran" className="w-full sm:w-auto min-h-[56px] rounded-[8px] bg-primary px-8 py-3 text-base font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover">
              Daftar Sekarang
              <ArrowRight className="inline h-4 w-4 ml-2" />
            </Link>
            <Link to="#jalur" className="w-full sm:w-auto min-h-[56px] rounded-[8px] border border-border-2 bg-surface px-8 py-3 text-base font-medium text-fg hover:border-primary">
              Lihat Jalur & Harga
            </Link>
          </div>
          <p className="mt-4 text-sm text-fg-subtle">
            <MapPin className="inline h-3 w-3 mr-1" />
            Solo · Sukoharjo · Wonogiri · Hybrid (Offline + Online)
          </p>

          {/* Quick login */}
          <div className="mt-10 border-t border-border-2 pt-8">
            <p className="text-sm font-medium text-fg-muted">Sudah punya akun?</p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/masuk?role=peserta"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[8px] border border-border-2 bg-surface px-6 py-3 text-sm font-semibold text-fg transition hover:border-primary sm:w-auto"
              >
                <GraduationCap className="h-5 w-5 text-primary-text" />
                Masuk sebagai Peserta
              </Link>
              <Link
                to="/masuk?role=tutor"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[8px] border border-border-2 bg-surface px-6 py-3 text-sm font-semibold text-fg transition hover:border-primary sm:w-auto"
              >
                <Users className="h-5 w-5 text-primary-text" />
                Masuk sebagai Tutor
              </Link>
            </div>
            <p className="mt-3 text-xs text-fg-subtle">
              Lupa password? Hubungi admin/instruktur untuk reset.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20 px-4 bg-surface/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-fg">Mengapa Paham AI?</h2>
            <p className="mt-2 text-fg-muted">Dirancang untuk konteks Indonesia: murah, inklusif, aman, & produktif</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition hover:border-primary/40">
                <div className="text-3xl mb-3 text-primary-text">
                  <f.icon className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="text-subhead font-semibold text-fg">{f.title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Jalur & Harga */}
      <section id="jalur" className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-fg">Pilih Modul Kurikulum Anda</h2>
            <p className="mt-2 text-fg-muted">Penempatan berdasarkan skill, bukan umur. Test placement gratis saat daftar.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {JALUR_CARDS.map((j) => (
              <Card key={j.key} className={`${j.color} transition hover:scale-[1.02]`}>
                <div className="text-4xl mb-3 text-primary-text">
                  <j.icon className="h-10 w-10 mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-fg">{j.label}</h3>
                <p className="mt-1 text-sm text-fg-muted">{j.desc}</p>
                <p className="mt-3 text-2xl font-bold text-primary-text">{j.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-fg">
                  {j.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary-text shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pendaftaran"
                  className="mt-6 block min-h-[48px] rounded-[8px] bg-primary px-4 py-2.5 text-center text-sm font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover"
                >
                  Pilih Jalur Ini
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-surface/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-fg">Cerita Peserta</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="text-center">
                <div className="text-5xl mb-3 text-primary-text">
                  <Brain className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-body text-fg italic">"{t.text}"</p>
                <p className="mt-4 font-semibold text-fg">{t.name}</p>
                <p className="text-xs text-fg-subtle">{t.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-fg">Siap Memulai?</h2>
          <p className="mt-3 text-fg-muted">Batch berikutnya Oktober 2026. Kuota terbatas, daftar sekarang.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pendaftaran" className="w-full sm:w-auto min-h-[56px] rounded-[8px] bg-primary px-8 py-3 text-base font-bold text-[rgb(var(--on-primary))] transition hover:bg-primary-hover">
              Mulai Pendaftaran
              <ArrowRight className="inline h-4 w-4 ml-2" />
            </Link>
            <Link to="#fitur" className="w-full sm:w-auto min-h-[56px] rounded-[8px] border border-border-2 bg-surface px-8 py-3 text-base font-medium text-fg hover:border-primary">
              Pelajari Lebih Lanjut
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="mx-auto max-w-6xl text-center text-sm text-fg-subtle">
          <p>Paham AI — Kursus Literasi AI Hybrid (Offline + Online)</p>
          <p className="mt-1">Solo · Sukoharjo · Wonogiri | © 2026</p>
        </div>
      </footer>
    </div>
  );
}