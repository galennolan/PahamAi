/**
 * Seed modul GAFB (Generative AI for Beginners) → Supabase.
 * - Tambah jalur 'G' ke check constraint modul/batch/peserta/pendaftar.
 * - Insert 10 modul G01–G10 (8 lesson + Presentasi Skills + Post-Test).
 * - Buat 1 batch "GAFB-01".
 *
 * Konten (README asli Inggris) diterjemahkan ke Indonesia,
 * tautan notebook .ipynb diarahkan ke GitHub repo asli.
 *
 * Paksa jalankan:  node seed-gafb.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY; // pakai service role

if (!url || !key) {
  console.error('VITE_SUPABASE_URL / key belum ada di .env');
  process.exit(1);
}

const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });

const GITHUB_REPO = 'https://github.com/Ramachetan/generative-ai-for-beginners';
const BASE_RAW = 'https://raw.githubusercontent.com/Ramachetan/generative-ai-for-beginners/main';

// 10 modul GAFB. content_md sudah diterjemahkan ke Indonesia.
// Setiap modul melampirkan tautan ke folder/lesson GitHub asli untuk notebook.
const MODULS = [
  {
    kode: 'G01',
    judul: 'Pengenalan Generative AI dan Large Language Models',
    jalur: 'G',
    urutan_sesi: 1,
    durasi_menit: 90,
    kategori: 'FND',
    slide_url: `${GITHUB_REPO}/tree/main/01-introduction-to-genai`,
    content_md: `# Pengenalan Generative AI dan Large Language Models

Generative AI adalah sejenis kecerdasan buatan yang dapat menciptakan konten baru, seperti teks, gambar, dan lain-lain. Ia seperti memiliki alat yang dapat menulis esai, membuat gambar, atau bahkan menciptakan musik berdasarkan instruksi sederhana. Teknologi ini ampuh karena membuat alat AI canggih dapat diakses oleh semua orang; Anda tidak perlu menjadi programmer untuk memaksimalkannya.

Di panduan ini, kita akan menjelajahi bagaimana Generative AI mengubah cara kita berpikir dan berinteraksi dengan teknologi.

## Apa Itu Generative AI?

Generative AI merujuk pada sistem AI yang dapat menghasilkan konten baru. Ini adalah pergeseran dari AI tradisional yang hanya bisa menganalisis data dan memberikan output berdasarkan pemrograman tertentu. Sekarang, AI bisa mengambil sebuah prompt dan menghasilkan respons kreatif.

## Bagaimana Generative AI Berkembang?

Perjalanan ke kemampuan AI saat ini dimulai puluhan tahun lalu:

- **AI dan Chatbot Awal:** Awalnya, AI sederhana dan hanya bisa merespons berdasarkan jawaban yang sudah diprakaman.
- **Machine Learning:** Pada 1990-an, AI berevolusi untuk belajar dari data, mengidentifikasi pola, dan membuat keputusan.
- **Neural Networks:** Dengan perangkat keras yang lebih baik, penelitian AI berkembang, menghasilkan model yang lebih canggih untuk memproses dan memahami bahasa.

Kita kini berada pada titik di mana AI memiliki kemampuan kognitif seperti manusia, seperti berbicara, sebagaimana yang ditunjukkan oleh misalnya [OpenAI ChatGPT](https://chatgpt.com/), [Google Gemini](https://gemini.google.com/app), [Copilot Chat](https://www.bing.com/chat) dan [Hugging Chat](https://huggingface.co/chat/)

### Kemunculan Large Language Models (LLM)

Baru-baru ini, sejenis model Transformer telah melakukan perbaikan signifikan dalam cara mesin memahami dan menghasilkan bahasa. Model-model ini, yang dikenal sebagai Large Language Models (LLM), dilatih pada sejumlah besar teks dan dapat melakukan berbagai tugas bahasa.

## Cara Kerja Large Language Models?

Mari sederhanakan cara model-model canggih ini memproses bahasa:

- **Tokenisasi:** LLM mengubah teks menjadi nilai numerik yang disebut token karena mesin lebih memahami angka daripada teks.
  ![Contoh tokenisasi](${BASE_RAW}/01-introduction-to-genai/images/tokenizer-example.png)
- **Menghasilkan Respons:** Model memprediksi bagian berikutnya teks berdasarkan input yang diterima, yang memungkinkan menghasilkan paragraf lengkap.
- **Memilih Kata yang Tepat:** Model menghitung kata (atau token) yang paling mungkin muncul berikutnya, dengan sedikit keacakauan agar respons terasa alami dan tidak berulang.

## Penggunaan Praktis Large Language Models

Berikut beberapa cara model-model ini bisa berguna:

- **Bantuan Menulis:** Mereka bisa membantu menulis esai, email, atau bahkan kode dengan memberikan saran cara melengkapi kalimat Anda.
  ![Contoh penyelesaian teks](${BASE_RAW}/01-introduction-to-genai/images/text-completion-example.png)
- **Menjawab Pertanyaan:** Anda bisa bertanya pada model-model ini tentang hampir apa saja, dan mereka akan menjawab berdasarkan data latih mereka.
  ![Contoh konversasi](${BASE_RAW}/01-introduction-to-genai/images/conversation-example.png)
- **Penciptaan Konten:** Sangat bagus untuk menghasilkan konten kreatif, seperti cerita atau salinan pemasaran.
  ![Contoh penulisan kreatif](${BASE_RAW}/01-introduction-to-genai/images/creative-writing-example.png)

## Keterbatasan Large Language Models

Meskipun LLM sangat kuat, mereka tidak sempurna:

1. **Mereka tidak cerdas:** Mereka tidak memahami dunia atau memiliki emosi; mereka memproses informasi berdasarkan pola data.
2. **Respons bisa tidak dapat diprediksi:** Karena mereka menambahkan keacakauan, Anda mungkin mendapatkan jawaban berbeda setiap kali menanyakan hal yang sama.

## Kesimpulan

Generative AI mengubah cara kita berinteraksi dengan teknologi, membuatnya lebih dapat diakses dan mampu. Seiring alat-alat ini berevolusi, mereka akan terus membuka kemungkinan baru untuk kreativitas dan efisiensi.

## Cek Pengetahuan

1. **Benar atau Salah:** Anda selalu mendapatkan respons yang sama dari sebuah model bahasa besar.
   - **Jawaban:** Salah. Responsnya bisa bervariasi karena keacakauan dalam desain model.

2. **Apa itu 'prompt' dalam konteks Generative AI?**
   - **Jawaban:** Prompt adalah masukan yang Anda berikan ke sebuah model AI untuk menghasilkan respons. Seperti bertanya atau memberi perintah.

3. **Apa itu tokenisasi, dan mengapa penting dalam Large Language Models?**
   - **Jawaban:** Tokenisasi adalah proses mengubah teks menjadi nilai numerik. Penting karena mesin lebih memahami angka daripada teks.

4. **Apa penggunaan praktis dari Large Language Models?**
   - **Jawaban:** LLM bisa membantu menulis, menjawab pertanyaan, dan menciptakan konten.

5. **Apa keterbatasan Large Language Models?**
   - **Jawaban:** Mereka tidak cerdas dan bisa memberikan respons yang tidak dapat diprediksi.

Notebook praktik: [05-text-generation-basics (Colab)](${BASE_RAW}/05-text-generation-basics/02-getting-started.ipynb)
`},
  {
    kode: 'G02',
    judul: 'Menggali dan Membandingkan Large Language Models',
    jalur: 'G',
    urutan_sesi: 2,
    durasi_menit: 90,
    kategori: 'FND',
    slide_url: `${GITHUB_REPO}/tree/main/02-comparing-different-large-language-models`,
    content_md: `# Menggali dan Membandingkan Large Language Models

Dengan pelajaran sebelumnya, kita telah melihat bagaimana Generative AI mengubah lanskap teknologi, cara kerja Large Language Models (LLM). Di bab ini, kita akan membandingkan dan mengkontraskan berbagai jenis model bahasa besar (LLM) untuk memahami kelebihan dan kekurangannya.

Langkah berikutnya adalah menjelajahi lanskap LLM saat ini dan memahami model mana yang paling cocok untuk use case berbeda.

## Pendahuluan

Pelajaran ini mencakup:

- Memahami berbagai jenis LLM.
- Foundation Models versus LLM.
- Open Source versus Proprietary Models.
- Embedding versus Image generation versus Text and Code generation.
- Encoder-Decoder versus Decoder-only.

## Memahami Berbagai Jenis LLM

LLM bisa dikategorikan berdasarkan arsitekturnya, data latih, dan use case. Memahami perbedaan ini akan membantu Anda memilih model yang tepat untuk skenario tersebut, dan memahami cara menguji, mengiterasi, dan meningkatkan performa.

Ada banyak jenis model LLM; pilihan model Anda bergantung pada apa yang ingin Anda gunakan. Bergantung pada apakah Anda ingin menggunakan model untuk teks, audio, video, generasi gambar, dll., Anda mungkin memilih jenis model yang berbeda.

- **Generasi teks.** Sebagian besar model dilatih untuk menghasilkan teks dan Anda memiliki banyak pilihan dari GPT-3.5, GPT-4, Gemini, Claude, dll. Mereka datang dengan biaya berbeda, dengan GPT-4 yang paling mahal. Periksa [Azure OpenAI playground](https://oai.azure.com/portal/playground) atau [Google AI Studio](https://aistudio.google.com/app/home) untuk mengevaluasi model mana yang paling cocok untuk kebutuhan Anda.

- **Generasi gambar.** Untuk menghasilkan gambar, DALL-E (Azure), Imagen (Google), dan Midjourney adalah tiga pilihan yang terkenal. DALL-E disediakan oleh Azure OpenAI. [Baca lebih lanjut tentang DALL-E di sini](https://platform.openai.com/docs/models/dall-e), Imagen disediakan oleh Google. [Baca lebih lanjut tentang Imagen di sini](https://deepmind.google/technologies/imagen-2/), dan Midjourney adalah alat pihak ketiga. [Baca lebih lanjut tentang Midjourney di sini](https://midjourney.com/).

- **Multi-modalitas.** Jika Anda ingin menangani beberapa jenis data dalam input dan output, pertimbangkan model seperti [gpt-4 turbo with vision](https://learn.microsoft.com/azure/ai-services/openai/concepts/models#gpt-4-and-gpt-4-turbo-models) [Gemini](https://aistudio.google.com/app/home). Model-model ini mampu menggabungkan pemrosesan bahasa alami dengan pemahaman visual, memungkinkan interaksi melalui antarmuka multi-modal.

Memilih model memberi Anda beberapa kemampuan dasar yang mungkin belum cukup. Seringkali Anda memiliki data khusus perusahaan yang perlu Anda sampaikan ke LLM. Ada beberapa cara untuk mendekati hal ini, lebih lanjut di bagian berikutnya.

## Foundation Models versus LLM

Istilah Foundation Model diciptakan oleh peneliti Stanford dan didefinisikan sebagai model AI yang memenuhi kriteria:

- **Mereka dilatih menggunakan pembelajaran tidak terawasi atau pembelajaran mandiri**, artinya dilatih pada data multi-modal yang tidak berlabel, dan tidak memerlukan anotasi manusia.
- **Mereka adalah model yang sangat besar**, berdasarkan jaringan saraf dalam yang sangat dalam dilatih pada miliaran parameter.
- **Mereka biasanya dimaksudkan sebagai fondasi untuk model lain**, artinya dapat digunakan sebagai titik awal untuk membuat model baru di atasnya, yang dapat dilakukan dengan fine-tuning.

Sebagai contoh, untuk membangun versi pertama ChatGPT, model bernama GPT-3.5 berperan sebagai foundation model. Ini berarti OpenAI menggunakan data khusus chatbot untuk membuat versi GPT-3.5 yang dispecialisasikan untuk skenario konversasional.

![Foundation Model](${BASE_RAW}/02-comparing-different-large-language-models/images/Multimodal.png)

Sumber: [2108.07258.pdf (arxiv.org)](https://arxiv.org/pdf/2108.07258.pdf)

## Open Source versus Proprietary Models

Cara lain mengkategorikan LLM adalah apakah mereka open source atau proprietary.

Model open source adalah model yang tersedia untuk publik dan bisa digunakan oleh siapa saja. Seringkali disediakan oleh perusahaan pembuatnya, atau oleh komunitas riset. Model-model ini boleh diperiksa, dimodifikasi, dan disesuaikan untuk berbagai use case. Namun, tidak selalu dioptimalkan untuk penggunaan produksi, dan mungkin kurang optimal dibanding model proprietary. Pendanaan untuk model open source bisa terbatas, dan tidak selalu dikelola jangka panjang atau diperbarui dengan riset terbaru. Contoh model open source populer: [Gemma](https://ai.google.dev/gemma), [Alpaca](https://crfm.stanford.edu/2023/03/13/alpaca.html), [Bloom](https://sapling.ai/llm/bloom) dan [LLaMA](https://sapling.ai/llm/llama).

Model proprietary adalah model yang dimiliki perusahaan dan tidak tersedia untuk publik. Model-model ini seringkali dioptimalkan untuk penggunaan produksi. Namun, tidak boleh diperiksa, dimodifikasi, atau disesuaikan untuk use case berbeda. Selain itu, tidak selalu gratis, dan mungkin memerlukan langganan atau pembayaran untuk digunakan. Pengguna juga tidak memiliki kontrol atas data yang digunakan untuk melatih model, yang berarti mereka harus mempercayakan kepemilik model untuk menjaga privasi data dan penggunaan AI secara bertanggung jawab. Contoh model proprietary populer: [OpenAI models](https://platform.openai.com/docs/models/overview), [Google Bard](https://sapling.ai/llm/bard) atau [Claude 2](https://www.anthropic.com/index/claude-2).

## Embedding versus Image generation versus Text and Code generation

LLM juga bisa dikategorikan berdasarkan output yang dihasilkan.

Embedding adalah sekumpulan model yang bisa mengubah teks menjadi bentuk numerik, disebut embedding, yang merupakan representasi numerik dari teks masukan. Embedding memudahkan mesin memahami hubungan antar kata atau kalimat dan bisa dikonsumsi sebagai masukan oleh model lain, seperti model klasifikasi, atau model pengelompokan yang memiliki performa yang lebih baik pada data numerik. Model embedding sering digunakan untuk transfer learning, di mana model dibangun untuk tugas simbol yang ada banyak datanya, lalu bobot model (embedding) digunakan kembali untuk tugas lanjutan lainnya. Contoh kategori ini [OpenAI embeddings](https://platform.openai.com/docs/models/embeddings), [Google Embeddings](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings).

![Embedding](${BASE_RAW}/02-comparing-different-large-language-models/images/Embedding.png)

Model generasi gambar adalah model yang menghasilkan gambar. Model-model ini sering digunakan untuk pengeditan gambar, sintesis gambar, dan translasi gambar. Model generasi gambar biasanya dilatih pada kumpulan data gambar besar, seperti [LAION-5B](https://laion.ai/blog/laion-5b/), dan bisa digunakan untuk menghasilkan gambar baru atau mengedit gambar yang sudah ada dengan teknik inpainting, super-resolusi, dan kolorisasi. Contoh: [DALL-E-3](https://openai.com/dall-e-3) dan [Stable Diffusion models](https://github.com/Stability-AI/StableDiffusion).

![Image generation](${BASE_RAW}/02-comparing-different-large-language-models/images/Image.png)

Model generasi teks dan kode adalah model yang menghasilkan teks atau kode. Model-model ini sering digunakan untuk merangkum teks, menerjemahkan, dan menjawab pertanyaan. Model generasi teks biasanya dilatih pada kumpulan data teks besar, seperti [BookCorpus](https://www.cv-foundation.org/openaccess/content_iccv_2015/html/Zhu_Aligning_Books_and_ICCV_2015_paper.html), dan bisa digunakan untuk menghasilkan teks baru, atau menjawab pertanyaan. Model generasi kode, seperti [CodeParrot](https://huggingface.co/codeparrot), biasanya dilatih pada kumpulan data kode besar, seperti GitHub, dan bisa digunakan untuk menghasilkan kode baru, atau memperbaiki bug pada kode yang ada.

![Text and code generation](${BASE_RAW}/02-comparing-different-large-language-models/images/Text.png)

## Encoder-Decoder versus Decoder-only versus Encoder-only

Pakai analogi memasak untuk menjelaskan berbagai jenis arsitektur Language Learning Models (LLM).

Bayangkan model Decoder-only seperti seorang chef yang spesialis membuat makanan baru. Mereka punya gudang bahan baku (data masukan) dan bisa membuat makanan baru (output) berdasarkan apa yang ada. Namun, mereka tidak memiliki pemahaman yang jelas tentang bahan-bahan individu atau hubungan antar mereka. Mereka hanya tahu cara menggabungkannya untuk membuat sesuatu yang enak. Contoh model Decoder-only adalah keluarga GPT, seperti GPT-3.

Model Encoder-only, di sisi lain, seperti kritikus makanan. Mereka bisa mencicipi makanan (input) dan memahami komponen serta hubungannya, tapi tidak bisa membuat makanan baru. Mereka baik memahami konteks dan hubungan, tapi tidak untuk menghasilkan konten. Contoh model Encoder-only adalah BERT.

Akhirnya, model Encoder-Decoder seperti chef yang juga kritikus makanan. Mereka bisa membuat makanan baru dan memahami komponen dari yang sudah ada. Mereka baik untuk menghasilkan konten dan memahami konteks. Contoh model Encoder-Decoder meliputi BART dan T5.

## Model Fine-tuned

Fine-tuning adalah proses yang memanfaatkan transfer learning untuk menyesuaikan model dengan tugas downstream atau memecahkan masalah khusus. Perlu kumpulan contoh pelatihan yang terdiri dari satu masukan (prompt) dan keluaran yang terkait (completion). Intinya, fine-tuning adalah cara untuk membuat model lebih akurat dan responsif terhadap kebutuhan Anda. Seperti mengajari model untuk memahami use case Anda dan menghasilkan completion yang Anda perlukan. Misalnya, jika Anda sedang membuat chatbot untuk lembaga keuangan, Anda bisa melatih model pada dataset percakapan keuangan untuk membuatnya lebih akurat dan responsif.

## Meningkatkan Hasil LLM

Kita sudah menjelajahi berbagai jenis LLM yang tersedia dan cara penggunaannya. Tapi kapan sebaiknya kita pertimbangkan fine-tuning model dibanding menggunakan model pre-trained? Apakah ada pendekatan lain untuk meningkatkan performa model pada beban kerja tertentu?

Ada beberapa pendekatan yang bisa digunakan untuk mendapatkan hasil yang Anda perlukan dari LLM; Anda bisa memilih berbagai jenis model dengan tingkat pelatihan yang berbeda.

Mendorong LLM di produksi, dengan kompleksitas, biaya, dan kualitas yang berbeda. Berikut beberapa pendekatan:

- **Prompt engineering dengan konteks.** Ideanya adalah menyediakan cukup konteks saat Anda memberi prompt untuk memastikan Anda mendapatkan respons yang dibutuhkan.
- **Retrieval Augmented Generation (RAG).** Data Anda mungkin ada di database atau endpoint web; untuk memastikan data ini (atau sebagiannya), termasuk saat memberi prompt, Anda bisa mengambil data yang relevan dan memasukkannya ke prompt pengguna.
- **Model fine-tuned.** Di sini, Anda melatih model lebih lanjut pada data Anda sendiri, yang membuat model lebih akurat dan responsif, tapi bisa mahal.

### Prompt Engineering dengan Konteks

LLM pre-trained bekerja sangat baik pada tugas bahasa alami umum, bahkan hanya dengan memanggilnya dengan prompt singkat, seperti kalimat untuk melengkapi atau pertanyaan — yang disebut pembelajaran _zero-shot_.

Namun, semakin banyak pengguna bisa memformulasikan kuerinya, dengan permintaan rinci dan contoh — Konteks — semakin akurat dan sesuai harapan jawabannya. Dalam hal ini, kita bicara tentang pembelajaran _one-shot_ jika prompt hanya mencakup satu contoh, dan _few-shot_ jika mencakup banyak contoh. Prompt engineering dengan konteks adalah pendekatan paling hemat biaya untuk memulai.

### Retrieval-Augmented Generation (RAG)

LLM memiliki keterbatasan bahwa hanya bisa menggunakan data yang telah digunakan dalam pelatihannya untuk menjawab. Ini berarti mereka tidak tahu fakta yang terjadi setelah proses pelatihan, dan tidak bisa mengakses informasi non-publik (seperti data perusahaan).

Ini bisa diatasi lewat RAG, teknik yang menambahkan data eksternal ke prompt dalam bentuk potongan dokumen, dengan mempertimbangkan batas panjang prompt. Metode ini melibatkan dua langkah: pertama, model mengambil dokumen relevan dari database atau endpoint web, lalu menghasilkan completion berdasarkan dokumen yang diambil. Di sini kita menggunakan model embedding untuk mengambil dokumen relevan dan LLM untuk menghasilkan completion.

### Model Fine-tuned

Fine-tuning memanfaatkan transfer learning untuk menyesuaikan model dengan tugas downstream. Berbeda dengan pembelajaran few-shot dan RAG, ini menghasilkan model baru dengan bobot dan bias yang diperbarui. Perlu kumpulan contoh pelatihan yang terdiri dari satu masukan dan keluaran yang terkait. Pendekatan ini lebih disukai jika:

- **Menggunakan model fine-tuned.** Bisnis ingin menggunakan model fine-tuned yang kurang mampu (seperti model embedding) daripada model berkinerasi tinggi, menghasilkan solusi yang lebih hemat biaya dan cepat.
- **Mempertimbangkan latency.** Latency penting untuk use case tertentu, jadi tidak mungkin menggunakan prompt yang sangat panjang atau jumlah contoh yang harus dipelajari tidak sesuai dengan batas panjang prompt.
- **Tetap up to date.** Bisnis memiliki banyak data berkualitas tinggi dan label ground truth, serta sumber daya untuk mempertahankan data ini diperbarui seiring waktu.

### Model Terlatih

Membuat LLM dari awal adalah tanpa keraguan pendekatan yang paling sulit dan kompleks, membutuhkan data masif, sumber daya terampil, dan kekuatan komputasi yang sesuai. Opsi ini sebaiknya hanya dipertimbangkan pada skenario di mana bisnis memiliki use case khusus domain dan banyak data domain.

## Cek Pengetahuan

Apa pendekatan yang baik untuk meningkatkan hasil completion LLM?

1. Prompt engineering dengan konteks
2. RAG
3. Model fine-tuned

Jawaban: 3, jika Anda punya waktu, sumber daya, dan data berkualitas tinggi, fine-tuning adalah pilihan yang lebih baik untuk tetap up to date. Namun, jika Anda ingin meningkatkan hal-hal dan kekurangan waktu, pertimbangkan RAG dulu.

Berapa jenis LLM yang berbeda?

1. Embedding
2. Image generation
3. Text and code generation
4. Semua di atas

Jawaban: 4, semua di atas.

Apa perbedaan antara foundation model dan LLM?

1. Foundation models dilatih dengan pembelajaran tidak terawasi, sementara LLM dilatih dengan pembelajaran terawasi.
2. Foundation models adalah model yang sangat besar, sementara LLM lebih kecil.
3. Foundation models dimaksudkan sebagai fondasi untuk model lain, sementara LLM tidak.

Jawaban: 3, foundation models dimaksudkan sebagai fondasi untuk model lain.

Apa perbedaan antara model open source dan proprietary?

1. Model open source tersedia untuk publik, sementara proprietary tidak.
2. Model open source sering dioptimalkan untuk produksi, sementara proprietary tidak.
3. Model open source tidak selalu gratis, sementara proprietary selalu gratis.

Jawaban: 1, model open source tersedia untuk publik.

## Tantangan

Baca lebih lanjut di blog saya [Memahami RAG](https://blog.miraclesoft.com/the-power-of-retrieval-augmented-generation-in-enhancing-generative-ai-capabilities/) untuk use case Anda.
`},
  {
    kode: 'G03',
    judul: 'Dasar Prompt Engineering',
    jalur: 'G',
    urutan_sesi: 3,
    durasi_menit: 90,
    kategori: 'PRMP',
    slide_url: `${GITHUB_REPO}/tree/main/03-prompt-engineering-basics`,
    content_md: `# Dasar Prompt Engineering

## Pendahuluan

Cara Anda menulis prompt ke sebuah Large Language Model (LLM) sangat penting. Prompt yang dirancang dengan baik dapat menghasilkan respons yang jauh lebih berkualitas. Tapi apa sebenarnya yang dimaksud dengan istilah _prompt_ dan _prompt engineering_? Dan bagaimana Anda memperbaiki _input_ prompt yang Anda kirim ke LLM? Inilah pertanyaan yang akan kita jawab di bab ini.

Generative AI menciptakan konten baru (mis. teks, gambar, audio, kode) sebagai respons terhadap permintaan pengguna. Ini dicapai menggunakan Large Language Models seperti GPT ("Generative Pre-trained Transformer") dari OpenAI, yang dilatih menggunakan bahasa dan kode alami.

Pengguna kini bisa berinteraksi dengan model-model ini menggunakan paradigma familiar seperti chat, tanpa perlu keahlian teknis. Model ini _berbasis prompt_ — pengguna mengirim teks (prompt) dan mendapatkan respons AI (completion). Mereka bisa "mengobchat dengan AI" secara iteratif, memperbaiki prompt sampai responsnya sesuai harapan.

"Prompt" adalah _antarmuka pemrograman utama_ untuk aplikasi Generative AI, memberi tahu model apa yang harus dilakukan dan memengaruhi kualitas respons yang dikembalikan. "Prompt Engineering" adalah bidang yang berkembang pesat yang fokus pada _desain dan optimasi_ prompt untuk menghasilkan respons yang konsisten dan berkualitas secara skala.

## Apa Itu Prompt Engineering?

**Prompt Engineering** adalah proses _merancang dan mengoptimalkan_ input teks (prompt) untuk menghasilkan respons yang konsisten dan berkualitas untuk tujuan aplikasi tertentu. Kita bisa membayangkannya sebagai proses 2 langkah:

- _Merancang_ prompt awal untuk sebuah model dan tujuan
- _Memperbaiki_ prompt secara iteratif untuk meningkatkan kualitas respons

Ini adalah proses coba-coba yang membutuhkan intuisi dan usaha pengguna untuk mendapatkan hasil optimal. Lalu kenapa penting? Untuk menjawabnya, kita perlu memahami tiga konsep:

- _Tokenisasi_ = cara model "melihat" prompt
- _Base LLM_ = cara model "memproses" prompt
- _Instruction-Tuned LLM_ = cara model bisa "melihat tugas"

### Tokenisasi

LLM melihat prompt sebagai _urutan token_ di mana model (atau versi model) bisa mitokenisasi prompt dengan cara berbeda. Karena LLM dilatih pada token (bukan teks mentah), cara prompt ditokenisasi mempengaruhi langsung kualitas respons yang dihasilkan.

Untuk memahami cara kerja tokenisasi, coba alat seperti [OpenAI Tokenizer](https://platform.openai.com/tokenizer). Salin prompt Anda — lihat bagaimana ia dikonversi menjadi token, perhatikan cara karakter spasi dan tanda baca ditangani. Perhatikan contoh ini menggunakan model yang lebih lama (GPT-3).

![Tokenisasi](${BASE_RAW}/03-prompt-engineering-basics/images/04-tokenizer-example.png)

### Konsep: Foundation Models

Setelah prompt ditokenisasi, fungsi utama dari ["Base LLM"](https://blog.gopenai.com/an-introduction-to-base-and-instruction-tuned-large-language-models-8de102c785a6) (atau Foundation model) adalah memprediksi token berikutnya dalam urutan itu. Karena LLM dilatih pada dataset teks masif, mereka memiliki pemahaman yang baik tentang hubungan statistik antar token dan bisa memprediksi dengan cukup yakin. Perhatikan mereka tidak memahami _makna_ kata dalam prompt atau token; mereka hanya melihat pola yang bisa " dilengkapi" dengan prediksi berikutnya. Mereka bisa terus memprediksi sampai dihentikan oleh pengguna atau kondisi yang telah ditetapkan.

Ingin melihat cara kerja completion berbasis prompt? Masukkan prompt di atas ke Azure OpenAI Studio [_Chat Playground_](https://oai.azure.com/playground) atau [Google AI Studio](https://aistudio.google.com/app/home) dengan pengaturan default. Sistem dikonfigurasi untuk memperlakukan prompt sebagai permintaan informasi — Anda harus melihat completion yang memenuhi konteks ini.

Tapi bagaimana jika pengguna ingin melihat sesuatu yang spesifik yang memenuhi kriteria atau tujuan tugas tertentu? Inilah di mana _instruction-tuned_ LLM berperan.

![Base LLM Chat Completion](${BASE_RAW}/03-prompt-engineering-basics/images/04-playground-chat-base.png)

### Konsep: Instruction-Tuned LLM

[Instruction-Tuned LLM](https://blog.gopenai.com/an-introduction-to-base-and-instruction-tuned-large-language-models-8de102c785a6) dimulai dari foundation model dan disesuaikan dengan contoh atau pasangan masukan/keluaran (mis. pesan multi-lintas) yang bisa berisi instruksi yang jelas. Ini menggunakan teknik seperti Reinforcement Learning with Human Feedback (RLHF) yang melatih model untuk _mengikuti instruksi_ dan _belajar dari umpan balik_ sehingga menghasilkan respons yang lebih cocok untuk aplikasi praktis dan lebih relevan dengan tujuan pengguna.

Coba ini — tinjau kembali prompt di atas, tapi sekarang ubah _pesan sistem_ untuk memberikan instruksi berikut sebagai konteks:

> _Rangkum konten yang disediakan untuk siswa kelas 2. Jaga hasilnya hingga 1 paragraf dengan 3-5 poin bullet._

Lihat bagaimana hasilnya kini disesuaikan dengan tujuan dan format yang diinginkan? Seorang educator kini bisa langsung menggunakan respons ini di slide-nya untuk kelas tersebut.

![Instruction-Tuned LLM Chat Completion](${BASE_RAW}/03-prompt-engineering-basics/images/04-playground-chat-instructions.png)

## Kenapa Kita Perlu Prompt Engineering?

Sekarang kita tahu cara prompt diproses oleh LLM, mari bicara tentang _mengapa_ kita perlu prompt engineering. Jawabannya terletak pada fakta bahwa LLM saat ini menimbulkan beberapa tantangan yang membuat _penyelesaian yang andal dan konsisten_ lebih sulit tanpa usaha dalam konstruksi dan optimasi prompt. Misalnya:

1. **Respons model stokastik.** _Prompt yang sama_ mungkin menghasilkan respons berbeda dengan model atau versi model yang berbeda. Dan mungkin menghasilkan hasil yang berbeda dengan _model yang sama_ pada waktu yang berbeda. _Teknik prompt engineering bisa membantu meminimalkan variasi dengan memberi batasan yang lebih baik_.

2. **Model bisa menghasilkan respons yang tidak akurat.** Model dilatih dengan _dataset yang besar tapi terbatas_, artinya mereka tidak tahu konsep di luar cakupan pelatihan. Akibatnya, mereka bisa menghasilkan completion yang tidak akurat, imajiner, atau bertentangan dengan fakta yang diketahui. _Teknik prompt engineering membantu pengguna mengidentifikasi dan memitigasi halusinasi ini, mis. dengan meminta AI memberi kutipan atau penalasannya_.

3. **Kemampuan model akan bervariasi.** Model baru atau generasi baru akan memiliki kemampuan yang lebih kaya tapi juga keunikan biaya dan kompleksitas. _Prompt engineering bisa membantu kita mengembangkan praktik terbaik dan alur kerja yang abstrak melintasi perbedaan dan beradaptasi dengan persyaratan model secara skalabel_.

Lihat ini dalam aksi di OpenAI atau Azure OpenAI Playground:

- Gunakan prompt yang sama dengan berbagai deployment LLM (mis. OpenAI, Azure OpenAI, Hugging Face) — apa variasinya?
- Gunakan prompt yang sama berulang kali dengan _deployment LLM yang sama_ — variasinya bagaimana?

### Contoh Halusinasi

Di kursus ini, kita pakai istilah **"halusinasi"** untuk merujuk pada fenomena di mana LLM kadang-kadang menghasilkan informasi yang faktis tidak akurat akibat keterbatasan pelatihan atau faktor lain. Meskipun kita lebih suka istilah _"fabrication"_ untuk menghindari antropomorfisme perilaku mesin, kita pakai _"halusinasi"_ karena sudah dikenal luas di literatur dan diskusi tentang LLM.

Ingin merasakan cara kerja halusinasi? Bayangkan prompt yang memerintah AI menghasilkan konten untuk topik tidak ada (untuk memastikan tidak ada di dataset pelatihan). Misalnya, pertimbangkan prompt ini:

> **Prompt:** Analisis dampak *2025 Novi-Vizag Hyperloop* pada demografi India.

Tidah ada "2025 Novi-Vizag Hyperloop," tapi model mungkin tetap menghasilkan respons yang terdengar masuk akal bagi pengguna yang belum mengerti. Ini adalah halusinasi, di mana model menciptakan respons berdasarkan data pelatihannya, meskipun peristiwa tersebut sepenuhnya fiksi.

Lalu apa yang terjadi saat kita jalankan prompt ini dengan berbagai penyedia LLM?

> **Respons 1**: Azure OpenAI Playground (GPT-35)
> "2025 Novi-Vizag Hyperloop adalah proyek revolusioner yang merevolusi transportasi India, menghubungkan kota Novi dan Vizag dalam waktu singkat dan mengubah ekonomi wilayah."

> **Respons 2**: Azure OpenAI Playground (GPT-35)
> "2025 Novi-Vizag Hyperloop adalah proyek transformatif yang menghubungkan kota Novi dan Vizag, merevolusi transportasi di wilayah dan meningkatkan pertumbuhan ekonomi."

> **Respons 3**: Hugging Face Chat Playground (LLama-2)
> "2025 Novi-Vizag Hyperloop adalah proyek infrastruktur utama yang menghubungkan kota Novi dan Vizag, menyediakan moda transportasi cepat dan efisien bagi warga wilayah."

Seperti yang diharapkan, setiap model (atau versi model) menghasilkan respons yang sedikit berbeda akibat perilaku stokastik dan variasi kemampuan model. Misalnya, satu model menargetkan audiens kelas 8 sementara yang lain asumsikan pelajar SMA. Namun ketiganya menghasilkan respons yang bisa meyakinkan pengguna yang belum mengerti bahwa peristiwa tersebut nyata.

Teknik prompt engineering seperti _metaprompting_ dan _konfigurasi temperature_ bisa mengurangi halusinasi model sampai batas tertentu. Arsitektur _prompt engineering_ yang baru juga menggabungkan alat dan teknik baru ke dalam alur prompt, untuk memitigasi atau mengurangi efek-efek ini.

## Konstruksi Prompt

Kita sudah tahu mengapa prompt engineering penting — sekarang mari pahami cara _membangun_ prompt agar kita bisa mengevaluasi teknik untuk desain prompt yang lebih efektif.

### Prompt Dasar

Mari kita mulai dengan prompt dasar: input teks yang dikirim ke model tanpa konteks tambahan. Contoh — ketika kita mengirim beberapa kata pertama lagu ke OpenAI [Completion API](https://platform.openai.com/docs/api-reference/completions), ia langsung _melengkapi_ respons dengan baris berikutnya, menggambarkan perilaku prediksi dasar.

| Prompt (Masukan) | Completion (Keluaran) |
| :----------------- | :-- |
| Oh say can you see | Bunyi seperti Anda sedang memulai lirik "The Star-Spangled Banner", lagu kebangsaan AS. Lirik lengkapnya adalah ... |

### Prompt Kompleks

Sekarang mari tambahkan konteks dan instruksi ke prompt dasar. [Chat Completion API](https://learn.microsoft.com/azure/ai-services/openai/how-to/chatgpt) memungkinkan kita membangun prompt kompleks sebagai kumpulan _messages_ dengan:

- Pasangan masukan/keluaran yang mencerminkan _user_ input dan respons _assistant_.
- Pesan sistem yang menetapkan konteks untuk perilaku atau kepribadian asisten.

Permintaan sekarang dalam bentuk di bawah, di mana _tokenisasi_ secara efektif menangkap informasi yang relevan dari konteks dan percakapan. Sekarang, mengubah konteks sistem bisa berdampak besar pada kualitas completion seperti input pengguna.

\`\`\`python
response = openai.chat.completions.create(
  model="gpt-3.5-turbo",
  messages=[
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Who won the world series in 2020?"},
    {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
    {"role": "user", "content": "Where was it played?"}
  ]
)
\`\`\`

### Prompt Instruksi

Di contoh di atas, prompt pengguna adalah pertanyaan teks sederhana yang bisa ditafsirkan sebagai permintaan informasi. Dengan _prompt instruksi_, kita bisa menggunakan teks untuk menetapkan tugas dengan lebih rinci, memberi panduan yang lebih baik ke AI. Contoh:

| Prompt (Masukan) | Completion (Keluaran) | Tipe Instruksi |
| :-- | :-- | :-- |
| Tuliskan deskripsi Perang Sipil | _paragraf sederhana_ | Sederhana |
| Tuliskan deskripsi Perang Sipil. Sertakan tanggal dan kejadian kunci serta makna-maknanya | _paragraf diikuti daftar tanggal kejadian_ | Kompleks |
| Tuliskan deskripsi Perang Sipil dalam 1 paragraf. Sertakan 3 poin bullet tanggal kunci dan maknanya. Sertakan 3 poin bullet tokoh sejarah dan kontribusinya. Kembalikan output sebagai file JSON | _rincian lebih lengkap di kotak teks, berformat JSON yang bisa disalin ke file_ | Kompleks, Berformat |

## Konten Utama

Di contoh di atas, prompt masih agak terbuka, memungkinkan LLM memilih bagian dataset pre-trained yang relevan. Dengan pola desain _konten utama_, teks input dibagi menjadi dua bagian:

- instruksi (aksi)
- konten yang relevan (yang memengaruhi aksi)

Contoh di mana instruksinya adalah "Rangkum dalam 2 kalimat".

| Prompt (Masukan) | Completion (Keluaran) |
| :-- | :-- |
| Jupiter adalah planet ke-5 dari Matahari dan terbesar di Sistem Matahari. Ia adalah gas raksasa dengan massa seribu kali Matahari, tapi dua setengah kali semua planet lain. Jupiter adalah salah satu benda terterang yang bisa dilihat telungawah di malam hari, dan dikenal sejak zaman kuno. Dinamai setelah dewa Romulus Jupiter... | Jupiter, planet ke-5 dari Matahari, adalah terbesar dan dapat dilihat di malam hari. Gas raksasa dengan massa 1/1000 Matahari, lebih berat dari semua planet lainnya. |

Segmen konten utama bisa digunakan dengan berbagai cara untuk memandu instruksi yang lebih efektif:

- **Contoh** — Alih-alih memberi tahu model apa yang harus dilakukan dengan instruksi eksplisit, berikan contoh dari apa yang harus dilakukan dan biarkan model menyimpulkan polanya.
- **Cue** — ikuti instruksi dengan sebuah "cue" yang membimbing completion, mendorong model ke kembali ke respons yang relevan.
- **Template** — "resep" yang dapat diulang untuk prompt dengan placeholder (variabel) yang bisa disesuaikan dengan data khusus.

Mari kita eksplorasi.

### Menggunakan Contoh

Pendekatan ini menggunakan konten utama untuk "memberi makan" model sejumlah contoh output yang diinginkan untuk instruksi tertentu dan biarkan model menyimpulkan polanya. Berdasarkan jumlah contoh, kita bisa punya prompt nol-shot, satu-shot, beberapa-shot, dll.

Prompt sekarang terdiri dari 3 komponen:

- Deskripsi tugas
- Beberapa contoh output yang diinginkan
- Awalan contoh baru (menjadi deskripsi tugas implisit)

| Jenis Pembelajaran | Prompt (Masukan) | Completion (Keluaran) |
| :-- | :-- | :-- |
| Zero-shot | "The Sun is Shining". Translate to Spanish | "El Sol está brillando". |
| One-shot | "The Sun is Shining" => "El Sol está brillando". <br> "It's a Cold and Windy Day" => | "Es un día frío y ventoso." |
| Few-shot | The player ran the bases => Baseball <br/> The player hit an ace => Tennis <br/> The player hit a six => Cricket <br/> The player made a slam-dunk => | Basketball |

Perhatikan kita harus memberi instruksi eksplisit ("Translate to Spanish") pada zero-shot, tapi langsung disimpulkan pada one-shot. Contoh beberapa-shot menunjukkan bagaimana menambah contoh memungkinkan model membuat inferensi yang lebih akurat tanpa instruksi tambahan.

### Cue Prompt

Teknik lain untuk konten utama adalah memberi _cue_ daripada contoh. Dalam kasus ini, kita "mendorong" model dengan _memulai_ dengan potongan yang mencerminkan format respons yang diinginkan. Model lalu "menyusul cue" untuk melanjutkan dengan cara yang sama.

### Praktik Terbaik Prompting

Sekarang kita tahu cara membangun prompt, mari berpikir tentang cara _merancang_ prompt untuk prinsip terbaik. Kita bisa memikirkan dalam dua bagian — punya _mindset_ yang benar dan menerapkan _teknik_ yang tepat.

#### Mindset Prompt Engineering

Prompt Engineering adalah proses coba-coba; ingat 3 faktor bimbingan:

1. **Pemahaman Domain penting.** Akurasi dan relevansi respons adalah fungsi dari _domain_ di mana aplikasi/pengguna beroperasi. Terapkan intuisi dan keahlian domain Anda untuk _menyesuaikan teknik_. Mis. definisikan _personalitas khusus domain_ di prompt sistem, atau pakai _template khusus domain_ di prompt pengguna. Sediakan konten sekunder yang mencerminkan konteks khusus domain, atau pakai _cue dan contoh khusus domain_ untuk mengarahkan model ke pola penggunaan yang dikenal.

2. **Pemahaman Model penting.** Kita tahu model bersifat stokastik. Tapi implementasi model juga berbeda dalam dataset pelatihan (pengetahuan), kemampuan yang disediakan (mis. API/SDK), dan jenis konten yang dioptimalkan (mis. kode vs gambar vs teks). Pahami kekuatan dan keterbatasan model yang Anda gunakan, dan gunakan pengetahuan itu untuk _mengutulkan tugas_ atau membuat _template yang disesuaikan_ yang dioptimalkan untuk kemampuan model.

3. **Iterasi & Validasi penting.** Model berevolusi cepat, begitu juga teknik prompt engineering. Sebagai ahli domain, Anda mungkin punya konteks/kriteria khusus untuk aplikasi _Anda_ yang mungkin tidak berlaku untuk komunitas luas. Pakai alat & teknik prompt engineering untuk "memulai cepat" konstruksi prompt, lalu iterasi dan validasi hasilnya dengan intuisi dan keahlian domain Anda. Catat wawasan Anda dan buat **basis pengetahuan** (mis. pustaka prompt) yang bisa jadi baseline baru bagi orang lain.

## Praktik Terbaik

Berikut praktik terbaik yang disarankan oleh [OpenAI](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api) dan praktisi [Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/concepts/prompt-engineering#best-practices):

| Apa | Kenapa |
| :--- | :--- |
| Evaluasi model terbaru. | Generasi model baru mungkin punya fitur & kualitas yang lebih baik — tapi juga biaya lebih tinggi. Evaluasi dampatnya, lalu ambil keputusan migrasi. |
| Pisahkan instruksi & konteks | Cek apakah penyedia model Anda mendefinisikan _delimiters_ untuk membedakan instruksi, konten utama, dan sekunder dengan jelas. Ini bisa bantu model memberi bobot yang akurat. |
| Jelas dan spesifik | Beri detail tentang konteks, hasil, panjang, format, gaya, dll. Ini akan meningkatkan kualitas & konsistensi respons. |
| Deskriptif, pakai contoh | Model bisa merespons lebih baik dengan pendekatan "show and tell". Mulai dengan _zero-shot_ lalu coba _few-shot_ sebagai perbaikan. Pakai analogi. |
| Pakai cue untuk memulai completion | Dorong ke hasil yang diinginkan dengan beri kata/frasa pembuka sebagai titik mulai. |
| Ulangi | Kadang perlu mengulangi instruksi. Beri instruksi sebelum & setelah konten utama. Iterasi & validasi. |
| Urutan penting | Urutan informasi bisa memengaruhi output (recency bias). Coba perpaduan yang berbeda. |
| Beri model _out_ | Beri respons cadangan jika model tidak bisa menyelesaikan tugas. Ini mengurangi kemungkinan model menghasilkan respons palsu. |

Seperti semua praktik terbaik, ingat _hasilnya bisa berbeda_ berdasarkan model, tugas, dan domain. Pakai ini sebagai titik awal, lalu iterasi untuk menemukan apa yang terbaik. Evaluasi proses prompt engineering Anda secara berkala.

## Cek Pengetahuan

Manakah prompt berikut yang baik?

1. Show me an image of red car
2. Show me an image of red car of make Volvo and model XC90 parked by a cliff with the sun setting
3. Show me an image of red car of make Volvo and model XC90

**Jawaban:** 2, itu prompt terbaik karena memberi detail "apa" dan spesifik (bukan mobil apa saja tapi merek dan model tertentu), juga menggambarkan pengaturan keseluruhannya. 3 adalah nomor berikutnya karena juga mengandung banyak deskripsi.
`},
  {
    kode: 'G04',
    judul: 'Prompt Engineering Lanjutan',
    jalur: 'G',
    urutan_sesi: 4,
    durasi_menit: 90,
    kategori: 'PRMP',
    slide_url: `${GITHUB_REPO}/tree/main/04-prompt-engineering-advanced`,
    content_md: `# Prompt Engineering Lanjutan

## Membuat Prompt Lanjutan:

Mari selami dunia prompt engineering dan jelajahi teknik untuk menciptakan prompt yang kuat untuk memaksimalkan interaksi AI Anda.

### Ringkas: Apa Itu Prompt Engineering?

Prompt engineering adalah seni mengarahkan Large Language Model (LLM) agar menghasilkan respons yang diinginkan dengan instruksi dan konteks spesifik. Seperti memberi peta dan kompas rinci ke asisten AI untuk menelusuri lautan informasi dan menghasilkan output yang relevan dan akurat.

### Kenapa Prompt Engineering Penting?

LLM sangat kuat tapi tidak dapat diprediksi. Tanpa panduan yang tepat, mereka bisa menghasilkan respons yang tidak relevan atau tidak akurat. Prompt engineering menjembatani celah ini dengan memberikan info dan instruksi yang diperlukan.

### Teknik untuk Prompt Engineering Efektif

Beberapa teknik kunci untuk membuat prompt efektif:

#### Zero-shot Prompting:
**Contoh:** Memberi tahu AI "Apa dampak lingkungan penggunaan plastik?" tanpa konteks atau contoh. Model menggunakan pengetahuannya untuk menjawab.
**Use case:** Berguna untuk pertanyaan langsung di mana konteks sudah umum.

#### Few-shot Prompting:
**Contoh:** Meminta AI menulis haiku tentang gugur daun dengan contoh haiku musim.
**Use case:** Meningkatkan kemampuan AI untuk mencocokkan gaya dan struktur.

#### Chain-of-Thought Prompting:
**Contoh:** "Jelaskan cara sebuah rancangan Undang-Undang menjadi hukum di AS dengan menguraikan setiap langkah." Model memecah query menjadi langkah.
**Use case:** Membantu memecah tugas kompleks menjadi langkah logis yang sederhana.

#### Generated Knowledge:
**Contoh:** "Tulis panduan lengkap merawat biawak peliharaan, termasuk diet, habitat, dan masalah kesehatan umum." Fakta tambahan disertakan.
**Use case:** Berguna saat butuh detail spesifik dan akurat.

#### Least-to-most Prompting:
**Contoh:** "Jelaskan proses fotosintesis, dari penyerapan cahaya hingga pembuatan glukosa." Panduan ke arah kompleksitas meningkat.
**Use case:** Ideal untuk tujuan edukatif dengan penyampaian dari sederhana ke kompleks.

#### Self-refine Prompting:
**Contoh:** Prompt awal: "Tulis cerita singkat tentang detektif yang memecahkan teka-teki." Setelah evaluasi, prompt yang disempurnakan: "Perbaiki cerita dengan menambahkan ketegang dan menggambarkan pemikiran detektif."
**Use case:** Membantu memperbaiki konten secara iteratif.

#### Maieutic Prompting:
**Contoh:** Setelah AI menghasilkan jawaban, follow-up: "Jelaskan mengapa Anda menyimpulkan energi terbarukan penting." Meminta AI menjelaskan penalasanya.
**Use case:** Meningkatkan pemahaman proses penaluan AI.

### Mengganti Output Anda

LLM bersifat tidak deterministik; sama saja bisa menghasilkan output yang berbeda untuk prompt yang sama. Pakai _temperature_ untuk mengontrol tingkat acak. Temperature 0 = paling deterministik; 1 = paling bervariasi.

### Praktik Terbaik untuk Prompt Engineering

- **Spesifikan konteks:** Beri LLM info domain, topik, dan hasil yang diinginkan.
- **Batasi output:** Tentukan panjang/jumlah item yang ingin.
- **Spesifikan apa dan bagaimana:** Jelaskan apa yang ingin dilakukan dan bagaimana caranya.
- **Pakai template:** Jika perlu hasil yang serupa berulang kali, pakai template dengan variabel.
- **Periksa ejaan:** Pastikan prompt bebas typo dan tata bahasa.

### Tugas: Perbaiki Kode API Python

Berikut kode Python API sederhana pakai Flask:

\`\`\`python
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def hello():
name = request.args.get('name', 'World')
return f'Hello, {name}!'

if __name__ == '__main__':
app.run()
\`\`\`

Gunakan AI seperti Gemini atau ChatGPT untuk memperbaiki kode ini pakai teknik "self-refine". Ingat praktik terbaik di atas.

### Solusi: Kode API Python yang Diperbaiki

\`\`\`python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/v1/products')
def get_products():
products = [...]
return jsonify(products)

@app.route('/api/v1/customers')
def get_customers():
customers = [...]
return jsonify(customers)

if __name__ == '__main__':
app.run(debug=True)
\`\`\`

Kode yang diperbaiki mencakup:

- Nama fungsi dan docstring yang jelas.
- Rute khusus untuk produk dan pelanggan.
- Daftar produk dan pelanggan lengkap.
- Pakai `jsonify` untuk respons JSON.
- Opsi `debug=True`.

### Kesimpulan

Prompt engineering adalah alat yang bisa membantu Anda membuka potensi penuh LLM. Dengan menerapkan teknik dan praktik di panduan ini, Anda bisa membuat prompt efektif yang menghasilkan hasil yang diinginkan dan meningkatkan interaksi AI.
`},
  {
    kode: 'G05',
    judul: 'Dasar Generasi Teks dengan Gemini dan OpenAI',
    jalur: 'G',
    urutan_sesi: 5,
    durasi_menit: 90,
    kategori: 'CODE',
    slide_url: `${GITHUB_REPO}/tree/main/05-text-generation-basics`,
    content_md: `# Membuat Aplikasi Generasi Teks dengan Gemini dan OpenAI

Jelajahi dunia aplikasi generasi teks lewat notebook Jupyter. Kurikulum ini memperkenalkan konsep dasar seperti prompt, completion, dan penggunaan model seperti \`gemini\` dari Google. Anda akan dapat praktek menggunakan NLP untuk menghasilkan teks secara dinamis.

## Ringkasan Notebook

### 1. Pengantar Generasi Teks (\`01-authentication.ipynb\`)

Notebook ini memperkenalkan konsep dasar untuk memulai membuat aplikasi generasi teks:

- **Membuat API Key**: Pelajari cara membuat API key yang diperlukan untuk autentikasi permintaan.
- **Menambah Key ke Colab Secrets**: Tambahkan API key secara aman ke Colab Secrets.
- **Menginstal Python SDK**: Instruksi menginstal Gemini Python SDK.
- **Mengonfigurasi SDK dengan API Key**: Cara mengatur SDK pakai API key Anda.

### 2. Membuat Aplikasi Generasi Teks Pertama (\`02-getting-started.ipynb\`)

Notebook ini memperkenalkan dasar-dasar bekerja dengan Gemini API. Termasuk:

- **Mengatur API Key**: Ringkasan cara mengatur API key.
- **Menjalankan Prompt Pertama**: Pelajari cara menjalankan prompt teks sederhana dengan API.
- **Menggunakan Gambar di Prompt**: Jelajahi cara memperkaya prompt dengan gambar.

## Tujuan Pembelajaran

Setelah menyelesaikan notebook ini, Anda akan bisa:

- Memahami dan menjelaskan fungsionalitas aplikasi generasi teks.
- Membuat dan mengonfigurasi aplikasi generasi teks dasar dengan Gemini API.
- Memanipulasi parameter kunci seperti token dan temperature untuk hasil yang bervariasi.

## Ide Proyek

- **Generator Resep:** Perkaya generator resep dengan menyesuaikan temperature dan prompt.
- **Study Buddy:** Buat aplikasi yang membantu mereka belajar Python lewat latihan koding interaktif.
- **History Bot:** Buat bot yang meniru figur sejarah dan menjawab pertanyaan tentang hidupnya.

## Lanjutkan

Jangan berhenti di sini! Lanjutkan pengetahuan Anda dengan pelajaran berikut tentang membuat aplikasi chat.

Notebook praktik: [02-getting-started.ipynb (Colab)](${BASE_RAW}/05-text-generation-basics/02-getting-started.ipynb)
`},
  {
    kode: 'G06',
    judul: 'Dasar Membangun Chatbot',
    jalur: 'G',
    urutan_sesi: 6,
    durasi_menit: 90,
    kategori: 'CODE',
    slide_url: `${GITHUB_REPO}/tree/main/06-chat-basics`,
    content_md: `# Dasar Membangun Chatbot

## Pendahuluan

Pelajari cara membuat chatbot dasar menggunakan Gemini AI API dari Google. Notebook ini memandu Anda membuat chatbot yang bisa merespons pertanyaan Anda dengan bantuan model bahasa besar.

## Apa yang Akan Dipelajari

- Cara kerja API chat (perbedaan dengan text generation).
- Cara mengirim riwayat obrolan ke API.
- Cara mengelola suhu (temperature) untuk kontrol kreativitas.
- Cara menambahkan safety prompt untuk menjaga respons tetap aman.

## Struktur Notebook (\`01-chat-basics.ipynb\`)

### 1. Mengimpor pustaka & mengautentikasi API
\`\`\`python
import google.generativeai as genai
genai.configure(api_key=GEMINI_API_KEY)
\`\`\`

### 2. Membuat model chat
\`\`\`python
model = genai.GenerativeModel('gemini-1.5-flash')
chat = model.start_chat(history=[])
\`\`\`

### 3. Mengirim pesan bertahap
\`\`\`python
response = chat.send_message("Apa cuaca hari ini?")
print(response.text)
\`\`\`

### 4. Melihat riwayat chat
\`\`\`python
for content in chat.history:
print(f'{content.role}: {content.parts[0].text}')
\`\`\`

## Tips Membangun Chatbot

- **Gunakan role system** untuk menentukan kepribadian asisten.
- **Simpan riwayat** agar obrolan konsisten bertarikpan.
- **Atur temperature rendah** (0.2–0.5) untuk obrolan fakta, tinggi (0.7+) untuk kreatif.
- **Filter output** untuk mencegah keluaran berbahaya.

## Rujukan

- [Dokumentasi Gemini API](https://ai.google.dev/gemini-api/docs)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/guides/text-generation)

Notebook praktik: [01-chat-basics.ipynb (Colab)](${BASE_RAW}/06-chat-basics/01-chat-basics.ipynb)
`},
  {
    kode: 'G07',
    judul: 'Dasar Embedding',
    jalur: 'G',
    urutan_sesi: 7,
    durasi_menit: 90,
    kategori: 'CODE',
    slide_url: `${GITHUB_REPO}/tree/main/07-embedding-basics`,
    content_md: `# Dasar Embedding

## Embedding

Embedding adalah representasi numerik data kompleks seperti kata, kalimat, atau bahkan gambar dan video, dalam vektor ruang kontinu. Embedding membantu model machine learning memproses dan memahami data lebih efisien.

### Jenis Embedding

1. **Word Embeddings**:
   - **Contoh**: Word2Vec, GloVe, FastText
   - Konversi kata ke vektor; kata dengan makna mirip berada dekat di ruang embedding.

2. **Sentence dan Document Embeddings**:
   - **Contoh**: BERT, Doc2Vec
   - Representasikan seluruh kalimat atau dokumen sebagai vektor, menangkap konteks dan makna.

3. **Text Embeddings**:
   - Mirip word embeddings, tapi fokus pada unit teks yang lebih besar seperti frasa atau dokumen.

4. **Graph Embeddings**:
   - Representasikan node, edge, atau graf penuh di ruang vektor, berguna untuk analisis jaringan.

5. **Image Embeddings**:
   - **Contoh**: CNNs
   - Digunakan untuk pengenalan dan klasifikasi gambar dengan merepresentasikan gambar sebagai vektor.

## Cara Kerja Embedding

- **Pelatihan**:
  - Embedding dipelajari dengan melatih model pada tugas tertentu, seperti merekonstruksi konteks bahasa dari kata.

- **Dimensionalitas**:
  - Vektor biasanya berdimensi 50–300, yang membantu mengelola data high-dimensional. Inovasi seperti GPT dan BERT memiliki embedding dengan ribuan dimensi.

- **Penggunaan**:
  - Gunakan embedding untuk mengukur kemiripan antar input dengan menghitung jarak (mis. cosine similarity) antar vektor.

![Image Embeddings](https://arize.com/wp-content/uploads/2022/06/blog-king-queen-embeddings.jpg)

Sumber: [Arize](https://arize.com/)

## Apa Itu Cosine Similarity?

- **Definisi**:
  - Cosine similarity mengukur cosinus sudut antar dua vektor, menunjukkan seberapa serupa arahnya.

- **Rentang**:
  - Skor mirip -1 (berlawanan) hingga 1 (identik), 0 = tidak mirip.

- **Rumus**:
  - Untuk vektor \`A\` dan \`B\`, cosine similarity = \`(A . B) / (||A|| * ||B||)\`.

- **Aplikasi**:
  - Cosine similarity banyak dipakai di rekomendasi, mesin pencari, dan algoritma klustering.

## Use Case

1. **Pencarian Semantik**:
  - Text embeddings merepresentasikan query dan dokumen di ruang vektor. Dokumen dekat query diberi peringkat tinggi.

2. **Klasifikasi Teks**:
  - Latih model memetakan embeddings teks ke label kategori (mis. kucing vs anjing, spam vs tidak spam).

3. **Sistem Rekomendasi**:
  - Pakai embeddings untuk merepresentasikan pengguna, item, dan interaksi di ruang vektor.

4. **Deteksi Anomali**:
  - Deteksi outlier di data high-dimensional dengan mengukur jarak embeddings data normal dan anomali.

## Contoh Lain di Dunia Nyata

**Mobil Otonom**

Masalah penting lainnya di mana embedding dipakai adalah mobil otonom. Anda melatih model untuk sistem pengereman mobil, dengan fitur "stop sign". Latih dengan banyak stop sign di area Anda, tapi di dunia nyata Anda mungkin bertemu stop sign berbahasa atau bentuk berbeda. Untung ada tim lain yang sediakan embedding stop sign untuk Anda pakai. Fokus pada satu bagian masalah sementara tim lain bertanggung jawab pada embedding rambu lalu lintas. Embedding menjadi antarmuka antar model, seperti antarmuka REST antar mikroservice. Anda bisa setuju pada dimensionalitas, tapi selebihnya model downstream bisa menjadi kotak hitam.

![Image Embeddings](https://arize.com/wp-content/uploads/2022/06/blog-stop-sign-embeddings.png)

Notebook praktik: [01-classify-text-with-embeddings.ipynb (Colab)](${BASE_RAW}/07-embedding-basics/01-classify-text-with-embeddings.ipynb) dan [02-documents-search-with-embeddings.ipynb (Colab)](${BASE_RAW}/07-embedding-basics/02-documents-search-with-embeddings.ipynb)
`},
  {
    kode: 'G08',
    judul: 'Aplikasi RAG (Retrieval-Augmented Generation) Dasar',
    jalur: 'G',
    urutan_sesi: 8,
    durasi_menit: 90,
    kategori: 'ARCH',
    slide_url: `${GITHUB_REPO}/tree/main/08-basic-rag-application`,
    content_md: `# Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation (RAG) adalah teknik NLP yang meningkatkan kemampuan model generatif dengan memasukkan sistem pengambilan (retrieval). Kombinasi ini memungkinkan model menghasilkan respons yang akurat dan relevan secara konteks. RAG terdiri dari dua komponen utama:

## 1. Sistem Pengambilan (Retrieval System)

Sistem pengambilan seperti pustakawan yang mencari perpustakaan informasi untuk menemukan dokumen relevan berdasarkan kueri Anda. Komponen ini penting karena menyediakan tulang punggung faktis dan konteks yang mendukung proses generasi. Cara kerjanya:

- **Masukan**: Menerima query atau prompt dari pengguna.
- **Aksi**: Mencari database atau korpus besar untuk menemukan info relevan.
- **Keluaran**: Memberikan dokumen/data paling relevan ke model generatif.

## 2. Model Generatif

Setelah sistem pengambilan memberi info relevan, model generatif ikut campur. Bayangkan penulis ahli yang memakai info dari sistem pengambilan untuk menyusun respons yang terperinci, terinformasi, dan sesuai. Prosesnya:

- **Masukan**: Query asli + dokumen yang diambil.
- **Aksi**: Menganalisis masukan dan data konteks untuk memahami tugas.
- **Keluaran**: Menghasilkan respons yang relevan dengan query dan kaya akan detail dari dokumen yang diambil.

## Aplikasi RAG

RAG sangat berguna untuk aplikasi di mana kedalaman pengetahuan dan pemahaman konteks kritis. Beberapa use case:

- **Sistem Tanya Jawab**: RAG menjawab pertanyaan spesifik dengan mengambil data faktis dan menghasilkan jawaban yang akurat.
- **Chatbot**: Tingkatkan kemampuan chatbot memberi respons yang akurat dan sesuai konteks.

## Contoh RAG dalam Aksi

Bayangkan Anda bertanya, "Apa manfaat kesehatan utama dari teh hijau?" Berikut cara RAG menanganinya:

1. **Fase Pengambilan**:
   - Sistem mencari database kesehatan dan mengambil dokumen tentang khasiat teh hijau.

2. **Fase Generasi**:
   - Dengan info yang diambil, sistem menghasilkan jawaban rinci, misalnya: "Teh hijau kaya antioksidan seperti katekin, yang bisa mengurangi stres oksidatif dan peradangan. Studi menunjukkan juga meningkatkan fungsi otak dan pembakaran lemak."

Contoh ini menunjukkan cara RAG memanfaatkan kemampuan pengambilan dan generatif untuk menjawab yang terinformasi dan komprehensif.

![image](https://github.com/Ramachetan/generative-ai-for-beginners/assets/24260211/e62a97a3-d567-47b5-9d95-67baa8cd937c)

Notebook praktik: [01-basic-rag-application.ipynb (Colab)](${BASE_RAW}/08-basic-rag-application/01-basic-rag-application.ipynb)
`},
  {
    kode: 'G09',
    judul: 'Presentasi Skills (GAFB)',
    jalur: 'G',
    urutan_sesi: 9,
    durasi_menit: 90,
    kategori: 'PRES',
    slide_url: `${GITHUB_REPO}/tree/main/08-basic-rag-application`,
    content_md: `# Presentasi Skills (GAFB)

## Struktur Presentasi Profesional

Modul lintas jalur ini mengajarkan keterampilan presentasi inti yang sama untuk semua jalur:

1. **Presentasi Skills 1** — Struktur profesional (pendahuluan, isi, penutupan) — 30 menit
2. **Presentasi Skills 2** — Public speaking: suara, postur, eye contact — 30 menit
3. **Presentasi Skills 3** — Q&A + menangani pertanyaan sulit — 30 menit
4. **Presentasi Akhir** — Presentasi proyek akhir di depan teman — 60 menit

## Tujuan

- Rangkai presentasi jelas dengan intro-body-closing.
- Teknik suara jelas, intonasi, dan kontak mata.
- Siap menjawab pertanyaan-pertanyaan sulit.
- Demo proyek akhir (RAG sederhana) dengan percaya diri.

## Rubrik Penilaian Ringkas

| Aspek | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|
| Struktur | tidak jelas | ada outline | logis & lengkap | memancuh |
| Konten | kurang relevan | relevan | mendalam | mengagumi |
| Penyampaian | sering mengumur | cukup jelas | jelas & fluen | memukau |
| Visual | acak-acak | rapi | informatif | profesional |

## Tips Cepat

- Jangan bacakan slide; pakai sebagai panduan.
- Satu gagasan per slide.
- Rekam diri sendiri — dengarkan & perbaiki.
- Latihan 3x sebelum presentasi final.
`},
  {
    kode: 'G10',
    judul: 'Post-Test & Evaluasi GAFB',
    jalur: 'G',
    urutan_sesi: 10,
    durasi_menit: 90,
    kategori: 'ETHC',
    slide_url: `${GITHUB_REPO}/tree/main/09-additional-resources`,
    content_md: `# Post-Test & Evaluasi GAFB

## Ringkasan GAFB

Generative AI for Beginners (GAFB) adalah kursus 8-modul yang mencakup:

1. Pengenalan Generative AI dan LLM
2. Membandingkan LLM
3. Dasar Prompt Engineering
4. Prompt Engineering Lanjutan
5. Dasar Generasi Teks (Gemini/OpenAI)
6. Dasar Chatbot
7. Dasar Embedding
8. Aplikasi RAG Dasar

## Cek Pemahaman (Post-Test)

Jawab pertanyaan berikut:

1. Apa perbedaan Generative AI dan Predictive AI?
2. Jelaskan konsep tokenisasi.
3. Apa 3 teknik prompting lanjutan?
4. Apa itu RAG? Komponen utamanya?
5. Apa itu embedding dan cosine similarity?
6. Apa peran temperature dalam LLM?
7. Apa itu halusinasi dalam konteks LLM?
8. Apa keuntungan model open source vs proprietary?

## Refleksi Diri

Tuliskan minimal 3 hal:
- Hal terkagih yang dipelajari
- Keterampilan baru
- Rencana praktik lanjutan

## Sumber Daya Lanjutan

### Roadmap RAG
- [5-day LLM foundations roadmap](https://github.com/aishwaryanr/awesome-generative-ai-guide/blob/main/resources/genai_roadmap.md)
- [3-day RAG roadmap](https://github.com/aishwaryanr/awesome-generative-ai-guide/blob/main/resources/RAG_roadmap.md)

### Kursus Gratis
- [Generative AI for Beginners (Microsoft)](https://github.com/microsoft/generative-ai-for-beginners)
- [Transformers course (Huggingface)](https://huggingface.co/learn/nlp-course/chapter1/1)
- [CS324 - Large Language Models (Stanford)](https://stanford-cs324.github.io/winter2022/)

### Cookbooks
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)
- [Gemini Cookbook](https://github.com/GoogleCloudPlatform/generative-ai)
- [Langchain Cookbook](https://python.langchain.com/v0.1/docs/cookbook/)
`},
];

const BATCHES = [
  {
    kode_batch: 'GAFB-01',
    jalur: 'G',
    nama_batch: 'Generative AI for Beginners — Batch 01',
    kapasitas_maks: 20,
    terdaftar: 0,
    status: 'terbuka',
  },
];

async function main() {
  // 0. Alter check constraint untuk menambah jalur G
  await sb.rpc('exec', { sql: `
    alter table public.modul drop constraint if exists modul_jalur_check;
    alter table public.modul add constraint modul_jalur_check check (jalur in ('A','B1','B2','B3','G'));

    alter table public.batch drop constraint if exists batch_jalur_check;
    alter table public.batch add constraint batch_jalur_check check (jalur in ('A','B1','B2','B3','G'));

    alter table public.peserta drop constraint if exists peserta_jalur_check;
    alter table public.peserta add constraint peserta_jalur_check check (jalur in ('A','B1','B2','B3','G'));

    alter table public.pendaftar drop constraint if exists pendaftar_jalur_check;
    alter table public.pendaftar add constraint pendaftar_jalur_check check (jalur in ('A','B1','B2','B3','G'));
  ` });
  console.log('✓ Constraint jalur sudah menerima G');

  // 1. Insert modul
  const { error: mErr } = await sb.from('modul').upsert(MODULS, { onConflict: 'kode' });
  if (mErr) throw mErr;
  console.log(`✓ Inserted/update ${MODULS.length} modul GAFB`);

  // 2. Insert batch
  const { error: bErr } = await sb.from('batch').upsert(BATCHES, { onConflict: 'kode_batch' });
  if (bErr) throw bErr;
  console.log(`✓ Inserted batch GAFB-01`);

  console.log('\nDone. Semua modul GAFB & 1 batch sudah di push ke Supabase.');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
