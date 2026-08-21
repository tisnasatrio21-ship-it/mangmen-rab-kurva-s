import { GoogleGenAI, Type } from '@google/genai';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * 1. AI S-Curve & Schedule Deviation Analysis
 */
export async function analyzeSCurveRisk(payload: {
  projectName: string;
  contractValue: number;
  totalPeriods: number;
  currentPeriod: number;
  plannedCumulative: number;
  actualCumulative: number;
  deviation: number;
  spi: number;
  cpi?: number;
  criticalItems: Array<{
    code: string;
    description: string;
    weightPercentage: number;
    realizationPercentage: number;
    deviation: number;
  }>;
  recentDailyNotes?: string[];
}) {
  const ai = getAiClient();

  const prompt = `Anda adalah seorang Senior Project Manager & Ahli Teknik Sipil Konstruksi bersertifikasi (PMP / Ahli Manajemen Proyek Utama).
Lakukan audit dan analisis risiko komprehensif terhadap Kurva S dan progres proyek berikut:

INFORMASI PROYEK:
- Nama Proyek: ${payload.projectName}
- Total Nilai Kontrak: Rp ${payload.contractValue.toLocaleString('id-ID')}
- Total Durasi: ${payload.totalPeriods} Minggu
- Posisi Evaluasi: Minggu Ke-${payload.currentPeriod}
- Rencana Kumulatif (Target): ${payload.plannedCumulative.toFixed(2)}%
- Realisasi Kumulatif (Fisik Aktual): ${payload.actualCumulative.toFixed(2)}%
- Deviasi Progres: ${payload.deviation >= 0 ? '+' : ''}${payload.deviation.toFixed(2)}%
- Schedule Performance Index (SPI): ${payload.spi.toFixed(3)} ${payload.spi < 1 ? '(Terlambat)' : payload.spi > 1 ? '(Lebih Cepat)' : '(On Track)'}

ITEM PEKERJAAN DENGAN DEVIASI KRITIS:
${payload.criticalItems.length > 0 ? payload.criticalItems.map((it) => `- [${it.code}] ${it.description} (Bobot: ${it.weightPercentage.toFixed(2)}%, Realisasi: ${it.realizationPercentage.toFixed(2)}%, Deviasi: ${it.deviation.toFixed(2)}%)`).join('\n') : '- Tidak ada deviasi kritis khusus'}

CATATAN KENDALA / LAPANGAN TERKINI:
${payload.recentDailyNotes && payload.recentDailyNotes.length > 0 ? payload.recentDailyNotes.map((n) => `- ${n}`).join('\n') : '- Belum ada catatan kendala'}

Berikan output dalam format JSON valid dengan skema berikut:
{
  "healthStatus": "KRITIS" | "WASPADA" | "ON_TRACK" | "AHEAD",
  "statusLabel": "ringkasan 2-4 kata status proyek",
  "executiveSummary": "paragraf ringkasan eksekutif 3-4 kalimat",
  "rootCauseAnalysis": ["akar penyebab 1", "akar penyebab 2", "akar penyebab 3"],
  "catchUpPlan": [
    {
      "step": 1,
      "action": "Tindakan konkret percepatan",
      "targetItem": "Kode atau uraian item pekerjaan sasaran",
      "impact": "Estimasi dampak terhadap penambahan progres %",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "resourceRecommendations": {
    "manpower": "Rekomendasi penambahan / penyesuaian tukang & pekerja",
    "equipment": "Rekomendasi alat berat / peralatan penunjang",
    "material": "Rekomendasi suplai / jadwal order material",
    "scheduleShift": "Rekomendasi shift kerja / lembur terarah"
  },
  "projectedCompletion": "Prakiraan potensi keterlambatan hari/minggu jika tanpa mitigasi"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: 'Anda adalah konsultan manajemen proyek konstruksi profesional. Berikan respon dalam Bahasa Indonesia formal, praktis, dan berbasis data teknis konstruksi nyata.',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse Gemini SCurve analysis JSON:', text);
    throw new Error('Format respon AI tidak valid.');
  }
}

/**
 * 2. AI Executive Summary & Weekly Report Generator
 */
export async function generateExecutiveReport(payload: {
  projectName: string;
  periodNumber: number;
  dateRange: string;
  plannedCumulative: number;
  actualCumulative: number;
  deviation: number;
  completedItemsThisWeek: string[];
  activeItemsThisWeek: string[];
  weatherSummary?: string;
  workerSummary?: string;
  siteNotes?: string[];
}) {
  const ai = getAiClient();

  const prompt = `Buatkan Narasi Laporan Mingguan Resmi (Executive Progress Summary) untuk rapat owner/klien dan lampiran Laporan Proyek:

DATA MINGGU KE-${payload.periodNumber} (${payload.dateRange}):
- Proyek: ${payload.projectName}
- Rencana Kumulatif: ${payload.plannedCumulative.toFixed(2)}%
- Realisasi Kumulatif: ${payload.actualCumulative.toFixed(2)}%
- Deviasi: ${payload.deviation >= 0 ? '+' : ''}${payload.deviation.toFixed(2)}%
- Pekerjaan Selesai / Signifikan Minggu Ini: ${payload.completedItemsThisWeek.join(', ') || 'Dalam proses bertahap'}
- Pekerjaan Sedang Berlangsung: ${payload.activeItemsThisWeek.join(', ') || 'Sesuai jadwal'}
- Ringkasan Cuaca: ${payload.weatherSummary || 'Cerah & Berawan'}
- Tenaga Kerja Rata-rata: ${payload.workerSummary || 'Sesuai kapasitas harian'}
- Catatan Pengawas: ${payload.siteNotes?.join('; ') || 'Kegiatan berlangsung aman dan terkendali'}

Buatkan dokumen narasi resmi dengan struktur:
1. Ringkasan Progres Fisik & Status Kurva S
2. Uraian Capaian Prestasi Kerja Minggu Ini
3. Hambatan / Kendala Lapangan & Mitigasi
4. Rencana Kerja Minggu Berikutnya (Next Week Plan)
5. Kesimpulan & Rekomendasi untuk Direksi / Owner

Tulis dalam Bahasa Indonesia baku standar laporan konsultan pengawas konstruksi profesional.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      systemInstruction: 'Anda adalah Project Director penyusun laporan berkala konstruksi untuk instansi pemerintah dan swasta ternama.',
    },
  });

  return {
    markdownReport: response.text || 'Gagal menghasilkan narasi laporan.',
  };
}

