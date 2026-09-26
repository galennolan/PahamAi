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
  { key: 'A', label: 'Anak 8–14 th', desc: '9 sesi · 60 menit', price: 'Rp 450.000', color: 'bg-emerald-500/20', icon: GraduationCap, features: ['Cerita & Gambar AI', 'Etika Digital', 'Presentasi Proyek'] },
  { key: 'B1', label: 'Pemula', desc: '7 sesi · 90 menit', price: 'Rp 450.000', color: 'bg-blue-500/20', icon: Lightbulb, features: ['Prompt Dasar', 'AI Produktivitas', 'Proyek Mini'] },
  { key: 'B2', label: 'Menengah', desc: '11 sesi · 120 menit', price: 'Rp 750.000', color: 'bg-cyan-500/20', icon: Code, features: ['Python & API', 'Automasi', 'Integrasi AI'] },
  { key: 'B3', label: 'Expert', desc: '11 sesi · 150 menit', price: 'Rp 2.250.000', color: 'bg-amber-500/20', icon: Bot, features: ['RAG & Agent', 'Fine-tuning', 'Capstone'] },
];

const FEATURES = [
  { icon: Shield, title: 'Aman & Privasi', desc: 'Akun terpisah orang tua/murid, RLS Supabase, UU PDP compliant' },
  { icon: Smartphone, title: 'Offline-First PWA', desc: 'Modul & catatan tersimpan lokal, sync otomatis saat online' },
  { icon: Target, title: 'Skill-Based Placement', desc: 'Bukan umur, tapi kemampuan: test penempatan otomatis' },
  { icon: Award, title: 'Sertifikat Resmi', desc: 'Nomor seri PAHAI/[TAHUN]/[JALUR]/[NOMOR], valid nasional' },
  { icon: Lightbulb, title: 'Project-Based', desc: 'Setiap sesi produce output nyata: gambar, script, agent' },
  { icon: Users, title: 'Komunitas Lokal', desc: 'Kelas tatap muka Solo-Sukoharjo-Wonogiri + online hybrid' },
];

const TESTIMONIALS = [
  { name: 'Ibu Siti (Wonogiri)', role: 'Orang Tua Jalur A', text: '"Anak saya sekarang bisa bikin cerita & gambar sendiri. Bukan main HP doang."' },
  { name: 'Budi S. (Solo)', role: 'Pegawai Jalur B1', text: '"Prompt engineering langsung praktek. Otomatisasi laporan mingguan jadi 5 menit."' },
  { name: 'Andi W. (Sukoharjo)', role: 'Mahasiswa Jalur B2', text: '"Python + API AI bikin skripsi cepat. Mentor sabar jelasin error."' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B]/50 to-transparent" />
        <div className="mx-auto max-w-6xl relative z-10 text-center">
          <span className="inline-block rounded-[9999px] border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-1 text-xs font-medium text-[#FBBF24] mb-6">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Batch Baru Oktober 2026 Dibuka
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Literasi AI <span className="text-[#FBBF24]">Praktis</span> untuk Semua
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#94A3B8] max-w-2xl mx-auto">
            Dari anak SD hingga profesional. Belajar prompt, coding, RAG, & agent AI
            dengan metode project-based, mentor lokal, & sertifikat resmi.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pendaftaran" className="w-full sm:w-auto min-h-[56px] rounded-[8px] bg-[#FBBF24] px-8 py-3 text-base font-bold text-[#0F172A] transition hover:bg-[#F59E0B]">
              Daftar Sekarang
              <ArrowRight className="inline h-4 w-4 ml-2" />
            </Link>
            <Link to="#jalur" className="w-full sm:w-auto min-h-[56px] rounded-[8px] border border-[#334155] bg-[#1E293B] px-8 py-3 text-base font-medium text-[#F1F5F9] hover:border-[#FBBF24]">
              Lihat Jalur & Harga
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#64748B]">
            <MapPin className="inline h-3 w-3 mr-1" />
            Solo · Sukoharjo · Wonogiri · Hybrid (Offline + Online)
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20 px-4 bg-[#1E293B]/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#F1F5F9]">Mengapa Paham AI?</h2>
            <p className="mt-2 text-[#94A3B8]">Dirancang untuk konteks Indonesia: murah, inklusif, aman, & produktif</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition hover:border-[#FBBF24]/40">
                <div className="text-3xl mb-3 text-[#FBBF24]">
                  <f.icon className="h-8 w-8 mx-auto" />
                </div>
                <h3 className="text-subhead font-semibold text-[#F1F5F9]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Jalur & Harga */}
      <section id="jalur" className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#F1F5F9]">Pilih Jalur Anda</h2>
            <p className="mt-2 text-[#94A3B8]">Penempatan berdasarkan skill, bukan umur. Test placement gratis saat daftar.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {JALUR_CARDS.map((j) => (
              <Card key={j.key} className={`${j.color} transition hover:scale-[1.02]`}>
                <div className="text-4xl mb-3 text-[#FBBF24]">
                  <j.icon className="h-10 w-10 mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-[#F1F5F9]">{j.label}</h3>
                <p className="mt-1 text-sm text-[#94A3B8]">{j.desc}</p>
                <p className="mt-3 text-2xl font-bold text-[#FBBF24]">{j.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-[#F1F5F9]">
                  {j.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#FBBF24] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pendaftaran"
                  className="mt-6 block min-h-[48px] rounded-[8px] bg-[#FBBF24] px-4 py-2.5 text-center text-sm font-bold text-[#0F172A] transition hover:bg-[#F59E0B]"
                >
                  Pilih Jalur Ini
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-[#1E293B]/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#F1F5F9]">Cerita Peserta</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="text-center">
                <div className="text-5xl mb-3 text-[#FBBF24]">
                  <Brain className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-body text-[#F1F5F9] italic">"{t.text}"</p>
                <p className="mt-4 font-semibold text-[#F1F5F9]">{t.name}</p>
                <p className="text-xs text-[#64748B]">{t.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-[#F1F5F9]">Siap Memulai?</h2>
          <p className="mt-3 text-[#94A3B8]">Batch berikutnya Oktober 2026. Kuota terbatas, daftar sekarang.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pendaftaran" className="w-full sm:w-auto min-h-[56px] rounded-[8px] bg-[#FBBF24] px-8 py-3 text-base font-bold text-[#0F172A] transition hover:bg-[#F59E0B]">
              Mulai Pendaftaran
              <ArrowRight className="inline h-4 w-4 ml-2" />
            </Link>
            <Link to="#fitur" className="w-full sm:w-auto min-h-[56px] rounded-[8px] border border-[#334155] bg-[#1E293B] px-8 py-3 text-base font-medium text-[#F1F5F9] hover:border-[#FBBF24]">
              Pelajari Lebih Lanjut
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#1E293B]">
        <div className="mx-auto max-w-6xl text-center text-sm text-[#64748B]">
          <p>Paham AI — Kursus Literasi AI Hybrid (Offline + Online)</p>
          <p className="mt-1">Solo · Sukoharjo · Wonogiri | © 2026</p>
        </div>
      </footer>
    </div>
  );
}