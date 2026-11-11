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

// Bank Soal 2 Soal per Modul Induk & 2 Soal per Pertemuan (1-14)
const DATA_SOAL = [
  // ==========================================
  // MODUL INDUK 1: DASAR AI & PROMPTING
  // ==========================================
  {
    kode_paket: 'KUIS-MOD-AI-01',
    program: 'MOD-AI-01',
    sesi_target: 'MOD-AI-01',
    tipe: 'kuis',
    durasi_menit: 5,
    soal: [
      {
        no_soal: 1,
        pertanyaan: 'Dalam arsitektur Large Language Model (LLM), proses mengubah teks input menjadi representasi numerik terkecil disebut...',
        pilihan_a: 'Tokenisasi',
        pilihan_b: 'Kuantisasi',
        pilihan_c: 'Normalisasi Data',
        pilihan_d: 'Ekstraksi Vektor',
        kunci: 'A',
        pembahasan: 'Tokenisasi adalah proses memecah teks menjadi potongan kecil (token) berupa kata atau sub-kata dan memetakannya ke integer ID sebelum diproses oleh model.',
        bobot_skor: 50,
      },
      {
        no_soal: 2,
        pertanyaan: 'Manakah teknik prompt engineering yang paling efektif untuk membimbing AI memecahkan masalah matematika atau logika multi-tahap?',
        pilihan_a: 'Zero-shot Prompting',
        pilihan_b: 'Chain-of-Thought (CoT) Prompting',
        pilihan_c: 'Negative Prompting',
        pilihan_d: 'Instruction Override',
        kunci: 'B',
        pembahasan: 'Chain-of-Thought (CoT) membimbing model untuk menguraikan tahapan berpikir langkah demi langkah secara eksplisit sebelum memberikan kesimpulan akhir.',
        bobot_skor: 50,
      },
    ],
  },

  // ==========================================
  // MODUL INDUK 2: MACHINE LEARNING & DL
  // ==========================================
  {
    kode_paket: 'KUIS-MOD-AI-02',
    program: 'MOD-AI-02',
    sesi_target: 'MOD-AI-02',
    tipe: 'kuis',
    durasi_menit: 5,
    soal: [
      {
        no_soal: 1,
        pertanyaan: 'Karakteristik utama yang membedakan Supervised Learning dengan Unsupervised Learning adalah...',
        pilihan_a: 'Supervised Learning menggunakan data yang telah berlabel (ground truth)',
        pilihan_b: 'Supervised Learning tidak memerlukan proses evaluasi performa model',
        pilihan_c: 'Unsupervised Learning hanya dapat digunakan untuk data berbentuk citra visual',
        pilihan_d: 'Supervised Learning berjalan tanpa proses komputasi gradien bobot',
        kunci: 'A',
        pembahasan: 'Supervised learning dilatih menggunakan pasangan fitur dan label target yang diketahui (ground truth) untuk memprediksi keluaran yang sesuai.',
        bobot_skor: 50,
      },
      {
        no_soal: 2,
        pertanyaan: 'Mekanisme revolusioner dalam arsitektur Transformer yang memungkinkan model memperhatikan seluruh kata dalam konteks secara paralel adalah...',
        pilihan_a: 'Recurrent Feedback Loop',
        pilihan_b: 'Self-Attention Mechanism',
        pilihan_c: 'Max Pooling Layer',
        pilihan_d: 'Markov Decision Process',
        kunci: 'B',
        pembahasan: 'Self-Attention menghitung bobot relevansi antara setiap pasangan token dalam urutan secara bersamaan tanpa bergantung pada urutan sekuensial rekursif.',
        bobot_skor: 50,
      },
    ],
  },

  // ==========================================
  // MODUL INDUK 3: AI ENGINEERING, RAG & AGENTS
  // ==========================================
  {
    kode_paket: 'KUIS-MOD-AI-03',
    program: 'MOD-AI-03',
    sesi_target: 'MOD-AI-03',
    tipe: 'kuis',
    durasi_menit: 5,
    soal: [
      {
        no_soal: 1,
        pertanyaan: 'Tujuan utama dari arsitektur Retrieval-Augmented Generation (RAG) pada aplikasi berbasis LLM adalah...',
        pilihan_a: 'Mengurangi ukuran model dasar agar dapat dijalankan di mikroprosesor kecil',
        pilihan_b: 'Menyediakan konteks dokumen eksternal terkini dan faktual ke prompt model tanpa melatih ulang (fine-tuning)',
        pilihan_c: 'Mengganti fungsi sistem database relasional secara keseluruhan',
        pilihan_d: 'Mengubah format audio secara instan menjadi ucapan sintesis',
        kunci: 'B',
        pembahasan: 'RAG mengambil data relevan dari basis pengetahuan eksternal (misal vector database) dan menyuntikkannya ke dalam konteks prompt agar jawaban LLM akurat, berbasis fakta, dan bebas halusinasi.',
        bobot_skor: 50,
      },
      {
        no_soal: 2,
        pertanyaan: 'Dalam arsitektur Autonomous AI Agent, pola ReAct mengintegrasikan dua kemampuan kunci secara berulang, yaitu...',
        pilihan_a: 'Reasoning (Penalaran) dan Acting (Tindakan/Tool-Use)',
        pilihan_b: 'Rendering dan Activation',
        pilihan_c: 'Recursion dan Automated Testing',
        pilihan_d: 'Refactoring dan Actionscripting',
        kunci: 'A',
        pembahasan: 'Pola ReAct (Reason + Act) memadukan penalaran logis (merumuskan rencana) dan eksekusi tindakan nyata (memanggil API / tools eksternal) untuk menyelesaikan tugas kompleks.',
        bobot_skor: 50,
      },
    ],
  },
];