/**
 * 3. AI RAB Document / Table / Text Parser (Multimodal & Text)
 */
export async function parseRabWithGemini(payload: {
  rawText?: string;
  imageBase64?: string;
  mimeType?: string;
}) {
  const ai = getAiClient();

  const prompt = `Ekstraksi dan standarisasi seluruh item Rencana Anggaran Biaya (RAB) / Bill of Quantities (BQ) berikut ke dalam array JSON bersih.

Ketentuan Aturan Ekstraksi:
1. "code": Kode hierarki pekerjaan seperti 1.1, 1.2, A.1, dll. Jika tidak ada di dokumen, buatkan urutan angka seperti "1.1", "1.2".
2. "category": Kelompok pekerjaan utama (misal: "Pekerjaan Persiapan", "Pekerjaan Struktur & Beton", "Pekerjaan Arsitektur / Dinding", "Pekerjaan MEP", "Pekerjaan Finishing").
3. "description": Uraian pekerjaan lengkap, spesifikasi, dan dimensi.
4. "volume": Angka volume desimal positif (harus bertipe number, misal 24.5 bukan string).
5. "unit": Satuan pekerjaan standar (m3, m2, m', kg, bh, ls, ttk, unit, dll).
6. "unitPrice": Harga satuan dalam Rupiah (harus bertipe number tanpa titik/Rp, misal 150000).

Contoh JSON Output:
{
  "projectNameDetected": "Nama proyek jika tertera di dokumen (atau string kosong)",
  "contractorDetected": "Nama kontraktor jika tertera (atau string kosong)",
  "items": [
    {
      "code": "1.1",
      "category": "Pekerjaan Persiapan",
      "description": "Pembersihan lapangan dan perataan tanah",
      "volume": 120,
      "unit": "m2",
      "unitPrice": 25000
    }
  ],
  "totalItemsExtracted": 1
}`;

  let contents: any;
  if (payload.imageBase64 && payload.mimeType) {
    contents = {
      parts: [
        {
          inlineData: {
            data: payload.imageBase64,
            mimeType: payload.mimeType,
          },
        },
        { text: `${prompt}\n\nEkstrak seluruh baris tabel dari gambar dokumen RAB di atas.` },
      ],
    };
  } else if (payload.rawText) {
    contents = `${prompt}\n\nBERIKUT ADALAH TEKS / DATA MENTAH RAB:\n"""\n${payload.rawText}\n"""`;
  } else {
    throw new Error('Data teks atau gambar RAB harus disertakan.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: 'Anda adalah Senior Cost Estimator (QS) spesialis konversi dokumen BQ konstruksi ke database digital.',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse Gemini RAB parser output:', text);
    throw new Error('Gagal memproses struktur data RAB dari dokumen.');
  }
}

