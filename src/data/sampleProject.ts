import { Project, RabItem } from '../types/project';

const initialRabItemsRaw = [
  // 1. Pekerjaan Persiapan
  { id: 'item-1', code: '1.1', category: 'I. Pekerjaan Persiapan', description: 'Pembersihan Lahan, Pemagaran & Pengukuran Site', volume: 280, unit: 'm2', unitPrice: 45000 },
  { id: 'item-2', code: '1.2', category: 'I. Pekerjaan Persiapan', description: 'Direksi Keet, Gudang Bahan & Papan Nama Proyek', volume: 1, unit: 'ls', unitPrice: 28500000 },
  { id: 'item-3', code: '1.3', category: 'I. Pekerjaan Persiapan', description: 'Pemasangan Bowplank Kayu Borneo', volume: 85, unit: 'm1', unitPrice: 110000 },

  // 2. Pekerjaan Tanah & Pondasi
  { id: 'item-4', code: '2.1', category: 'II. Pekerjaan Tanah & Pondasi', description: 'Galian Tanah Pondasi Footplat & Batu Kali', volume: 165, unit: 'm3', unitPrice: 105000 },
  { id: 'item-5', code: '2.2', category: 'II. Pekerjaan Tanah & Pondasi', description: 'Urugan Pasir Bawah Pondasi t = 10 cm', volume: 22, unit: 'm3', unitPrice: 260000 },
  { id: 'item-6', code: '2.3', category: 'II. Pekerjaan Tanah & Pondasi', description: 'Pondasi Batu Kali Belah 1:4', volume: 95, unit: 'm3', unitPrice: 920000 },
  { id: 'item-7', code: '2.4', category: 'II. Pekerjaan Tanah & Pondasi', description: 'Pondasi Footplat Beton K-300 & Pemancangan Mini Pile', volume: 38, unit: 'm3', unitPrice: 5800000 },

  // 3. Pekerjaan Struktur Beton & Baja
  { id: 'item-8', code: '3.1', category: 'III. Pekerjaan Struktur', description: 'Beton Sloof 20/30 K-250 Bertulang', volume: 28, unit: 'm3', unitPrice: 4650000 },
  { id: 'item-9', code: '3.2', category: 'III. Pekerjaan Struktur', description: 'Beton Kolom Utama K-300 Bertulang (Lantai 1-3)', volume: 45, unit: 'm3', unitPrice: 5200000 },
  { id: 'item-10', code: '3.3', category: 'III. Pekerjaan Struktur', description: 'Beton Balok & Pelat Lantai 2 & 3 K-275 Bertulang', volume: 92, unit: 'm3', unitPrice: 5400000 },
  { id: 'item-11', code: '3.4', category: 'III. Pekerjaan Struktur', description: 'Rangka Atap Baja Ringan & Penutup Spandek', volume: 210, unit: 'm2', unitPrice: 380000 },

  // 4. Pekerjaan Arsitektur & Finishing
  { id: 'item-12', code: '4.1', category: 'IV. Pekerjaan Dinding & Finishing', description: 'Pasangan Dinding Bata Ringan Hebel t=10cm', volume: 540, unit: 'm2', unitPrice: 155000 },
  { id: 'item-13', code: '4.2', category: 'IV. Pekerjaan Dinding & Finishing', description: 'Plesteran + Acian Dinding 1:4', volume: 1080, unit: 'm2', unitPrice: 92000 },
  { id: 'item-14', code: '4.3', category: 'IV. Pekerjaan Dinding & Finishing', description: 'Lantai Homogeneous Tile 60x60 Polished', volume: 420, unit: 'm2', unitPrice: 285000 },
  { id: 'item-15', code: '4.4', category: 'IV. Pekerjaan Dinding & Finishing', description: 'Pengecatan Dinding Exterior Weather Shield & Interior', volume: 1080, unit: 'm2', unitPrice: 48000 },

  // 5. Pekerjaan MEP & Sanitari
  { id: 'item-16', code: '5.1', category: 'V. Pekerjaan MEP & Sanitari', description: 'Instalasi Listrik 3 Phase, Panel Utama & 75 Titik Lampu', volume: 1, unit: 'ls', unitPrice: 65000000 },
  { id: 'item-17', code: '5.2', category: 'V. Pekerjaan MEP & Sanitari', description: 'Instalasi Pipa Air Bersih, Air Kotor & Bio Septic Tank', volume: 1, unit: 'ls', unitPrice: 48000000 },
];

