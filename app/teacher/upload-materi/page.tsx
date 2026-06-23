'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, FileText, File, Plus, Trash2, Play, Square, Sparkles, Check, Video } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

// ── Types ──────────────────────────────────────────────────────────────────────
interface KuisItem {
  pertanyaan: string;
  opsi: [string, string, string, string];
  jawabanBenar: number;
  penjelasan: string;
}

interface VisualisasiItem {
  judul: string;
  emojiIkon: string;
  deskripsi: string;
  warna: string;
}

interface AIResult {
  judul: string;
  ringkasan: string;
  poinUtama: string[];
  kuis: KuisItem[];
  visualisasi: VisualisasiItem[];
  audioDeskripsi: string;
}

// ── Mock AI Logic ──────────────────────────────────────────────────────────────
function generateMockAI(text: string): AIResult {
  const t = text.toLowerCase();

  if (t.includes('fotosintesis') || t.includes('tumbuhan') || t.includes('klorofil')) {
    return {
      judul: 'Fotosintesis: Proses Kehidupan Tumbuhan',
      ringkasan:
        'Fotosintesis adalah proses biokimia di mana tumbuhan mengubah energi cahaya matahari menjadi energi kimia yang tersimpan dalam glukosa. Proses ini terjadi di kloroplas sel daun menggunakan klorofil sebagai pigmen penyerap cahaya. Reaksi keseluruhan menghasilkan glukosa dan oksigen dari karbon dioksida dan air.',
      poinUtama: [
        'Fotosintesis terjadi di kloroplas yang mengandung klorofil',
        'Membutuhkan cahaya matahari, air (H₂O), dan karbon dioksida (CO₂)',
        'Menghasilkan glukosa (C₆H₁₂O₆) dan oksigen (O₂)',
        'Terbagi menjadi reaksi terang (di membran tilakoid) dan reaksi gelap / siklus Calvin',
        'Klorofil a dan b menyerap cahaya merah dan biru paling efisien',
        'Laju fotosintesis dipengaruhi intensitas cahaya, suhu, dan konsentrasi CO₂',
      ],
      kuis: [
        {
          pertanyaan: 'Di organel manakah proses fotosintesis berlangsung?',
          opsi: ['Mitokondria', 'Kloroplas', 'Nukleus', 'Ribosom'],
          jawabanBenar: 1,
          penjelasan: 'Fotosintesis berlangsung di kloroplas, organel yang mengandung klorofil dan tilakoid.',
        },
        {
          pertanyaan: 'Apa bahan baku utama fotosintesis?',
          opsi: ['Glukosa dan oksigen', 'Air dan karbon dioksida', 'Glukosa dan air', 'Oksigen dan karbon dioksida'],
          jawabanBenar: 1,
          penjelasan: 'Bahan baku fotosintesis adalah air (H₂O) dan karbon dioksida (CO₂) yang diubah menjadi glukosa.',
        },
        {
          pertanyaan: 'Pigmen utama yang menyerap cahaya pada fotosintesis adalah?',
          opsi: ['Karotenoid', 'Antosianin', 'Klorofil', 'Xantofil'],
          jawabanBenar: 2,
          penjelasan: 'Klorofil adalah pigmen hijau utama yang menyerap cahaya merah dan biru untuk menggerakkan fotosintesis.',
        },
        {
          pertanyaan: 'Produk fotosintesis yang dilepaskan ke atmosfer adalah?',
          opsi: ['Karbon dioksida', 'Nitrogen', 'Oksigen', 'Hidrogen'],
          jawabanBenar: 2,
          penjelasan: 'Oksigen (O₂) dihasilkan dari pemecahan molekul air dan dilepaskan sebagai produk sampingan fotosintesis.',
        },
        {
          pertanyaan: 'Reaksi gelap fotosintesis dikenal sebagai?',
          opsi: ['Reaksi Hill', 'Siklus Krebs', 'Siklus Calvin', 'Siklus Nitrogen'],
          jawabanBenar: 2,
          penjelasan: 'Siklus Calvin (reaksi gelap) menggunakan energi dari reaksi terang untuk mengubah CO₂ menjadi glukosa di stroma kloroplas.',
        },
      ],
      visualisasi: [
        { judul: 'Struktur Kloroplas', emojiIkon: '🌿', deskripsi: 'Kloroplas memiliki membran ganda, tilakoid bertumpuk (grana), dan stroma. Klorofil terdapat di membran tilakoid sebagai tempat reaksi terang berlangsung.', warna: '#16a34a' },
        { judul: 'Reaksi Terang', emojiIkon: '☀️', deskripsi: 'Cahaya matahari diserap klorofil, memecah air (fotolisis), menghasilkan ATP dan NADPH yang digunakan di siklus Calvin. Oksigen dilepaskan sebagai produk sampingan.', warna: '#f59e0b' },
        { judul: 'Siklus Calvin', emojiIkon: '🔄', deskripsi: 'CO₂ difiksasi oleh enzim RuBisCO, kemudian direduksi menggunakan ATP dan NADPH untuk membentuk molekul glukosa (G3P) di stroma kloroplas.', warna: '#0891b2' },
      ],
      audioDeskripsi:
        'Selamat belajar! Hari ini kita akan membahas fotosintesis, proses luar biasa yang dilakukan tumbuhan untuk menghasilkan makanannya sendiri. Fotosintesis adalah proses biokimia di mana tumbuhan, alga, dan beberapa bakteri mengubah energi cahaya matahari menjadi energi kimia berupa glukosa. Proses ini terjadi di dalam kloroplas, organel sel yang berwarna hijau karena mengandung pigmen klorofil. Klorofil inilah yang memberikan warna hijau pada daun tumbuhan. Dalam fotosintesis, tumbuhan membutuhkan tiga bahan utama: pertama, cahaya matahari sebagai sumber energi; kedua, air yang diserap akar dari dalam tanah; dan ketiga, karbon dioksida yang diserap dari udara melalui stomata di daun. Dari ketiga bahan ini, tumbuhan menghasilkan glukosa sebagai sumber energi dan oksigen yang dilepaskan ke udara, yang kita hirup setiap harinya. Proses fotosintesis terbagi menjadi dua tahap utama: reaksi terang dan reaksi gelap. Reaksi terang terjadi di membran tilakoid kloroplas, di mana energi cahaya digunakan untuk memecah molekul air dan menghasilkan energi kimia berupa ATP dan NADPH. Reaksi gelap, yang juga dikenal sebagai Siklus Calvin, terjadi di stroma kloroplas dan menggunakan energi dari reaksi terang untuk mengubah karbon dioksida menjadi glukosa.',
    };
  }

  if (t.includes('air') || t.includes('siklus') || t.includes('hujan') || t.includes('evaporasi')) {
    return {
      judul: 'Siklus Air: Perjalanan Air di Bumi',
      ringkasan:
        'Siklus air (siklus hidrologi) adalah proses kontinyu pergerakan air di, di atas, dan di bawah permukaan bumi. Digerakkan oleh energi matahari dan gravitasi, siklus ini melibatkan evaporasi, transpirasi, kondensasi, presipitasi, dan aliran permukaan. Siklus air berperan penting dalam mengatur iklim dan mendistribusikan air tawar di seluruh planet.',
      poinUtama: [
        'Evaporasi: air permukaan menguap menjadi uap air akibat panas matahari',
        'Transpirasi: pengeluaran uap air oleh tumbuhan melalui stomata',
        'Kondensasi: uap air mendingin dan membentuk awan (tetesan air kecil)',
        'Presipitasi: air jatuh kembali ke bumi sebagai hujan, salju, atau embun',
        'Infiltrasi: sebagian air meresap ke dalam tanah menjadi air tanah',
        'Run-off: aliran air permukaan menuju sungai, danau, dan laut',
      ],
      kuis: [
        {
          pertanyaan: 'Proses menguapnya air dari permukaan laut dan danau akibat panas matahari disebut?',
          opsi: ['Kondensasi', 'Presipitasi', 'Evaporasi', 'Infiltrasi'],
          jawabanBenar: 2,
          penjelasan: 'Evaporasi adalah proses perubahan air cair menjadi uap air akibat energi panas, terutama dari radiasi matahari.',
        },
        {
          pertanyaan: 'Proses pengeluaran uap air oleh tumbuhan melalui stomata disebut?',
          opsi: ['Evaporasi', 'Transpirasi', 'Respirasi', 'Kondensasi'],
          jawabanBenar: 1,
          penjelasan: 'Transpirasi adalah proses penguapan air dari jaringan tumbuhan, terutama melalui stomata di daun.',
        },
        {
          pertanyaan: 'Uap air di atmosfer berubah menjadi awan melalui proses?',
          opsi: ['Evaporasi', 'Presipitasi', 'Transpirasi', 'Kondensasi'],
          jawabanBenar: 3,
          penjelasan: 'Kondensasi terjadi saat uap air mendingin di atmosfer dan berubah menjadi tetesan air kecil yang membentuk awan.',
        },
        {
          pertanyaan: 'Air hujan yang meresap ke dalam tanah disebut proses?',
          opsi: ['Run-off', 'Evaporasi', 'Infiltrasi', 'Kondensasi'],
          jawabanBenar: 2,
          penjelasan: 'Infiltrasi adalah proses masuknya air hujan ke dalam lapisan tanah, membentuk cadangan air tanah yang penting.',
        },
        {
          pertanyaan: 'Energi utama yang menggerakkan siklus air adalah?',
          opsi: ['Gravitasi bumi', 'Energi matahari', 'Angin', 'Rotasi bumi'],
          jawabanBenar: 1,
          penjelasan: 'Energi matahari adalah penggerak utama siklus air dengan menyebabkan evaporasi dan transpirasi. Gravitasi berperan dalam presipitasi dan aliran permukaan.',
        },
      ],
      visualisasi: [
        { judul: 'Evaporasi & Transpirasi', emojiIkon: '💧', deskripsi: 'Air dari permukaan laut, danau, sungai menguap karena panas matahari. Tumbuhan juga melepas uap air melalui stomata. Keduanya menambah kelembaban udara.', warna: '#0ea5e9' },
        { judul: 'Kondensasi & Awan', emojiIkon: '☁️', deskripsi: 'Uap air naik ke atmosfer, mendingin, dan berkondensasi di sekitar partikel debu membentuk tetesan kecil yang berkumpul menjadi awan kumulus atau stratus.', warna: '#64748b' },
        { judul: 'Presipitasi & Run-off', emojiIkon: '🌧️', deskripsi: 'Tetesan air di awan bergabung hingga cukup berat lalu jatuh sebagai hujan atau salju. Air mengalir ke sungai (run-off) atau meresap ke tanah (infiltrasi).', warna: '#1d4ed8' },
      ],
      audioDeskripsi:
        'Mari kita pelajari perjalanan air di bumi yang terus berputar tanpa henti, yang kita kenal sebagai siklus air atau siklus hidrologi. Siklus air adalah proses alami yang terus-menerus memindahkan air dari permukaan bumi ke atmosfer dan kembali lagi. Proses ini digerakkan oleh dua kekuatan utama: energi panas matahari dan gravitasi bumi. Siklus dimulai dengan evaporasi, yaitu proses menguapnya air dari permukaan laut, danau, sungai, dan genangan air akibat panas matahari. Bersamaan dengan itu, tumbuhan juga melepaskan uap air melalui stomata daun dalam proses yang disebut transpirasi. Gabungan keduanya disebut evapotranspirasi. Uap air yang terkumpul di atmosfer kemudian mengalami kondensasi, yaitu perubahan dari gas menjadi tetesan air kecil saat udara mendingin di ketinggian. Tetesan ini berkumpul membentuk awan. Ketika tetesan air di awan semakin besar dan berat, mereka jatuh ke bumi sebagai presipitasi, yang bisa berupa hujan, salju, atau hujan es tergantung suhu. Air yang mencapai permukaan bumi kemudian terbagi: sebagian mengalir di permukaan sebagai run-off menuju sungai dan laut, sebagian meresap ke dalam tanah melalui infiltrasi menjadi air tanah, dan siklus pun berulang kembali.',
    };
  }

  if (t.includes('matematika') || t.includes('bilangan') || t.includes('pecahan')) {
    return {
      judul: 'Matematika: Konsep Bilangan dan Pecahan',
      ringkasan:
        'Bilangan adalah konsep fundamental matematika yang digunakan untuk menghitung, mengukur, dan mendeskripsikan kuantitas. Pecahan merupakan representasi bagian dari keseluruhan, dinyatakan sebagai perbandingan dua bilangan bulat. Pemahaman bilangan dan pecahan menjadi dasar penting untuk aljabar, geometri, dan matematika tingkat lanjut.',
      poinUtama: [
        'Bilangan bulat mencakup bilangan positif, negatif, dan nol',
        'Pecahan terdiri dari pembilang (numerator) dan penyebut (denominator)',
        'Pecahan senilai memiliki nilai yang sama meski bentuknya berbeda (1/2 = 2/4)',
        'Penjumlahan pecahan memerlukan penyebut yang sama (KPK)',
        'Perkalian pecahan: kalikan pembilang dengan pembilang, penyebut dengan penyebut',
        'Pecahan desimal adalah bentuk lain pecahan dengan penyebut kelipatan 10',
      ],
      kuis: [
        {
          pertanyaan: 'Berapakah hasil dari 1/2 + 1/3?',
          opsi: ['2/5', '2/6', '5/6', '3/6'],
          jawabanBenar: 2,
          penjelasan: 'KPK dari 2 dan 3 adalah 6. Maka 1/2 = 3/6 dan 1/3 = 2/6. Hasilnya 3/6 + 2/6 = 5/6.',
        },
        {
          pertanyaan: 'Pecahan manakah yang senilai dengan 2/4?',
          opsi: ['1/3', '3/6', '2/3', '4/6'],
          jawabanBenar: 1,
          penjelasan: '3/6 senilai dengan 2/4 karena keduanya sama dengan 1/2. Sederhanakan: 3÷3/6÷3 = 1/2, dan 2÷2/4÷2 = 1/2.',
        },
        {
          pertanyaan: 'Hasil dari 3/4 × 2/3 adalah?',
          opsi: ['5/7', '6/12', '1/2', '5/12'],
          jawabanBenar: 2,
          penjelasan: '3/4 × 2/3 = (3×2)/(4×3) = 6/12 = 1/2. Kalikan pembilang dengan pembilang dan penyebut dengan penyebut, lalu sederhanakan.',
        },
        {
          pertanyaan: 'Bilangan manakah yang BUKAN bilangan bulat?',
          opsi: ['-5', '0', '3/4', '100'],
          jawabanBenar: 2,
          penjelasan: '3/4 adalah pecahan, bukan bilangan bulat. Bilangan bulat adalah ..., -2, -1, 0, 1, 2, ... tanpa pecahan.',
        },
        {
          pertanyaan: 'Pecahan 0,75 sama dengan?',
          opsi: ['1/4', '3/5', '3/4', '7/5'],
          jawabanBenar: 2,
          penjelasan: '0,75 = 75/100 = 3/4. Ini karena 75÷25 = 3 dan 100÷25 = 4.',
        },
      ],
      visualisasi: [
        { judul: 'Garis Bilangan', emojiIkon: '📏', deskripsi: 'Garis bilangan menunjukkan urutan bilangan dari negatif hingga positif. Nol berada di tengah. Bilangan pecahan terletak di antara bilangan bulat.', warna: '#7c3aed' },
        { judul: 'Model Pecahan', emojiIkon: '🍕', deskripsi: 'Pecahan mudah dipahami dengan model lingkaran atau kotak yang dibagi sama rata. Pembilang = bagian yang diambil, Penyebut = total bagian keseluruhan.', warna: '#dc2626' },
        { judul: 'Operasi Pecahan', emojiIkon: '🔢', deskripsi: 'Untuk menjumlahkan pecahan, samakan penyebut dulu (cari KPK). Untuk mengalikan, langsung kalikan pembilang dan penyebut. Untuk membagi, kalikan dengan kebalikan pecahan kedua.', warna: '#059669' },
      ],
      audioDeskripsi:
        'Halo teman-teman! Kita akan belajar tentang bilangan dan pecahan yang merupakan fondasi penting dalam matematika. Bilangan adalah simbol yang kita gunakan untuk menghitung dan mengukur. Ada berbagai jenis bilangan: bilangan asli seperti 1, 2, 3 dan seterusnya; bilangan bulat yang mencakup bilangan negatif seperti negatif 3, negatif 2, negatif 1, nol, 1, 2, 3; dan bilangan pecahan yang menyatakan bagian dari suatu keseluruhan. Pecahan ditulis sebagai dua bilangan yang dipisahkan garis pecahan. Bilangan di atas garis disebut pembilang, yang menunjukkan berapa bagian yang kita ambil. Bilangan di bawah garis disebut penyebut, yang menunjukkan total bagian keseluruhan. Contohnya, 3 per 4 artinya kita mengambil 3 bagian dari 4 bagian yang sama. Untuk menjumlahkan pecahan yang penyebutnya berbeda, kita harus menyamakan penyebutnya terlebih dahulu dengan mencari KPK atau Kelipatan Persekutuan Terkecil. Misalnya, untuk menambahkan 1 per 2 dengan 1 per 3, KPK dari 2 dan 3 adalah 6, sehingga 1 per 2 menjadi 3 per 6 dan 1 per 3 menjadi 2 per 6, hasilnya adalah 5 per 6. Untuk mengalikan pecahan, cukup kalikan pembilang dengan pembilang dan penyebut dengan penyebut, kemudian sederhanakan hasilnya.',
    };
  }

  return {
    judul: 'Materi Pembelajaran',
    ringkasan:
      'Materi ini mencakup konsep-konsep penting yang perlu dipahami dengan baik. Setiap topik disajikan secara sistematis untuk memudahkan pemahaman. Pelajari setiap poin dengan seksama dan kerjakan kuis untuk mengukur pemahaman Anda.',
    poinUtama: [
      'Pahami konsep dasar sebelum melanjutkan ke topik lebih lanjut',
      'Buat catatan penting dari setiap bagian materi',
      'Hubungkan konsep baru dengan pengetahuan yang sudah dimiliki',
      'Latihan soal secara rutin untuk memperkuat pemahaman',
      'Diskusikan materi dengan teman atau pendamping jika ada kesulitan',
      'Evaluasi pemahaman diri secara berkala melalui kuis',
    ],
    kuis: [
      {
        pertanyaan: 'Apa langkah pertama yang sebaiknya dilakukan saat mempelajari materi baru?',
        opsi: ['Langsung mengerjakan kuis', 'Memahami konsep dasar terlebih dahulu', 'Menghafalkan semua poin', 'Mencari materi lain'],
        jawabanBenar: 1,
        penjelasan: 'Memahami konsep dasar adalah pondasi penting sebelum mempelajari topik yang lebih kompleks.',
      },
      {
        pertanyaan: 'Cara terbaik mengukur pemahaman materi adalah dengan?',
        opsi: ['Membaca berulang kali', 'Menyalin catatan', 'Mengerjakan soal latihan', 'Menonton video'],
        jawabanBenar: 2,
        penjelasan: 'Mengerjakan soal latihan atau kuis memaksa kita mengingat dan menerapkan materi, yang jauh lebih efektif dari membaca pasif.',
      },
      {
        pertanyaan: 'Apa manfaat berdiskusi tentang materi dengan orang lain?',
        opsi: ['Membuang waktu belajar', 'Memperdalam pemahaman dari berbagai sudut pandang', 'Tidak ada manfaatnya', 'Hanya untuk bersosialisasi'],
        jawabanBenar: 1,
        penjelasan: 'Diskusi memperdalam pemahaman karena kita menjelaskan dan mendengar perspektif berbeda, yang memperkuat ingatan.',
      },
      {
        pertanyaan: 'Mengapa membuat catatan penting selama belajar itu berguna?',
        opsi: ['Agar terlihat rajin', 'Membantu mengingat dan meringkas informasi kunci', 'Tidak ada kegunaannya', 'Hanya untuk dekorasi buku'],
        jawabanBenar: 1,
        penjelasan: 'Catatan membantu otak memproses dan menyimpan informasi secara aktif, serta menjadi referensi untuk ulangan.',
      },
      {
        pertanyaan: 'Apa yang harus dilakukan jika menemui konsep yang sulit dipahami?',
        opsi: ['Lewati saja', 'Berhenti belajar', 'Tanyakan kepada guru atau pendamping', 'Tidak perlu dipahami'],
        jawabanBenar: 2,
        penjelasan: 'Bertanya kepada guru atau pendamping adalah cara tepat untuk mendapat penjelasan yang disesuaikan dengan kebutuhan belajar.',
      },
    ],
    visualisasi: [
      { judul: 'Strategi Belajar Efektif', emojiIkon: '📚', deskripsi: 'Belajar efektif dimulai dari tujuan yang jelas, lingkungan kondusif, dan metode yang sesuai gaya belajar. Gunakan teknik Pomodoro: 25 menit fokus, 5 menit istirahat.', warna: '#1e40af' },
      { judul: 'Peta Konsep', emojiIkon: '🗺️', deskripsi: 'Peta konsep membantu visualisasi hubungan antar ide. Tulis topik utama di tengah, hubungkan dengan subtopik menggunakan garis dan kata penghubung.', warna: '#7c3aed' },
      { judul: 'Evaluasi Diri', emojiIkon: '✅', deskripsi: 'Lakukan evaluasi berkala dengan kuis mandiri. Identifikasi area yang masih lemah dan fokuskan ulasan pada bagian tersebut sebelum ujian.', warna: '#059669' },
    ],
    audioDeskripsi:
      'Selamat datang di sesi pembelajaran hari ini. Belajar adalah investasi terbaik yang bisa kita lakukan untuk diri sendiri. Dalam sesi ini, kita akan membahas materi pembelajaran yang telah disiapkan oleh pendamping Anda. Setiap materi dirancang untuk membantu Anda memahami konsep secara bertahap dan sistematis. Langkah pertama dalam belajar yang efektif adalah memahami tujuan pembelajaran. Apa yang ingin Anda capai setelah mempelajari materi ini? Dengan tujuan yang jelas, proses belajar akan lebih terarah dan efisien. Selanjutnya, bacalah ringkasan materi dengan seksama. Ringkasan memberikan gambaran besar tentang topik yang akan dipelajari. Kemudian, pelajari setiap poin utama secara mendalam. Jangan ragu untuk berhenti dan merefleksikan setiap konsep baru sebelum melanjutkan. Setelah memahami materi, kerjakan kuis yang tersedia. Kuis bukan hanya alat penilaian, tetapi juga cara efektif untuk memperkuat ingatan melalui proses recall atau mengingat kembali. Jika ada jawaban yang salah, baca penjelasannya dengan teliti untuk memahami konsep yang benar. Jangan lupa untuk menggunakan fitur visualisasi yang tersedia untuk memperkuat pemahaman visual Anda, dan fitur audio deskripsi ini untuk pembelajaran berbasis pendengaran.',
  };
}