/**
 * 4. AI RAB Sanity Check & Cost Auditing
 */
export async function auditRabItems(payload: {
  projectName: string;
  totalContractValue: number;
  items: Array<{
    code: string;
    category: string;
    description: string;
    volume: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    weightPercentage: number;
  }>;
}) {
  const ai = getAiClient();

  const prompt = `Sebagai Auditor Ahli Kuantitas & Harga Satuan Pekerjaan (QS / Quality & Cost Auditor), lakukan evaluasi menyeluruh (Sanity Check & Risk Audit) terhadap susunan Master RAB berikut:

INFORMASI PROYEK:
- Nama Proyek: ${payload.projectName}
- Total Nilai Anggaran: Rp ${payload.totalContractValue.toLocaleString('id-ID')}
- Total Jumlah Item: ${payload.items.length} item

DAFTAR ITEM PEKERJAAN:
${JSON.stringify(
  payload.items.map((i) => ({
    c: i.code,
    cat: i.category,
    desc: i.description,
    vol: i.volume,
    u: i.unit,
    rate: i.unitPrice,
    tot: i.totalPrice,
    pct: i.weightPercentage,
  })),
  null,
  2
)}

TUGAS AUDIT:
1. Identifikasi apakah ada satuan yang tidak lazim (misal beton bertulang diukur meter lari m', bukan m3).
2. Periksa apakah ada harga satuan yang janggal / ekstrem (terlalu murah atau terlalu mahal dari standar pasar AHSP Indonesia).
3. Identifikasi apakah ada item pekerjaan berbobot sangat dominan (>25%) yang menjadi risiko tunggal.
4. Identifikasi apakah ada pekerjaan struktural yang hilang/terlewat (misal ada beton tapi tidak ada besi/bekisting, atau ada plesteran tapi tidak ada acian).
5. Berikan skor kesehatan kelayakan RAB (0 - 100) dan rekomendasi perbaikan.

Berikan output dalam format JSON valid:
{
  "rabHealthScore": 85,
  "overallVerdict": "SEHAT" | "PERLU_REVISI" | "BERISIKO_TINGGI",
  "summary": "Ringkasan hasil audit 2-3 kalimat",
  "findings": [
    {
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "itemCode": "Kode item bersangkutan (atau ALL)",
      "issue": "Uraian temuan masalah teknis/harga/satuan",
      "recommendation": "Solusi perbaikan yang disarankan"
    }
  ],
  "dominantItems": [
    {
      "code": "Kode",
      "description": "Uraian",
      "weightPercentage": 0,
      "riskLevel": "Tinggi/Sedang"
    }
  ],
  "missingScopeSuggestions": ["Usulan pekerjaan terkait yang mungkin belum tercatat jika ada"]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: 'Anda adalah Senior Cost Controller & Quantity Surveyor spesialis proyek konstruksi.',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse Gemini RAB Audit output:', text);
    throw new Error('Gagal membaca hasil audit AI.');
  }
}

/**
 * 5. AI Construction Project Consultant Chat
 */
export async function chatWithProjectAi(payload: {
  projectContext: any;
  userMessage: string;
  chatHistory?: Array<{ role: 'user' | 'model'; text: string }>;
}) {
  const ai = getAiClient();

  const systemInstruction = `Anda adalah "Asisten AI Konsultan Proyek Konstruksi" yang cerdas, teliti, dan profesional.
Anda memiliki akses ke data proyek pengguna saat ini:
${JSON.stringify(payload.projectContext, null, 2)}

Prinsip Anda:
1. Jawab pertanyaan teknis manajemen proyek, kurva S, perhitungan bobot, volume, percepatan pekerjaan (crashing/fast-tracking), hukum kontrak konstruksi, dan metode kerja lapangan.
2. Gunakan Bahasa Indonesia yang lugas, terstruktur, ramah, dan solutif.
3. Selalu kaitkan jawaban dengan data nyata proyek pengguna di atas jika relevan (seperti menyebutkan nama proyek, item pekerjaan spesifik, deviasi mingguan, atau nilai kontrak).`;

  const contents: any[] = [];
  if (payload.chatHistory && payload.chatHistory.length > 0) {
    payload.chatHistory.forEach((h) => {
      contents.push({
        role: h.role,
        parts: [{ text: h.text }],
      });
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: payload.userMessage }],
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents,
    config: {
      systemInstruction,
    },
  });

  return {
    reply: response.text || 'Maaf, saya tidak dapat merespon saat ini.',
  };
}