// Calculate contract value and item weights
const totalContractVal = initialRabItemsRaw.reduce((acc, i) => acc + (i.volume * i.unitPrice), 0);

const sampleRabItems: RabItem[] = initialRabItemsRaw.map(item => {
  const totalPrice = item.volume * item.unitPrice;
  const weightPercentage = Number(((totalPrice / totalContractVal) * 100).toFixed(4));
  return {
    ...item,
    totalPrice,
    weightPercentage,
  };
});

// Sample Planned Period Distribution across 12 Weeks
const samplePlannedDistributions = [
  // Item 1: Persiapan - Weeks 1-2
  { rabItemId: 'item-1', startPeriod: 1, endPeriod: 2, periodWeights: { 1: sampleRabItems[0].weightPercentage * 0.6, 2: sampleRabItems[0].weightPercentage * 0.4 } },
  // Item 2: Direksi keet - Week 1
  { rabItemId: 'item-2', startPeriod: 1, endPeriod: 2, periodWeights: { 1: sampleRabItems[1].weightPercentage * 0.7, 2: sampleRabItems[1].weightPercentage * 0.3 } },
  // Item 3: Bowplank - Weeks 1-2
  { rabItemId: 'item-3', startPeriod: 1, endPeriod: 2, periodWeights: { 1: sampleRabItems[2].weightPercentage * 0.5, 2: sampleRabItems[2].weightPercentage * 0.5 } },

  // Item 4: Galian tanah - Weeks 2-3
  { rabItemId: 'item-4', startPeriod: 2, endPeriod: 3, periodWeights: { 2: sampleRabItems[3].weightPercentage * 0.6, 3: sampleRabItems[3].weightPercentage * 0.4 } },
  // Item 5: Urugan pasir - Week 3
  { rabItemId: 'item-5', startPeriod: 3, endPeriod: 3, periodWeights: { 3: sampleRabItems[4].weightPercentage } },
  // Item 6: Pondasi batu kali - Weeks 3-4
  { rabItemId: 'item-6', startPeriod: 3, endPeriod: 4, periodWeights: { 3: sampleRabItems[5].weightPercentage * 0.5, 4: sampleRabItems[5].weightPercentage * 0.5 } },
  // Item 7: Footplat & mini pile - Weeks 3-5
  { rabItemId: 'item-7', startPeriod: 3, endPeriod: 5, periodWeights: { 3: sampleRabItems[6].weightPercentage * 0.3, 4: sampleRabItems[6].weightPercentage * 0.5, 5: sampleRabItems[6].weightPercentage * 0.2 } },

  // Item 8: Sloof - Weeks 4-5
  { rabItemId: 'item-8', startPeriod: 4, endPeriod: 5, periodWeights: { 4: sampleRabItems[7].weightPercentage * 0.5, 5: sampleRabItems[7].weightPercentage * 0.5 } },
  // Item 9: Kolom Utama - Weeks 5-8
  { rabItemId: 'item-9', startPeriod: 5, endPeriod: 8, periodWeights: { 5: sampleRabItems[8].weightPercentage * 0.25, 6: sampleRabItems[8].weightPercentage * 0.35, 7: sampleRabItems[8].weightPercentage * 0.25, 8: sampleRabItems[8].weightPercentage * 0.15 } },
  // Item 10: Balok & Pelat - Weeks 6-9
  { rabItemId: 'item-10', startPeriod: 6, endPeriod: 9, periodWeights: { 6: sampleRabItems[9].weightPercentage * 0.2, 7: sampleRabItems[9].weightPercentage * 0.35, 8: sampleRabItems[9].weightPercentage * 0.3, 9: sampleRabItems[9].weightPercentage * 0.15 } },
  // Item 11: Rangka atap - Weeks 8-10
  { rabItemId: 'item-11', startPeriod: 8, endPeriod: 10, periodWeights: { 8: sampleRabItems[10].weightPercentage * 0.3, 9: sampleRabItems[10].weightPercentage * 0.5, 10: sampleRabItems[10].weightPercentage * 0.2 } },

  // Item 12: Dinding Hebel - Weeks 6-10
  { rabItemId: 'item-12', startPeriod: 6, endPeriod: 10, periodWeights: { 6: sampleRabItems[11].weightPercentage * 0.15, 7: sampleRabItems[11].weightPercentage * 0.3, 8: sampleRabItems[11].weightPercentage * 0.3, 9: sampleRabItems[11].weightPercentage * 0.15, 10: sampleRabItems[11].weightPercentage * 0.1 } },
  // Item 13: Plesteran & Acian - Weeks 7-11
  { rabItemId: 'item-13', startPeriod: 7, endPeriod: 11, periodWeights: { 7: sampleRabItems[12].weightPercentage * 0.1, 8: sampleRabItems[12].weightPercentage * 0.25, 9: sampleRabItems[12].weightPercentage * 0.35, 10: sampleRabItems[12].weightPercentage * 0.2, 11: sampleRabItems[12].weightPercentage * 0.1 } },
  // Item 14: Lantai Granit - Weeks 9-11
  { rabItemId: 'item-14', startPeriod: 9, endPeriod: 11, periodWeights: { 9: sampleRabItems[13].weightPercentage * 0.25, 10: sampleRabItems[13].weightPercentage * 0.5, 11: sampleRabItems[13].weightPercentage * 0.25 } },
  // Item 15: Pengecatan - Weeks 10-12
  { rabItemId: 'item-15', startPeriod: 10, endPeriod: 12, periodWeights: { 10: sampleRabItems[14].weightPercentage * 0.2, 11: sampleRabItems[14].weightPercentage * 0.5, 12: sampleRabItems[14].weightPercentage * 0.3 } },

  // Item 16 & 17: MEP - Weeks 7-12
  { rabItemId: 'item-16', startPeriod: 7, endPeriod: 12, periodWeights: { 7: sampleRabItems[15].weightPercentage * 0.1, 8: sampleRabItems[15].weightPercentage * 0.2, 9: sampleRabItems[15].weightPercentage * 0.3, 10: sampleRabItems[15].weightPercentage * 0.2, 11: sampleRabItems[15].weightPercentage * 0.1, 12: sampleRabItems[15].weightPercentage * 0.1 } },
  { rabItemId: 'item-17', startPeriod: 7, endPeriod: 12, periodWeights: { 7: sampleRabItems[16].weightPercentage * 0.15, 8: sampleRabItems[16].weightPercentage * 0.25, 9: sampleRabItems[16].weightPercentage * 0.3, 10: sampleRabItems[16].weightPercentage * 0.2, 11: sampleRabItems[16].weightPercentage * 0.1 } },
];