// ── Color Presets ──────────────────────────────────────────────────────────────
const COLOR_PRESETS = ['#1e40af', '#7c3aed', '#059669', '#dc2626', '#d97706'];

type Step = 1 | 2 | 3;
type TabType = 'ringkasan' | 'kuis' | 'visualisasi' | 'audio';

export default function UploadMateriPage() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [result, setResult] = useState<AIResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ringkasan');
  const [toast, setToast] = useState('');
  const [savedMaterialId, setSavedMaterialId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State untuk upload video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSaved, setVideoSaved] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const PROCESSING_MSGS = [
    'Membaca konten materi...',
    'Menganalisis poin penting...',
    'Membuat soal kuis...',
    'Menyiapkan visualisasi...',
    'Membuat narasi audio...',
    'Hampir selesai...',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.txt') || f.name.endsWith('.pdf'))) setFile(f);
  };

  const handleProcess = useCallback(async () => {
    setStep(2);
    let msgIdx = 0;
    setProcessingMsg(PROCESSING_MSGS[0]);

    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % PROCESSING_MSGS.length;
      setProcessingMsg(PROCESSING_MSGS[msgIdx]);
    }, 1500);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (pastedText) formData.append('text', pastedText);

      const res = await fetch('/api/generate-materi', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        setStep(1);
        alert(data.error || 'Gagal memproses materi. Coba lagi.');
        return;
      }

      setResult(data.result);
      setSavedMaterialId(data.materialId || null);
      setStep(3);
    } catch {
      clearInterval(interval);
      setStep(1);
      alert('Gagal terhubung ke server. Pastikan koneksi internet stabil.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, pastedText]);

  const handleSaveLibrary = () => {
    if (!result) return;
    if (savedMaterialId) {
      setToast('Materi sudah tersimpan ke database! Siswa bisa langsung mengaksesnya.');
    } else {
      setToast('Materi sedang diproses, coba refresh halaman materi.');
    }
    setTimeout(() => setToast(''), 4000);
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPastedText('');
    setResult(null);
    setActiveTab('ringkasan');
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !videoTitle.trim()) return;
    setVideoUploading(true);
    setVideoProgress(10);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Belum login'); setVideoUploading(false); return; }

      // Upload ke Supabase Storage
      const ext = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      setVideoProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        alert('Gagal upload video: ' + uploadError.message);
        setVideoUploading(false);
        return;
      }
      setVideoProgress(70);

      // Ambil public URL
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      setVideoProgress(85);

      // Simpan ke tabel materials
      const { data: savedMaterial, error: matError } = await supabase
        .from('materials')
        .insert({
          judul: videoTitle.trim(),
          mata_pelajaran: 'Video',
          deskripsi: `Video materi: ${videoTitle.trim()}`,
          mode: 'visual',
          thumbnail_color: '#7C3AED',
          thumbnail_emoji: '🎬',
          video_url: publicUrl,
          created_by: user.id,
        })
        .select()
        .single();

      if (matError) {
        alert('Video terupload tapi gagal disimpan ke database: ' + matError.message);
        setVideoUploading(false);
        return;
      }

      setVideoProgress(100);
      setVideoUrl(publicUrl);
      setVideoSaved(true);
      setVideoUploading(false);
      setToast(`Video "${videoTitle}" berhasil diupload dan tersimpan! Siswa bisa langsung menonton.`);
      setTimeout(() => setToast(''), 5000);
    } catch (err: any) {
      alert('Error: ' + err.message);
      setVideoUploading(false);
    }
  };

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  if (step === 1) {
    const hasContent = !!file || pastedText.trim().length > 0;
    return (
      <div className="flex min-h-screen bg-slate-50">
        <TeacherSidebar />
        <main id="main-content" className="flex-1 sm:ml-60 pb-8">
          <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-700" />
            <h1 className="font-bold text-slate-900">Upload Materi AI</h1>
          </div>

          <div className="p-4 max-w-2xl mx-auto space-y-5">
            {/* Drag & Drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all',
                dragging ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/50'
              )}
              role="button"
              aria-label="Area upload file materi, klik atau seret file ke sini"
            >
              {file ? (
                <div className="flex items-center gap-3">
                  {file.name.endsWith('.pdf') ? (
                    <File size={36} className="text-red-500" />
                  ) : (
                    <FileText size={36} className="text-blue-600" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-4 p-1.5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Hapus file yang dipilih"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={36} className="text-blue-400 mb-3" />
                  <p className="font-semibold text-slate-700">Seret file ke sini atau klik untuk pilih</p>
                  <p className="text-sm text-slate-400 mt-1">Mendukung .txt dan .pdf</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Pilih file materi"
            />

            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <div className="flex-1 border-t border-slate-200" />
              <span>atau</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <div>
              <label htmlFor="paste-text" className="block text-sm font-medium text-slate-700 mb-1.5">
                Ketik atau paste teks materi
              </label>
              <textarea
                id="paste-text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste atau ketik konten materi di sini... (mis: 'Fotosintesis adalah proses tumbuhan membuat makanan...')"
                rows={5}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                aria-label="Teks materi untuk diproses AI"
              />
            </div>

            <button
              onClick={handleProcess}
              disabled={!hasContent}
              className={cn(
                'w-full h-13 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                hasContent
                  ? 'bg-blue-800 text-white hover:bg-blue-700 shadow-lg shadow-blue-800/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
              aria-label="Proses materi dengan AI"
              aria-disabled={!hasContent}
            >
              <Sparkles size={18} />
              ✨ Proses dengan AI
            </button>

            {/* ── Section Upload Video ── */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <Video size={18} className="text-purple-600" />
                <h2 className="font-semibold text-slate-900">Upload Video Materi</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Upload video langsung tanpa perlu diproses AI. Video akan tersimpan dan bisa ditonton siswa kapan saja.
              </p>

              {videoSaved ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Video berhasil diupload!</p>
                    <p className="text-xs text-emerald-600 truncate max-w-xs">{videoTitle}</p>
                  </div>
                  <button onClick={() => { setVideoFile(null); setVideoSaved(false); setVideoUrl(null); setVideoTitle(''); setVideoProgress(0); }}
                    className="ml-auto text-xs text-emerald-600 hover:underline">
                    Upload lagi
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Video</label>
                    <input
                      type="text"
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      placeholder="Contoh: Penjelasan Ekosistem Laut"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 flex flex-col items-center cursor-pointer transition-all',
                      videoFile ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50'
                    )}
                  >
                    {videoFile ? (
                      <div className="flex items-center gap-3 w-full">
                        <Video size={28} className="text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{videoFile.name}</p>
                          <p className="text-xs text-slate-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setVideoFile(null); }}
                          className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Video size={28} className="text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-700">Klik untuk pilih video</p>
                        <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — Maks 500MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }}
                    className="sr-only"
                  />

                  {videoUploading && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Mengupload video...</span>
                        <span>{videoProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${videoProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUploadVideo}
                    disabled={!videoFile || !videoTitle.trim() || videoUploading}
                    className={cn(
                      'w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                      videoFile && videoTitle.trim() && !videoUploading
                        ? 'bg-purple-700 text-white hover:bg-purple-600'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {videoUploading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengupload...</>
                    ) : (
                      <><Video size={15} />Upload Video</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
        <AccessibilityBar />
      </div>
    );
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-blue-200 border-t-blue-700 animate-spin" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">AI Sedang Memproses</h2>
            <p className="text-sm text-blue-700 font-medium animate-pulse" aria-live="polite" aria-atomic="true">
              {processingMsg}
            </p>
            <p className="text-xs text-slate-400 mt-3">Harap tunggu sebentar...</p>
          </div>
        </main>
        <AccessibilityBar />
      </div>
    );
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  if (!result) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-8">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <Check size={18} className="text-emerald-600" />
          <h1 className="font-bold text-slate-900">Hasil Pemrosesan AI</h1>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto" role="tablist" aria-label="Tab hasil AI">
            {([
              { id: 'ringkasan', label: 'Ringkasan' },
              { id: 'kuis', label: 'Kuis (5 Soal)' },
              { id: 'visualisasi', label: 'Visualisasi' },
              { id: 'audio', label: 'Audio Deskripsi' },
            ] as { id: TabType; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={activeTab === t.id}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === t.id
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Ringkasan ── */}
          {activeTab === 'ringkasan' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Judul Materi</label>
                <h2
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setResult({ ...result, judul: e.currentTarget.textContent || '' })}
                  className="text-xl font-bold text-slate-900 outline-none border-b-2 border-transparent focus:border-blue-400 pb-1 rounded"
                  aria-label="Judul materi, dapat diedit"
                >
                  {result.judul}
                </h2>
              </div>

              <div>
                <label htmlFor="ringkasan-text" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ringkasan</label>
                <textarea
                  id="ringkasan-text"
                  value={result.ringkasan}
                  onChange={(e) => setResult({ ...result, ringkasan: e.target.value })}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  aria-label="Ringkasan materi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Poin Utama</label>
                <div className="space-y-2">
                  {result.poinUtama.map((poin, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={poin}
                        onChange={(e) => {
                          const updated = [...result.poinUtama];
                          updated[idx] = e.target.value;
                          setResult({ ...result, poinUtama: updated });
                        }}
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Poin utama ke-${idx + 1}`}
                      />
                      <button
                        onClick={() => setResult({ ...result, poinUtama: result.poinUtama.filter((_, i) => i !== idx) })}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        aria-label={`Hapus poin ke-${idx + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setResult({ ...result, poinUtama: [...result.poinUtama, ''] })}
                    className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 font-medium mt-1"
                    aria-label="Tambah poin utama baru"
                  >
                    <Plus size={16} />
                    Tambah Poin
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Kuis ── */}
          {activeTab === 'kuis' && (
            <div className="space-y-4">
              {result.kuis.map((soal, soalIdx) => (
                <div key={soalIdx} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">Soal {soalIdx + 1}</span>
                    <button
                      onClick={() => setResult({ ...result, kuis: result.kuis.filter((_, i) => i !== soalIdx) })}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                      aria-label={`Hapus soal ${soalIdx + 1}`}
                    >
                      <Trash2 size={14} /> Hapus Soal
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Pertanyaan</label>
                    <textarea
                      value={soal.pertanyaan}
                      onChange={(e) => {
                        const updated = [...result.kuis];
                        updated[soalIdx] = { ...updated[soalIdx], pertanyaan: e.target.value };
                        setResult({ ...result, kuis: updated });
                      }}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      aria-label={`Pertanyaan soal ${soalIdx + 1}`}
                    />
                  </div>

                  <div className="space-y-2">
                    {soal.opsi.map((opsi, opsiIdx) => (
                      <div key={opsiIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`benar-${soalIdx}`}
                          checked={soal.jawabanBenar === opsiIdx}
                          onChange={() => {
                            const updated = [...result.kuis];
                            updated[soalIdx] = { ...updated[soalIdx], jawabanBenar: opsiIdx };
                            setResult({ ...result, kuis: updated });
                          }}
                          className="accent-blue-700"
                          aria-label={`Pilih opsi ${String.fromCharCode(65 + opsiIdx)} sebagai jawaban benar`}
                        />
                        <span className="text-xs font-bold text-slate-400 w-4">{String.fromCharCode(65 + opsiIdx)}.</span>
                        <input
                          type="text"
                          value={opsi}
                          onChange={(e) => {
                            const updated = [...result.kuis];
                            const newOpsi = [...updated[soalIdx].opsi] as [string, string, string, string];
                            newOpsi[opsiIdx] = e.target.value;
                            updated[soalIdx] = { ...updated[soalIdx], opsi: newOpsi };
                            setResult({ ...result, kuis: updated });
                          }}
                          className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Teks opsi ${String.fromCharCode(65 + opsiIdx)} soal ${soalIdx + 1}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Penjelasan Jawaban</label>
                    <textarea
                      value={soal.penjelasan}
                      onChange={(e) => {
                        const updated = [...result.kuis];
                        updated[soalIdx] = { ...updated[soalIdx], penjelasan: e.target.value };
                        setResult({ ...result, kuis: updated });
                      }}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      aria-label={`Penjelasan jawaban soal ${soalIdx + 1}`}
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => setResult({
                  ...result,
                  kuis: [...result.kuis, {
                    pertanyaan: '',
                    opsi: ['', '', '', ''],
                    jawabanBenar: 0,
                    penjelasan: '',
                  }],
                })}
                className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-sm text-blue-700 font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                aria-label="Tambah soal baru"
              >
                <Plus size={16} /> Tambah Soal
              </button>
            </div>
          )}

          {/* ── Tab: Visualisasi ── */}
          {activeTab === 'visualisasi' && (
            <div className="space-y-4">
              {result.visualisasi.map((vis, visIdx) => (
                <div key={visIdx} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  {/* Preview */}
                  <div
                    className="w-full h-24 rounded-xl flex items-center justify-center gap-3 mb-1"
                    style={{ backgroundColor: vis.warna + '20' }}
                    aria-hidden="true"
                  >
                    <span className="text-4xl">{vis.emojiIkon}</span>
                    <span className="text-lg font-bold" style={{ color: vis.warna }}>{vis.judul || 'Preview'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Emoji Ikon</label>
                      <input
                        type="text"
                        value={vis.emojiIkon}
                        onChange={(e) => {
                          const updated = [...result.visualisasi];
                          updated[visIdx] = { ...updated[visIdx], emojiIkon: e.target.value };
                          setResult({ ...result, visualisasi: updated });
                        }}
                        className="w-16 h-9 px-2 rounded-lg border border-slate-200 text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Emoji ikon visualisasi"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Judul</label>
                      <input
                        type="text"
                        value={vis.judul}
                        onChange={(e) => {
                          const updated = [...result.visualisasi];
                          updated[visIdx] = { ...updated[visIdx], judul: e.target.value };
                          setResult({ ...result, visualisasi: updated });
                        }}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Judul visualisasi"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Deskripsi</label>
                    <textarea
                      value={vis.deskripsi}
                      onChange={(e) => {
                        const updated = [...result.visualisasi];
                        updated[visIdx] = { ...updated[visIdx], deskripsi: e.target.value };
                        setResult({ ...result, visualisasi: updated });
                      }}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      aria-label="Deskripsi visualisasi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Warna</label>
                    <div className="flex gap-2">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const updated = [...result.visualisasi];
                            updated[visIdx] = { ...updated[visIdx], warna: c };
                            setResult({ ...result, visualisasi: updated });
                          }}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            vis.warna === c ? 'border-slate-800 scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Pilih warna ${c}`}
                          aria-pressed={vis.warna === c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setResult({
                  ...result,
                  visualisasi: [...result.visualisasi, { judul: '', emojiIkon: '📌', deskripsi: '', warna: '#1e40af' }],
                })}
                className="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-sm text-blue-700 font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                aria-label="Tambah visualisasi baru"
              >
                <Plus size={16} /> Tambah Visualisasi
              </button>
            </div>
          )}

          {/* ── Tab: Audio ── */}
          {activeTab === 'audio' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label htmlFor="audio-text" className="block text-sm font-semibold text-slate-700 mb-2">Teks Narasi Audio</label>
                <textarea
                  id="audio-text"
                  value={result.audioDeskripsi}
                  onChange={(e) => setResult({ ...result, audioDeskripsi: e.target.value })}
                  rows={8}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  aria-label="Teks narasi untuk audio deskripsi"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const utter = new SpeechSynthesisUtterance(result.audioDeskripsi);
                      utter.lang = 'id-ID';
                      window.speechSynthesis.speak(utter);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  aria-label="Putar audio narasi"
                >
                  <Play size={16} /> Putar
                </button>
                <button
                  onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                  aria-label="Stop audio narasi"
                >
                  <Square size={16} /> Stop
                </button>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>ℹ️</span>
                Audio ini akan diputarkan untuk siswa tunanetra
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveLibrary}
              className="flex-1 py-3 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              aria-label="Simpan materi ke library"
            >
              <Check size={16} /> Simpan ke Library
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              aria-label="Reset dan kembali ke step 1"
            >
              Reset
            </button>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-medium flex items-center gap-2 z-50 animate-in slide-in-from-bottom-4"
          role="status"
          aria-live="polite"
        >
          <Check size={16} /> {toast}
        </div>
      )}

      <AccessibilityBar />
    </div>
  );
}