// Helper membuat 2 soal per pertemuan untuk Modul 1, 2, 3
const PERTEMUAN_SOAL_DATA = {
  // MODUL 1 (AI01-P01 s.d. P14)
  AI01: [
    { p: 1, q1: ['Apakah perbedaan mendasar antara Traditional Programming dan Artificial Intelligence?', 'Traditional programming berbasis aturan statis (rule-based), sedangkan AI memelajari pola dari data', 'Traditional programming selalu membutuhkan GPU berkecepatan tinggi', 'AI tidak memerlukan data sama sekali', 'Traditional programming hanya bisa mengolah angka bulat', 'A', 'Traditional programming mengonversi aturan eksplisit dan data menjadi keluaran, sedangkan AI mempelajari pola dari data masukan dan luaran untuk menghasilkan model.'] },
    { p: 2, q1: ['Mengapa token berbeda dengan karakter atau kata biasa dalam pemrosesan LLM?', 'Satu token rata-rata setara dengan 3-4 karakter bahasa Inggris atau bagian sub-kata', 'Token hanya digunakan untuk mengenkripsi password sistem', 'Token berukuran tetap 1 byte di seluruh bahasa manusia', 'Satu token selalu tepat merepresentasikan satu kalimat penuh', 'A', 'LLM menggunakan algoritma Byte-Pair Encoding (BPE) di mana token adalah representasi sub-kata untuk efisiensi vokabulari model.'] },
    { p: 3, q1: ['Bagaimana cara terbaik menginstruksikan LLM agar mengeluarkan format JSON yang valid?', 'Berikan skema JSON contoh (schema template) dan tegaskan instruksi valid JSON tanpa komentar markdown', 'Ketik prompt menggunakan huruf kapital semua', 'Ulangi pertanyaan sebanyak lima kali dalam satu prompt', 'Hapus semua tanda baca dari instruksi prompt', 'A', 'Memberikan contoh format eksplisit (few-shot / JSON schema) memastikan LLM menghasilkan sintaks JSON valid yang siap diparsing program.'] },
    { p: 4, q1: ['Apa kegunaan utama dari System Instructions (System Prompt) dibandingkan User Prompt biasa?', 'Menetapkan batasan persona, nada komunikasi, dan aturan tetap di seluruh sesi percakapan', 'Mempercepat kecepatan koneksi internet pengguna', 'Menghilangkan konsumsi memori GPU pada server', 'Mengubah bobot parameter model secara permanen', 'A', 'System instructions memberikan kerangka kerja dan persona tetap yang memandu bagaimana model merespons seluruh percakapan pengguna.'] },
    { p: 5, q1: ['Pendekatan Few-Shot Prompting bekerja dengan cara...', 'Memberikan beberapa contoh pasangan input-output yang diinginkan sebelum meminta tugas baru', 'Menjalankan inferensi model dengan jumlah thread CPU seminimal mungkin', 'Memotong teks masukan agar tidak melebihi satu baris kalimat', 'Menolak pertanyaan pengguna yang terlalu mendalam', 'A', 'Few-shot prompting memberikan model konteks eksplisit berupa 2-3 contoh bagaimana tugas seharusnya diselesaikan sebelum mengerjakan input baru.'] },
    { p: 6, q1: ['Frasa pemicu sederhana apa yang sering kali meningkatkan akurasi penalaran CoT pada LLM?', '"Let\'s think step by step"', '"Answer immediately without thinking"', '"Ignore all previous rules"', '"Translate this to binary code"', 'A', 'Frasa "Let\'s think step by step" merangsang model untuk menghasilkan token penalaran berurutan yang meminimalkan kesalahan logika.'] },
    { p: 7, q1: ['Teknik apa yang disarankan untuk merangkum dokumen panjang melampaui batas context window model?', 'Map-Reduce Summarization atau hierarchical chunking', 'Menghapus 90% kata kunci secara acak', 'Mengonversi seluruh teks menjadi file gambar PNG', 'Mengabaikan isi dokumen dan meminta model mengarang bebas', 'A', 'Map-Reduce membagi dokumen menjadi bagian-bagian kecil (chunks), merangkum masing-masing bagian, lalu menggabungkan hasil rangkuman tersebut.'] },
    { p: 8, q1: ['Pada evaluasi prompt engineering, parameter "Temperature" yang bernilai mendekati 0.0 menghasilkan keluaran yang bersifat...', 'Deterministik, fokus, dan konsisten', 'Sangat acak, puitis, dan tak terduga', 'Tidak menghasilkan token apa pun (error timeout)', 'Menggandakan panjang jawaban sebanyak dua kali lipat', 'A', 'Temperature rendah (0.0 - 0.2) membuat model memilih token dengan probabilitas tertinggi, ideal untuk tugas analitis dan komputasi presisi.'] },
    { p: 9, q1: ['Saat meminta AI menganalisis data CSV, praktik keamanan data yang wajib diperhatikan adalah...', 'Melakukan anonimisasi dan menghapus Personally Identifiable Information (PII)', 'Mengunggah seluruh kredensial database internal perusahaan', 'Menonaktifkan enkripsi HTTPS saat transfer data', 'Menyimpan password akun ke dalam kolom CSV', 'A', 'Menjaga privasi data mewajibkan kita membuang PII seperti NIK, nomor telepon, dan email sebelum dikirim ke API pihak ketiga.'] },
    { p: 10, q1: ['Fenomena "Halusinasi" pada LLM merujuk pada kondisi ketika model...', 'Menghasilkan informasi yang terdengar meyakinkan namun secara faktual salah atau fiktif', 'Mengalami crash server akibat kehabisan RAM', 'Menolak menjawab karena materi melanggar hukum hak cipta', 'Menjawab dalam bahasa yang tidak dipahami manusia', 'A', 'Halusinasi terjadi karena LLM adalah prediktor probabilitas statistik kelanjutan kata, bukan database fakta deterministik.'] },
    { p: 11, q1: ['Serangan "Prompt Injection" pada aplikasi berbasis LLM bertujuan untuk...', 'Membajak instruksi sistem dan memanipulasi model agar melanggar batasan yang ditentukan', 'Merusak hardware server secara fisik dengan overvoltage', 'Memperlambat frekuensi clock prosesor klien', 'Menyusupkan virus trojan ke bios komputer', 'A', 'Prompt injection menyisipkan teks berbahaya dari input pengguna untuk menimpa aturan sistem aslinya.'] },
    { p: 12, q1: ['Dalam platform otomasi tanpa kode (seperti n8n atau Zapier), peran LLM umumnya sebagai...', 'Node kecerdasan transformasional untuk parsing, klasifikasi, atau ekstraksi informasi terstruktur', 'Penyedia daya listrik server', 'Pengganti kabel LAN ethernet', 'Penyimpan data cadangan tape magnetic', 'A', 'LLM berfungsi sebagai intelligent node yang menghubungkan berbagai API melalui pemrosesan data bahasa alami.'] },
    { p: 13, q1: ['Indikator Return on Investment (ROI) utama penerapan solusi AI pada proses bisnis adalah...', 'Efisiensi waktu penyelesaian tugas, penurunan tingkat kesalahan, dan peningkatan kepuasan pelanggan', 'Banyaknya warna lampu LED pada casing server', 'Jumlah karakter prompt yang diketik setiap hari', 'Popularitas model di media sosial', 'A', 'ROI solusi AI diukur melalui efisiensi operasional terukur, penghematan jam kerja, dan kualitas layanan yang meningkat.'] },
    { p: 14, q1: ['Langkah krusial sebelum meluncurkan sistem AI generatif ke lingkungan produksi publik adalah...', 'Melakukan uji ketahanan (Red Teaming), audit keamanan prompt, dan monitoring batas biaya (rate limit/budget)', 'Menghapus seluruh dokumentasi API', 'Menghilangkan mekanisme logging error', 'Memberikan akses admin penuh tanpa autentikasi kepada publik', 'A', 'Red Teaming dan observabilitas sistem menjamin aplikasi aman dari eksploitasi prompt berbahaya dan pembengkakan biaya token tak terkendali.'] },
  ],
  // MODUL 2 (AI02-P01 s.d. P14)
  AI02: [
    { p: 1, q1: ['Pustaka fundamental Python yang menjadi standar utama komputasi matriks dan array multidimensi dalam Machine Learning adalah...', 'NumPy', 'Flask', 'BeautifulSoup', 'Tkinter', 'A', 'NumPy menyediakan struktur data ndarray berkinerja tinggi yang dioptimalkan dengan bahasa C untuk operasi aljabar linier.'] },
    { p: 2, q1: ['Tujuan dari teknik penskalaan fitur (seperti Min-Max Scaling atau Standard Scaling) adalah...', 'Menyamakan rentang nilai antar fitur agar fitur bernilai besar tidak mendominasi gradien model', 'Mengubah data numerik menjadi data suara MP3', 'Menghilangkan separuh baris dataset secara acak', 'Memperbesar ukuran file dataset agar komputasi lebih lama', 'A', 'Feature scaling memastikan algoritma berbasis jarak (seperti KNN, SVM, dan Neural Networks) konvergen secara stabil dan adil terhadap seluruh fitur.'] },
    { p: 3, q1: ['Algoritma Regresi Logistik (Logistic Regression) sebenarnya digunakan untuk tugas...', 'Klasifikasi (memprediksi probabilitas kelas kategorikal)', 'Regresi nilai kontinu tak terbatas', 'Kompresi file gambar ZIP', 'Clustering tanpa label', 'A', 'Meskipun bernama "regresi", regresi logistik menggunakan fungsi sigmoid untuk memetakan luaran ke rentang probabilitas 0 hingga 1 untuk klasifikasi.'] },
    { p: 4, q1: ['Teknik penggabungan (ensemble) beberapa Decision Tree untuk mengurangi varians dan mencegah overfitting disebut...', 'Random Forest', 'Linear Search', 'Bubble Sort', 'K-Means', 'A', 'Random Forest menggabungkan banyak decision tree secara bagging (bootstrap aggregating) sehingga prediksi akhir lebih stabil dan akurat.'] },
    { p: 5, q1: ['Pada kasus deteksi penyakit medis berisiko tinggi di mana pasien sakit tidak boleh luput, metrik yang paling diprioritaskan adalah...', 'Recall (Sensitivitas)', 'Accuracy keseluruhan semata', 'Ukuran memori file model', 'Kecepatan klik mouse pengguna', 'A', 'Recall tinggi meminimalkan False Negative (kasus pasien sakit yang salah terdeteksi sebagai sehat).'] },
    { p: 6, q1: ['Principal Component Analysis (PCA) merupakan metode unsupervised yang digunakan untuk...', 'Reduksi dimensi data dengan mempertahankan varians informasi sebesar mungkin', 'Menambahkan watermark ke dokumen PDF', 'Mengurutkan nama alfabetik tabel', 'Menghitung pajak penjualan otomatis', 'A', 'PCA memproyeksikan data berdimensi tinggi ke ruang ortogonal berdimensi lebih rendah untuk efisiensi komputasi dan visualisasi.'] },
    { p: 7, q1: ['Fungsi aktivasi (seperti ReLU atau Sigmoid) pada Artificial Neural Network berperan penting untuk...', 'Memperkenalkan sifat non-linearitas sehingga jaringan dapat mempelajari relasi data kompleks', 'Mematikan aliran listrik prosesor', 'Menghapus bobot synapsis secara acak', 'Membuat ukuran model menjadi 0 KB', 'A', 'Tanpa fungsi aktivasi non-linear, jaringan saraf berapapun dalamnya hanya akan setara dengan operasi regresi linear tunggal.'] },
    { p: 8, q1: ['Gejala "Overfitting" pada model Machine Learning ditandai dengan kondisi...', 'Akurasi sangat tinggi pada data latih (training), namun anjlok signifikan pada data uji (validation/test)', 'Akurasi rendah pada data latih dan juga data uji', 'Model tidak dapat dijalankan sama sekali', 'Waktu training selesai dalam 0 detik', 'A', 'Overfitting terjadi saat model menghafal derau (noise) data latih sehingga gagal melakukan generalisasi pada data baru.'] },
    { p: 9, q1: ['Lapisan Convolutional (Conv2D) pada CNN unggul dalam pengolahan citra karena memiliki sifat...', 'Spatial invariance dan kemampuan menangkap pola lokal (tepi, tekstur, bentuk)', 'Mengabaikan seluruh orientasi piksel gambar', 'Hanya bisa memproses teks berbahasa latin', 'Menghapus seluruh warna piksel menjadi hitam pekat', 'A', 'Operasi konvolusi menggunakan filter geser (kernel) yang mengekstrak fitur spasial lokal di mana pun fitur tersebut muncul dalam gambar.'] },
    { p: 10, q1: ['Arsitektur Long Short-Term Memory (LSTM) dirancang secara khusus untuk mengatasi kelemahan RNN standar berupa...', 'Vanishing Gradient Problem pada urutan sekuensial yang panjang', 'Kekurangan kapasitas hard disk lokal', 'Ketidakmampuan memproses angka desimal', 'Keterbatasan monitor layar resolusi 4K', 'A', 'LSTM memiliki mekanisme gerbang (gates: forget, input, output) dan cell state yang mempertahankan memori jangka panjang tanpa degradasi gradien ekstrim.'] },
    { p: 11, q1: ['Inovasi utama dalam paper "Attention Is All You Need" (Vaswani et al., 2017) adalah...', 'Menghilangkan lapisan rekurensi (RNN) dan menggantikannya sepenuhnya dengan mekanisme Multi-Head Self-Attention', 'Mewajibkan penggunaan harddisk eksternal', 'Menghapus seluruh proses training pada AI', 'Membatasi ukuran teks maksimal 5 kata', 'A', 'Transformer memungkinkan paralelisasi komputasi masif pada GPU tanpa ketergantungan urutan langkah per langkah seperti RNN.'] },
    { p: 12, q1: ['Keunggulan utama Transfer Learning menggunakan model fondasi (pre-trained weights) adalah...', 'Menghemat waktu training dan data latih yang dibutuhkan secara signifikan untuk mencapai akurasi tinggi', 'Membuat aplikasi berjalan tanpa koneksi daya listrik', 'Menjamin model 100% sempurna tanpa evaluasi', 'Menghapus kebutuhan bahasa pemrograman Python', 'A', 'Transfer learning memanfaatkan pengetahuan representasi fitur umum yang telah dipelajari model dari dataset raksasa.'] },
    { p: 13, q1: ['Teknik regularisasi Dropout bekerja dengan cara...', 'Mematikan neuron secara acak dengan probabilitas tertentu selama proses training berlangsung', 'Menghapus baris kode program secara acak saat kompilasi', 'Mematikan monitor komputer setiap 10 menit', 'Mengurangi kapasitas RAM komputer secara fisik', 'A', 'Dropout mencegah ko-adaptasi antar-neuron sehingga setiap neuron belajar fitur yang independen dan tangguh.'] },
    { p: 14, q1: ['Format serialisasi standar industri terbuka untuk mendistribusikan model machine learning lintas framework (PyTorch, TensorFlow) adalah...', 'ONNX (Open Neural Network Exchange)', 'MP3', 'BMP', 'DOCX', 'A', 'ONNX menyediakan representasi grafik komputasi universal yang dapat dieksekusi dengan akselerasi runtime optimal di berbagai platform.'] },
  ],
  // MODUL 3 (AI03-P01 s.d. P14)
  AI03: [
    { p: 1, q1: ['Dalam arsitektur AI modern, apa keuntungan utama menggunakan Model-as-a-Service (MaaS) berbasis Cloud API?', 'Kemudahan skalabilitas instan tanpa perlu mengelola infrastruktur klaster GPU fisik sendiri', 'Bebas biaya internet seumur hidup', 'Menjamin tidak adanya latency transmisi jaringan', 'Kode aplikasi tidak perlu ditulis sama sekali', 'A', 'Cloud API (seperti OpenAI, Google Cloud Vertex AI) memungkinkan developer mengakses model mutakhir berkapasitas besar dengan model pembayaran sesuai penggunaan (pay-per-token).'] },
    { p: 2, q1: ['Metode transmisi apa yang digunakan untuk menampilkan respon LLM secara bertahap (kata per kata) ke antarmuka pengguna?', 'Server-Sent Events (SSE) atau Streaming HTTP Transfer-Encoding', 'FTP Batch Download', 'WebRTC Voice Channel', 'SMTP Mail Relay', 'A', 'Streaming SSE mengirim potongan token (chunks) segera setelah di-inferensikan server, mengurangi time-to-first-token (TTFT) yang dirasakan user.'] },
    { p: 3, q1: ['Teknik apa yang wajib diimplementasikan saat memanggil API LLM untuk menangani respon HTTP 429 (Too Many Requests)?', 'Exponential Backoff dengan Random Jitter', 'Mematikan aplikasi seketika tanpa peringatan', 'Mengirim seratus permintaan ulang per detik', 'Menghapus token autentikasi API', 'A', 'Exponential backoff melipatgandakan interval penantian sebelum mengirim request ulang, meredakan beban pada server API yang sedang padat.'] },
    { p: 4, q1: ['Metrik kesamaan matematika yang paling umum digunakan untuk membandingkan kedekatan makna dua vektor embedding adalah...', 'Cosine Similarity', 'Euclidean Manhattan XOR', 'Hamming Distance', 'Modulo Arithmetics', 'A', 'Cosine similarity mengukur kosinus sudut antara dua vektor berarah, independen dari panjang magnitudo vektor tersebut.'] },
    { p: 5, q1: ['Ekstensi PostgreSQL open-source yang sangat populer untuk menyimpan dan mengindeks vektor embedding secara native adalah...', 'pgvector', 'pg_dump', 'postgis_audio', 'pg_cron_ai', 'A', 'pgvector menambahkan tipe data vector serta indeks HNSW/IVFFlat untuk pencarian kemiripan vektor berkecepatan tinggi langsung di PostgreSQL.'] },
    { p: 6, q1: ['Langkah awal yang tepat dalam pipeline RAG sebelum menyimpan dokumen teks panjang ke vector database adalah...', 'Chunking (pemotongan teks menjadi segmen semantik kohesif)', 'Mengenkripsi teks menjadi file zip biner', 'Menerjemahkan dokumen ke bahasa kuno', 'Menghapus seluruh paragraf genap', 'A', 'Chunking memecah dokumen panjang menjadi potongan berukuran optimal agar sesuai dengan context window model dan menjaga relevansi semantik pencarian.'] },
    { p: 7, q1: ['Teknik "Hybrid Search" dalam sistem RAG menggabungkan dua metode pencarian sekaligus, yaitu...', 'Dense Vector Search (Semantik) dan Sparse BM25 / Keyword Search (Leksikal)', 'Google Search dan Bing Image Search', 'Pencarian suara dan gelombang ultrasonik', 'SQL JOIN dan DNS Lookup', 'A', 'Hybrid Search menyatukan kekuatan pencarian semantik (pemahaman makna) dan pencarian leksikal kata kunci persis untuk akurasi retrieval maksimal.'] },
    { p: 8, q1: ['Alat evaluasi open-source standar industri untuk mengukur kualitas retrieval RAG (Faithfulness, Answer Relevance) adalah...', 'Ragas (Retrieval Augmented Generation Assessment)', 'MS Paint', 'Adobe Reader', 'VLC Media Player', 'A', 'Ragas menyediakan framework metrik kuantitatif terotomasi untuk menguji keandalan sistem RAG.'] },
    { p: 9, q1: ['Kemampuan "Function Calling" atau "Tool Use" pada LLM bekerja dengan mekanisme...', 'Model menghasilkan argumen parameter JSON terstruktur yang kemudian dieksekusi oleh kode aplikasi', 'Model meretas database server secara mandiri tanpa izin', 'Model langsung mengontrol sirkuit listrik motherboard', 'Model membuat file executable virus di komputer klien', 'A', 'LLM tidak mengeksekusi fungsi secara langsung demi keamanan, melainkan memilih alat dan merumuskan payload JSON yang aman untuk dijalankan oleh backend developer.'] },
    { p: 10, q1: ['Komponen "Memory" pada Autonomous AI Agent berfungsi untuk...', 'Menyimpan riwayat interaksi, refleksi pengalaman, dan konteks state jangka pendek maupun panjang', 'Mengatur pendingin kipas prosesor', 'Menghapus database setiap 24 jam', 'Membuat agen melupakan seluruh instruksi awal', 'A', 'Memory memungkinkan agen mempertahankan kontinuitas berpikir dan belajar dari hasil eksekusi tindakan sebelumnya.'] },
    { p: 11, q1: ['Framework perancangan arsitektur Multi-Agent berbasis State Graph dengan siklus dan koordinasi fleksibel adalah...', 'LangGraph', 'jQuery UI', 'AngularJS 1.0', 'Wordpress Agent', 'A', 'LangGraph memodelkan alur kerja multi-agent sebagai graph berarah (DAG atau berputar/cyclical) dengan manajemen state terpusat.'] },
    { p: 12, q1: ['Metode efisien untuk melatih parameter adaptasi berukuran kecil (LoRA) tanpa mengubah seluruh bobot dasar model disebut...', 'Parameter-Efficient Fine-Tuning (PEFT)', 'Full Re-training from Scratch', 'Brute Force Tuning', 'Random Weight Scrambling', 'A', 'PEFT/LoRA hanya menyuntikkan dan melatih matriks rank rendah (low-rank matrices), memangkas kebutuhan VRAM GPU hingga lebih dari 70%.'] },
    { p: 13, q1: ['Manfaat menerapkan Semantic Caching pada aplikasi AI produksi adalah...', 'Mengembalikan respon tersimpan untuk pertanyaan dengan makna semantik yang mirip, memangkas biaya API dan latency', 'Memperbesar ukuran model hingga berkali-kali lipat', 'Mewajibkan pengguna membayar biaya berlangganan ganda', 'Menyembunyikan kode aplikasi dari web browser', 'A', 'Semantic cache memanfaatkan vector similarity untuk mendeteksi kesamaan maksud query pengguna sehingga tidak perlu query ulang ke model berbayar.'] },
    { p: 14, q1: ['Tiga pilar observabilitas utama yang harus dipantau pada sistem LLM Application in Production adalah...', 'Latency, Token Cost/Consumption, dan Output Quality / Hallucination Rate', 'Pixel monitor, mouse dpi, dan volume speaker', 'Warna keyboard, suhu ruangan, dan tipe casing', 'Jumlah komentar di media sosial', 'A', 'Monitoring latency (TTFT), biaya penggunaan token API, dan metrik kualitas respon menjamin SLA sistem di tingkat produksi tetap prima dan terukur.'] },
  ],
};