// Sample Daily Reports up to Week 5 (giving an active actual progress line)
const sampleDailyReports = [
  // Week 1 Reports
  {
    id: 'rep-101',
    date: '2026-06-02',
    periodNumber: 1,
    rabItemId: 'item-1',
    rabItemCode: '1.1',
    rabItemDescription: 'Pembersihan Lahan, Pemagaran & Pengukuran Site',
    volumeProgress: 180,
    percentageAdded: 64.28,
    weightAdded: sampleRabItems[0].weightPercentage * 0.6428,
    notes: 'Pembersihan semak dan pemagaran seng gelombang perimeter site telah diselesaikan.',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-02T16:30:00Z',
  },
  {
    id: 'rep-102',
    date: '2026-06-05',
    periodNumber: 1,
    rabItemId: 'item-2',
    rabItemCode: '1.2',
    rabItemDescription: 'Direksi Keet, Gudang Bahan & Papan Nama Proyek',
    volumeProgress: 0.8,
    percentageAdded: 80,
    weightAdded: sampleRabItems[1].weightPercentage * 0.8,
    notes: 'Pembangunan kantor proyek & gudang semen selesai 80%. Papan nama proyek terpasang.',
    photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan (Mandor Utama)',
    createdAt: '2026-06-05T17:10:00Z',
  },

  // Week 2 Reports
  {
    id: 'rep-103',
    date: '2026-06-09',
    periodNumber: 2,
    rabItemId: 'item-1',
    rabItemCode: '1.1',
    rabItemDescription: 'Pembersihan Lahan, Pemagaran & Pengukuran Site',
    volumeProgress: 100,
    percentageAdded: 35.72,
    weightAdded: sampleRabItems[0].weightPercentage * 0.3572,
    notes: 'Pekerjaan pengukuran titik as gedung (Uitzet) selesai 100%.',
    photoUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-09T16:00:00Z',
  },
  {
    id: 'rep-104',
    date: '2026-06-11',
    periodNumber: 2,
    rabItemId: 'item-3',
    rabItemCode: '1.3',
    rabItemDescription: 'Pemasangan Bowplank Kayu Borneo',
    volumeProgress: 85,
    percentageAdded: 100,
    weightAdded: sampleRabItems[2].weightPercentage * 1.0,
    notes: 'Pemasangan siku & peil benang elevasi bowplank keliling bangunan rampung 100%.',
    photoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan',
    createdAt: '2026-06-11T15:45:00Z',
  },
  {
    id: 'rep-105',
    date: '2026-06-13',
    periodNumber: 2,
    rabItemId: 'item-4',
    rabItemCode: '2.1',
    rabItemDescription: 'Galian Tanah Pondasi Footplat & Batu Kali',
    volumeProgress: 70,
    percentageAdded: 42.42,
    weightAdded: sampleRabItems[3].weightPercentage * 0.4242,
    notes: 'Galian tanah pondasi lajur dan titik mini pile dilaksanakan dengan excavator mini.',
    photoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-13T17:00:00Z',
  },

  // Week 3 Reports
  {
    id: 'rep-106',
    date: '2026-06-16',
    periodNumber: 3,
    rabItemId: 'item-4',
    rabItemCode: '2.1',
    rabItemDescription: 'Galian Tanah Pondasi Footplat & Batu Kali',
    volumeProgress: 95,
    percentageAdded: 57.58,
    weightAdded: sampleRabItems[3].weightPercentage * 0.5758,
    notes: 'Galian tanah pondasi selesai 100%. Lanjut perataan dan pemadatan tanah dasar.',
    photoUrl: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan',
    createdAt: '2026-06-16T16:20:00Z',
  },
  {
    id: 'rep-107',
    date: '2026-06-18',
    periodNumber: 3,
    rabItemId: 'item-5',
    rabItemCode: '2.2',
    rabItemDescription: 'Urugan Pasir Bawah Pondasi t = 10 cm',
    volumeProgress: 22,
    percentageAdded: 100,
    weightAdded: sampleRabItems[4].weightPercentage * 1.0,
    notes: 'Urugan pasir pasang t=10cm diratakan dan disiram air.',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-18T16:50:00Z',
  },
  {
    id: 'rep-108',
    date: '2026-06-20',
    periodNumber: 3,
    rabItemId: 'item-7',
    rabItemCode: '2.4',
    rabItemDescription: 'Pondasi Footplat Beton K-300 & Pemancangan Mini Pile',
    volumeProgress: 15,
    percentageAdded: 39.47,
    weightAdded: sampleRabItems[6].weightPercentage * 0.3947,
    notes: 'Pemancangan 24 titik mini pile pancang selesai. Pengecoran rabat beton footplat.',
    photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan',
    createdAt: '2026-06-20T17:30:00Z',
  },

  // Week 4 Reports
  {
    id: 'rep-109',
    date: '2026-06-23',
    periodNumber: 4,
    rabItemId: 'item-6',
    rabItemCode: '2.3',
    rabItemDescription: 'Pondasi Batu Kali Belah 1:4',
    volumeProgress: 50,
    percentageAdded: 52.63,
    weightAdded: sampleRabItems[5].weightPercentage * 0.5263,
    notes: 'Pasangan batu kali lajur bagian timur & utara diselesaikan.',
    photoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-23T16:15:00Z',
  },
  {
    id: 'rep-110',
    date: '2026-06-26',
    periodNumber: 4,
    rabItemId: 'item-7',
    rabItemCode: '2.4',
    rabItemDescription: 'Pondasi Footplat Beton K-300 & Pemancangan Mini Pile',
    volumeProgress: 18,
    percentageAdded: 47.37,
    weightAdded: sampleRabItems[6].weightPercentage * 0.4737,
    notes: 'Pengecoran beton ready mix K-300 footplat P1-P12 dengan concrete pump.',
    photoUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-06-26T18:00:00Z',
  },
  {
    id: 'rep-111',
    date: '2026-06-27',
    periodNumber: 4,
    rabItemId: 'item-8',
    rabItemCode: '3.1',
    rabItemDescription: 'Beton Sloof 20/30 K-250 Bertulang',
    volumeProgress: 14,
    percentageAdded: 50.0,
    weightAdded: sampleRabItems[7].weightPercentage * 0.50,
    notes: 'Pemasangan bekisting dan pembesian sloof 20/30 lantai 1.',
    photoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan',
    createdAt: '2026-06-27T17:15:00Z',
  },

  // Week 5 Reports (Latest Update)
  {
    id: 'rep-112',
    date: '2026-07-02',
    periodNumber: 5,
    rabItemId: 'item-6',
    rabItemCode: '2.3',
    rabItemDescription: 'Pondasi Batu Kali Belah 1:4',
    volumeProgress: 45,
    percentageAdded: 47.37,
    weightAdded: sampleRabItems[5].weightPercentage * 0.4737,
    notes: 'Pondasi batu kali 100% selesai. Urugan kembali dan pemadatan sela pondasi.',
    photoUrl: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso',
    createdAt: '2026-07-02T16:00:00Z',
  },
  {
    id: 'rep-113',
    date: '2026-07-04',
    periodNumber: 5,
    rabItemId: 'item-8',
    rabItemCode: '3.1',
    rabItemDescription: 'Beton Sloof 20/30 K-250 Bertulang',
    volumeProgress: 14,
    percentageAdded: 50.0,
    weightAdded: sampleRabItems[7].weightPercentage * 0.50,
    notes: 'Pengecoran sloof 20/30 selesai 100%. Pemasangan stek kolom lantai 1.',
    photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Agus Setiawan',
    createdAt: '2026-07-04T17:40:00Z',
  },
  {
    id: 'rep-114',
    date: '2026-07-06',
    periodNumber: 5,
    rabItemId: 'item-9',
    rabItemCode: '3.2',
    rabItemDescription: 'Beton Kolom Utama K-300 Bertulang (Lantai 1-3)',
    volumeProgress: 11.25,
    percentageAdded: 25.0,
    weightAdded: sampleRabItems[8].weightPercentage * 0.25,
    notes: 'Pembesian & pembekistingan kolom lantai 1 selesai. Pengecoran tahap I rampung.',
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80',
    reporterName: 'Ir. Budi Santoso (Site Manager)',
    createdAt: '2026-07-06T18:15:00Z',
  },
];

export const sampleProject: Project = {
  id: 'proj-sinar-perkasa-01',
  name: 'Pembangunan Ruko & Kantor 3 Lantai',
  code: 'PRJ-2026-003',
  client: 'PT. Sinar Perkasa Utama',
  location: 'Jl. Pemuda No. 128, Jakarta Timur',
  contractor: 'PT. Cipta Karya Konstruksi',
  startDate: '2026-06-01',
  endDate: '2026-08-23',
  periodType: 'weekly',
  totalPeriods: 12,
  totalContractValue: totalContractVal,
  rabItems: sampleRabItems,
  plannedDistributions: samplePlannedDistributions,
  dailyReports: sampleDailyReports,
  lastUpdateDate: '2026-07-06',
};