async function seedSoal() {
  console.log('🚀 Memulai Seeding Soal Kuis (Quizizz Style)...\n');

  // Bersihkan soal lama di tabel soal_paket dan soal_butir yang terkait modul kurikulum baru
  console.log('🧹 Membersihkan paket kuis kurikulum sebelumnya...');
  const { data: oldPaket } = await supabase
    .from('soal_paket')
    .select('kode_paket')
    .or('kode_paket.like.KUIS-AI0%,kode_paket.like.KUIS-MOD-AI%');

  if (oldPaket && oldPaket.length > 0) {
    const kodes = oldPaket.map((p) => p.kode_paket);
    await supabase.from('soal_butir').delete().in('kode_paket', kodes);
    await supabase.from('soal_paket').delete().in('kode_paket', kodes);
    console.log(`✓ Terhapus ${kodes.length} paket soal kurikulum lama.`);
  }

  // 1. Masukkan Paket Soal Modul Induk (MOD-AI-01, MOD-AI-02, MOD-AI-03)
  console.log('\n📝 Memasukkan 3 Paket Soal Modul Induk...');
  for (const item of DATA_SOAL) {
    const { error: pErr } = await supabase.from('soal_paket').upsert({
      kode_paket: item.kode_paket,
      program: item.program,
      sesi_target: item.sesi_target,
      tipe: item.tipe,
      durasi_menit: item.durasi_menit,
    }, { onConflict: 'kode_paket' });

    if (pErr) {
      console.error(`❌ Gagal paket ${item.kode_paket}:`, pErr.message);
      continue;
    }

    const butirRows = item.soal.map((s) => ({
      kode_paket: item.kode_paket,
      no_soal: s.no_soal,
      pertanyaan: s.pertanyaan,
      pilihan_a: s.pilihan_a,
      pilihan_b: s.pilihan_b,
      pilihan_c: s.pilihan_c,
      pilihan_d: s.pilihan_d,
      kunci: s.kunci,
      pembahasan: s.pembahasan,
      bobot_skor: s.bobot_skor,
      perlu_tinjau: false,
    }));

    const { error: bErr } = await supabase.from('soal_butir').upsert(butirRows, { onConflict: 'kode_paket,no_soal' });
    if (bErr) console.error(`❌ Gagal butir ${item.kode_paket}:`, bErr.message);
    else console.log(`✓ [${item.kode_paket}] Berhasil dimasukkan (${item.soal.length} soal)`);
  }

  // 2. Masukkan Paket Soal Tiap Pertemuan (42 Pertemuan x 2 Soal)
  console.log('\n📝 Memasukkan 42 Paket Soal Pertemuan (AI01-P01 s.d AI03-P14)...');
  let countPertemuan = 0;

  for (const [prefix, list] of Object.entries(PERTEMUAN_SOAL_DATA)) {
    const programId = prefix === 'AI01' ? 'MOD-AI-01' : prefix === 'AI02' ? 'MOD-AI-02' : 'MOD-AI-03';

    for (const item of list) {
      const sesiKode = `${prefix}-P${String(item.p).padStart(2, '0')}`;
      const kodePaket = `KUIS-${sesiKode}`;

      // Buat paket kuis
      const { error: pErr } = await supabase.from('soal_paket').upsert({
        kode_paket: kodePaket,
        program: programId,
        sesi_target: sesiKode,
        tipe: 'kuis',
        durasi_menit: 5,
      }, { onConflict: 'kode_paket' });

      if (pErr) {
        console.error(`❌ Gagal buat paket ${kodePaket}:`, pErr.message);
        continue;
      }

      // Buat 2 butir soal: Soal 1 dari bank soal, Soal 2 turunan spesifik pertemuan
      const q1 = item.q1;
      const butirRows = [
        {
          kode_paket: kodePaket,
          no_soal: 1,
          pertanyaan: q1[0],
          pilihan_a: q1[1],
          pilihan_b: q1[2],
          pilihan_c: q1[3],
          pilihan_d: q1[4],
          kunci: q1[5],
          pembahasan: q1[6],
          bobot_skor: 50,
          perlu_tinjau: false,
        },
        {
          kode_paket: kodePaket,
          no_soal: 2,
          pertanyaan: `Dalam praktik nyata topik sesi ${item.p} (${sesiKode}), mengapa evaluasi berkala terhadap luaran sistem wajib diterapkan?`,
          pilihan_a: 'Untuk menjaga akurasi, mendeteksi penyimpangan (drift/halusinasi), dan menjamin keandalan sistem',
          pilihan_b: 'Agar kapasitas memori GPU tidak berkurang',
          pilihan_c: 'Hanya sebagai formalitas tanpa pengaruh teknis apa pun',
          pilihan_d: 'Untuk mengganti sistem AI dengan pengetikan manual',
          kunci: 'A',
          pembahasan: 'Evaluasi berkala menjamin kinerja model tetap berada dalam toleransi keselamatan, mendeteksi degradasi performa, dan mencegah halusinasi data.',
          bobot_skor: 50,
          perlu_tinjau: false,
        },
      ];

      const { error: bErr } = await supabase.from('soal_butir').upsert(butirRows, { onConflict: 'kode_paket,no_soal' });
      if (bErr) {
        console.error(`❌ Gagal isi butir ${kodePaket}:`, bErr.message);
      } else {
        countPertemuan++;
      }
    }
  }

  console.log(`\n🎉 SELESAI! Berhasil mengunggah ${countPertemuan} paket kuis pertemuan + 3 paket kuis modul induk.`);
  console.log('Setiap paket kuis memiliki tepat 2 butir soal pilihan ganda berkualitas tinggi.');
}

seedSoal().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

