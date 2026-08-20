export type Language = 'id' | 'en';

export interface Translations {
  // Common & Branding
  appTitle: string;
  appSubtitle: string;
  activeProject: string;
  selectProject: string;
  newProject: string;
  exportPdf: string;
  backupExport: string;
  devices: string;
  resetSample: string;
  loginGoogle: string;
  logout: string;
  cloudSyncing: string;
  cloudSynced: string;
  cloudSyncNow: string;
  cancel: string;
  save: string;
  close: string;
  delete: string;
  edit: string;
  actions: string;
  loading: string;
  search: string;
  all: string;
  status: string;
  date: string;
  week: string;
  period: string;

  // Nav Tabs
  tabDashboard: string;
  tabRab: string;
  tabTimeline: string;
  tabDailyReport: string;

  // Cloud Banner
  cloudBannerConnected: string;
  cloudBannerDisconnected: string;
  cloudBannerConnectedDesc: string;
  cloudBannerDisconnectedDesc: string;

  // Dashboard
  summaryExecutive: string;
  projectCode: string;
  client: string;
  location: string;
  contractor: string;
  duration: string;
  contractValue: string;
  plannedProgress: string;
  actualProgress: string;
  scheduleDeviation: string;
  aheadOfSchedule: string;
  behindSchedule: string;
  onTrack: string;
  earnedValue: string;
  actualCost: string;
  costVariance: string;
  spiLabel: string;
  cpiLabel: string;
  eacLabel: string;
  healthIndex: string;
  executiveSummary: string;
  quickActions: string;
  addDailyProgress: string;
  viewRabDetails: string;
  adjustSchedule: string;
  downloadFullReport: string;
  weeklyProgressComparison: string;
  sCurveTitle: string;
  sCurveSubtitle: string;
  criticalItems: string;
  criticalItemsDesc: string;
  noCriticalItems: string;
  itemProgress: string;

  // Master RAB
  rabTitle: string;
  rabSubtitle: string;
  uploadRabFile: string;
  uploadRabDesc: string;
  downloadTemplate: string;
  addNewItem: string;
  exportExcel: string;
  exportCsv: string;
  colNo: string;
  colCode: string;
  colCategory: string;
  colDescription: string;
  colUnit: string;
  colVolume: string;
  colUnitPrice: string;
  colTotalPrice: string;
  colWeight: string;
  colRealization: string;
  colActualVol: string;
  colEarnedVal: string;
  totalRabValue: string;
  totalWeight: string;
  rabSearchPlaceholder: string;
  noRabItems: string;
  editRabItem: string;
  deleteRabItemConfirm: string;

  // Timeline Planner
  timelineTitle: string;
  timelineSubtitle: string;
  autoDistributeSCurve: string;
  resetDistribution: string;
  saveTimeline: string;
  weekHeader: string;
  plannedWeightPct: string;
  cumulativePlannedPct: string;
  actualWeightPct: string;
  cumulativeActualPct: string;
  variancePct: string;
  totalDistributionMustBe100: string;

  // Daily Report
  dailyReportTitle: string;
  dailyReportSubtitle: string;
  createReport: string;
  reportHistory: string;
  selectRabItem: string;
  volumeAddedToday: string;
  percentageAdded: string;
  weightContribution: string;
  workerCount: string;
  weatherCondition: string;
  inspectorName: string;
  siteNotes: string;
  takePhotoGps: string;
  changePhoto: string;
  noDailyReports: string;
  filterByPeriod: string;
  allPeriods: string;
  printReportPdf: string;
  printAllPdf: string;
  deleteReportConfirm: string;

  // Backup & Export Modal
  backupModalTitle: string;
  backupModalSubtitle: string;
  tabExportData: string;
  tabRestoreData: string;
  backupSingleJson: string;
  backupSingleJsonDesc: string;
  downloadJsonBtn: string;
  backupBundleJson: string;
  backupBundleJsonDesc: string;
  downloadBundleBtn: string;
  exportRabCsvTitle: string;
  exportRabCsvDesc: string;
  downloadRabCsvBtn: string;
  exportDailyCsvTitle: string;
  exportDailyCsvDesc: string;
  downloadDailyCsvBtn: string;
  restoreDropzoneTitle: string;
  restoreDropzoneDesc: string;
  chooseJsonFileBtn: string;
  restoreNoticeTitle: string;
  restoreNotice1: string;
  restoreNotice2: string;
  restoreNotice3: string;

  // Device Security & Lock
  deviceLockTitle: string;
  deviceLockDesc: string;
  deviceNameLabel: string;
  deviceIdLabel: string;
  approvalStatusLabel: string;
  waitingWaConfirm: string;
  sendWaRequestBtn: string;
  lockLiveIndicator: string;
  checkStatusNow: string;
  adminBypassTitle: string;
  adminBypassBtn: string;
  adminBypassNote: string;
  deviceManagementTitle: string;
  deviceManagementSubtitle: string;
  totalDevices: string;
  activeApproved: string;
  waitingApproval: string;
  approveAccess: string;
  revokeAccess: string;
  reApproveAccess: string;
  deleteDeviceHistory: string;
  currentDeviceBadge: string;
  searchDevicePlaceholder: string;
  noDevicesYet: string;

  // Project Modal
  newProjectTitle: string;
  editProjectTitle: string;
  projectName: string;
  startDate: string;
  endDate: string;
  totalWeeks: string;
  currencyIdr: string;
  saveProjectBtn: string;
  cancelBtn: string;
}

export const translations: Record<Language, Translations> = {
  id: {
    // Common & Branding
    appTitle: 'RAB & Kurva S',
    appSubtitle: 'Manajemen Proyek Konstruksi',
    activeProject: 'Proyek Aktif',
    selectProject: 'Pilih Proyek',
    newProject: 'Proyek Baru',
    exportPdf: 'Export PDF',
    backupExport: 'Backup / Export',
    devices: 'Perangkat',
    resetSample: 'Reset Sampel',
    loginGoogle: 'Login Google Cloud',
    logout: 'Keluar Akun',
    cloudSyncing: 'Menyinkronkan...',
    cloudSynced: 'Cloud Sinkron',
    cloudSyncNow: 'Sinkronkan Sekarang',
    cancel: 'Batal',
    save: 'Simpan',
    close: 'Tutup',
    delete: 'Hapus',
    edit: 'Ubah',
    actions: 'Aksi',
    loading: 'Memuat...',
    search: 'Cari',
    all: 'Semua',
    status: 'Status',
    date: 'Tanggal',
    week: 'Minggu',
    period: 'Periode',

    // Nav Tabs
    tabDashboard: 'Dashboard & Kurva S',
    tabRab: 'Master RAB',
    tabTimeline: 'Jadwal & Kurva S',
    tabDailyReport: 'Laporan Harian',

    // Cloud Banner
    cloudBannerConnected: 'Firebase Firestore Aktif',
    cloudBannerDisconnected: 'Penyimpanan Lokal Aktif • Masuk dengan Google untuk Sinkronisasi Cloud',
    cloudBannerConnectedDesc: 'Semua perubahan RAB, kurva S, jadwal minggu, dan laporan harian otomatis tersimpan ke cloud secara realtime.',
    cloudBannerDisconnectedDesc: 'Simpan proyek ke database cloud Firestore agar dapat diakses kapan saja dari perangkat manapun.',

    // Dashboard
    summaryExecutive: 'Ringkasan Eksekutif & Deviasi Fisik',
    projectCode: 'Kode Proyek',
    client: 'Owner / Klien',
    location: 'Lokasi Proyek',
    contractor: 'Kontraktor Pelaksana',
    duration: 'Durasi Kontrak',
    contractValue: 'Total Nilai Kontrak',
    plannedProgress: 'Rencana Progres',
    actualProgress: 'Realisasi Fisik',
    scheduleDeviation: 'Deviasi Progres',
    aheadOfSchedule: 'Lebih Cepat Dari Jadwal',
    behindSchedule: 'Terlambat Dari Jadwal',
    onTrack: 'Tepat Waktu Sesuai Jadwal',
    earnedValue: 'Nilai Hasil (Earned Value)',
    actualCost: 'Biaya Realisasi (AC)',
    costVariance: 'Varians Biaya (CV)',
    spiLabel: 'Indeks Kinerja Waktu (SPI)',
    cpiLabel: 'Indeks Kinerja Biaya (CPI)',
    eacLabel: 'Prakiraan Biaya Akhir (EAC)',
    healthIndex: 'Status Kesehatan Proyek',
    executiveSummary: 'Analisis Kinerja Proyek',
    quickActions: 'Tindakan Cepat',
    addDailyProgress: 'Input Laporan Harian',
    viewRabDetails: 'Kelola Master RAB',
    adjustSchedule: 'Atur Bobot Rencana',
    downloadFullReport: 'Unduh Laporan PDF Lengkap',
    weeklyProgressComparison: 'Tabel Perbandingan Progres Mingguan',
    sCurveTitle: 'Grafik Kurva S (Rencana vs Realisasi Kumulatif)',
    sCurveSubtitle: 'Visualisasi akumulasi bobot pekerjaan sepanjang durasi proyek',
    criticalItems: 'Pekerjaan Prioritas & Deviasi Kritis',
    criticalItemsDesc: 'Daftar item pekerjaan yang memerlukan perhatian lapangan',
    noCriticalItems: 'Semua item pekerjaan berjalan sesuai target atau belum dimulai.',
    itemProgress: 'Progres Pekerjaan',

    // Master RAB
    rabTitle: 'Master Rencana Anggaran Biaya (RAB)',
    rabSubtitle: 'Kelola daftar item pekerjaan, volume, satuan, harga satuan, dan bobot otomatis',
    uploadRabFile: 'Impor RAB dari File Excel / CSV',
    uploadRabDesc: 'Tarik & lepas file .xlsx / .csv atau klik untuk memilih file',
    downloadTemplate: 'Unduh Format Template Excel',
    addNewItem: 'Tambah Item Pekerjaan',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    colNo: 'No',
    colCode: 'Kode Item',
    colCategory: 'Kategori',
    colDescription: 'Uraian Pekerjaan',
    colUnit: 'Satuan',
    colVolume: 'Volume RAB',
    colUnitPrice: 'Harga Satuan (Rp)',
    colTotalPrice: 'Total Harga (Rp)',
    colWeight: 'Bobot (%)',
    colRealization: 'Realisasi Fisik (%)',
    colActualVol: 'Volume Terlapor',
    colEarnedVal: 'Nilai Realisasi (Rp)',
    totalRabValue: 'Total Anggaran RAB',
    totalWeight: 'Total Bobot Proyek',
    rabSearchPlaceholder: 'Cari berdasarkan uraian pekerjaan, kategori, atau kode item...',
    noRabItems: 'Belum ada item RAB. Silakan impor dari Excel atau tambah item manual.',
    editRabItem: 'Ubah Item RAB',
    deleteRabItemConfirm: 'Hapus item pekerjaan ini dari master RAB?',

    // Timeline Planner
    timelineTitle: 'Jadwal Mingguan & Distribusi Kurva S',
    timelineSubtitle: 'Rencanakan pembagian bobot persentase (%) tiap minggu sepanjang durasi proyek',
    autoDistributeSCurve: 'Distribusi Otomatis (Bentuk S)',
    resetDistribution: 'Reset Distribusi Rata',
    saveTimeline: 'Simpan Perubahan Jadwal',
    weekHeader: 'Minggu',
    plannedWeightPct: 'Rencana Periode (%)',
    cumulativePlannedPct: 'Rencana Kumulatif (%)',
    actualWeightPct: 'Realisasi Periode (%)',
    cumulativeActualPct: 'Realisasi Kumulatif (%)',
    variancePct: 'Deviasi Kumulatif (%)',
    totalDistributionMustBe100: 'Total distribusi bobot periode rencana harus bernilai 100%.',

    // Daily Report
    dailyReportTitle: 'Laporan Harian & Dokumentasi Lapangan',
    dailyReportSubtitle: 'Catat penambahan progres fisik harian, tenaga kerja, cuaca, dan foto GPS',
    createReport: 'Tambah Laporan Harian Baru',
    reportHistory: 'Riwayat Catatan Progres Lapangan',
    selectRabItem: 'Pilih Item Pekerjaan RAB',
    volumeAddedToday: 'Penambahan Volume Hari Ini',
    percentageAdded: 'Progres Item Ditambah (%)',
    weightContribution: 'Bobot Proyek Ditambah (%)',
    workerCount: 'Jumlah Tenaga Kerja (Orang)',
    weatherCondition: 'Kondisi Cuaca Lapangan',
    inspectorName: 'Nama Pengawas / Mandor Pelapor',
    siteNotes: 'Catatan Kendala / Aktivitas Lapangan',
    takePhotoGps: 'Ambil Foto Lapangan (GPS & Timestamp)',
    changePhoto: 'Ganti Foto Dokumentasi',
    noDailyReports: 'Belum ada laporan harian yang dicatat untuk proyek ini.',
    filterByPeriod: 'Filter Periode Minggu:',
    allPeriods: 'Semua Periode Minggu',
    printReportPdf: 'Cetak PDF',
    printAllPdf: 'Export Rekap PDF',
    deleteReportConfirm: 'Hapus laporan harian ini?',

    // Backup & Export Modal
    backupModalTitle: 'Backup & Export Data Lokal',
    backupModalSubtitle: 'Amankan salinan data proyek secara offline di luar cloud untuk arsip lokal Anda.',
    tabExportData: 'Export Data (JSON & CSV)',
    tabRestoreData: 'Restore / Pulihkan dari File JSON',
    backupSingleJson: 'Backup JSON Proyek Aktif',
    backupSingleJsonDesc: 'Salinan lengkap 1 file JSON (RAB, Distribusi Jadwal Kurva S, Laporan Harian & Foto).',
    downloadJsonBtn: 'Unduh File JSON Proyek',
    backupBundleJson: 'Backup Semua Proyek (Bundle)',
    backupBundleJsonDesc: 'Mengemas seluruh proyek yang tersimpan di perangkat ke dalam 1 file arsip JSON.',
    downloadBundleBtn: 'Unduh Arsip Semua Proyek',
    exportRabCsvTitle: 'Export Item RAB ke CSV',
    exportRabCsvDesc: 'Tabel spreadsheet item pekerjaan RAB, volume, harga satuan, bobot %, dan volume realisasi.',
    downloadRabCsvBtn: 'Unduh CSV Data RAB',
    exportDailyCsvTitle: 'Export Laporan Harian ke CSV',
    exportDailyCsvDesc: 'Rekap kronologis seluruh entri laporan harian fisik, tenaga kerja, cuaca, dan catatan mandor.',
    downloadDailyCsvBtn: 'Unduh CSV Laporan Harian',
    restoreDropzoneTitle: 'Pilih File JSON Hasil Backup',
    restoreDropzoneDesc: 'Sistem akan memverifikasi dan memulihkan data proyek secara instan ke dalam memori aplikasi serta Firebase Firestore.',
    chooseJsonFileBtn: 'Pilih File .JSON dari Komputer / HP',
    restoreNoticeTitle: 'Informasi Pemulihan (Restore):',
    restoreNotice1: 'Mendukung file backup 1 proyek maupun file backup bundle seluruh proyek.',
    restoreNotice2: 'Jika Anda telah login ke Google, proyek yang dipulihkan akan otomatis disinkronkan ke Cloud Firestore.',
    restoreNotice3: 'Data proyek yang sudah ada tidak akan terhapus jika memiliki ID yang berbeda.',

    // Device Security & Lock
    deviceLockTitle: 'Akses Perangkat Baru Terkunci',
    deviceLockDesc: 'Untuk melindungi data RAB, Kurva S, dan Laporan Proyek, setiap perangkat baru memerlukan izin dari Pak Tisna Satrio.',
    deviceNameLabel: 'Nama Perangkat:',
    deviceIdLabel: 'Kode ID Perangkat:',
    approvalStatusLabel: 'Status Persetujuan:',
    waitingWaConfirm: 'Menunggu Konfirmasi WA',
    sendWaRequestBtn: 'Kirim Permintaan Izin ke WA Pak Tisna',
    lockLiveIndicator: 'Layar ini akan terbuka otomatis begitu disetujui.',
    checkStatusNow: 'Periksa Status Sekarang',
    adminBypassTitle: 'Khusus Pemilik Aplikasi',
    adminBypassBtn: 'Saya adalah Pak Tisna (Login Langsung Google)',
    adminBypassNote: 'Login dengan akun tisnasatrio21@gmail.com akan otomatis membuka kunci perangkat ini.',
    deviceManagementTitle: 'Otorisasi & Keamanan Perangkat',
    deviceManagementSubtitle: 'Kelola daftar HP & Komputer yang diizinkan mengakses aplikasi RAB & Kurva S.',
    totalDevices: 'Total Terdaftar',
    activeApproved: 'Diizinkan (Aktif)',
    waitingApproval: 'Menunggu Izin',
    approveAccess: 'Izinkan Akses',
    revokeAccess: 'Cabut Izin',
    reApproveAccess: 'Buka Izin',
    deleteDeviceHistory: 'Hapus Riwayat Perangkat',
    currentDeviceBadge: 'Perangkat Anda Saat Ini',
    searchDevicePlaceholder: 'Cari berdasarkan ID perangkat (DEV-...) atau tipe perangkat...',
    noDevicesYet: 'Belum ada perangkat terdaftar.',

    // Project Modal
    newProjectTitle: 'Buat Proyek Konstruksi Baru',
    editProjectTitle: 'Ubah Data Proyek',
    projectName: 'Nama / Judul Proyek',
    startDate: 'Tanggal Mulai Proyek',
    endDate: 'Tanggal Target Selesai',
    totalWeeks: 'Durasi Total (Minggu)',
    currencyIdr: 'Rupiah (IDR)',
    saveProjectBtn: 'Simpan Proyek',
    cancelBtn: 'Batal',
  },

  en: {
    // Common & Branding
    appTitle: 'BOQ & S-Curve',
    appSubtitle: 'Construction Project Management',
    activeProject: 'Active Project',
    selectProject: 'Select Project',
    newProject: 'New Project',
    exportPdf: 'Export PDF',
    backupExport: 'Backup / Export',
    devices: 'Devices',
    resetSample: 'Reset Sample',
    loginGoogle: 'Sign in Google Cloud',
    logout: 'Sign Out',
    cloudSyncing: 'Syncing...',
    cloudSynced: 'Cloud Synced',
    cloudSyncNow: 'Sync to Cloud Now',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    actions: 'Actions',
    loading: 'Loading...',
    search: 'Search',
    all: 'All',
    status: 'Status',
    date: 'Date',
    week: 'Week',
    period: 'Period',

    // Nav Tabs
    tabDashboard: 'Dashboard & S-Curve',
    tabRab: 'Master BOQ (RAB)',
    tabTimeline: 'Schedule & S-Curve',
    tabDailyReport: 'Daily Site Reports',

    // Cloud Banner
    cloudBannerConnected: 'Firebase Firestore Connected',
    cloudBannerDisconnected: 'Local Storage Mode • Sign in with Google for Real-time Cloud Sync',
    cloudBannerConnectedDesc: 'All BOQ items, S-Curve timelines, weekly distributions, and site reports sync in real-time.',
    cloudBannerDisconnectedDesc: 'Save and secure your projects in Firestore cloud database to access anywhere.',

    // Dashboard
    summaryExecutive: 'Executive Summary & Physical Deviation',
    projectCode: 'Project Code',
    client: 'Client / Owner',
    location: 'Project Location',
    contractor: 'Main Contractor',
    duration: 'Contract Duration',
    contractValue: 'Total Contract Value',
    plannedProgress: 'Planned Progress',
    actualProgress: 'Actual Progress',
    scheduleDeviation: 'Schedule Deviation',
    aheadOfSchedule: 'Ahead of Schedule',
    behindSchedule: 'Behind Schedule',
    onTrack: 'On Track with Schedule',
    earnedValue: 'Earned Value (EV)',
    actualCost: 'Actual Cost (AC)',
    costVariance: 'Cost Variance (CV)',
    spiLabel: 'Schedule Performance Index (SPI)',
    cpiLabel: 'Cost Performance Index (CPI)',
    eacLabel: 'Estimate at Completion (EAC)',
    healthIndex: 'Project Health Status',
    executiveSummary: 'Project Performance Analysis',
    quickActions: 'Quick Actions',
    addDailyProgress: 'Add Daily Progress',
    viewRabDetails: 'Manage BOQ Items',
    adjustSchedule: 'Adjust Schedule Weights',
    downloadFullReport: 'Download Complete PDF Report',
    weeklyProgressComparison: 'Weekly Progress Comparison Table',
    sCurveTitle: 'S-Curve Chart (Cumulative Planned vs Actual)',
    sCurveSubtitle: 'Visualizing cumulative project progress weight over total duration',
    criticalItems: 'Priority Items & Critical Deviations',
    criticalItemsDesc: 'List of work items requiring field attention and acceleration',
    noCriticalItems: 'All work items are on schedule or have not started yet.',
    itemProgress: 'Work Item Progress',

    // Master RAB
    rabTitle: 'Master Bill of Quantities (BOQ / RAB)',
    rabSubtitle: 'Manage work items, quantities, units, unit rates, and automated progress weights',
    uploadRabFile: 'Import BOQ from Excel / CSV',
    uploadRabDesc: 'Drag & drop .xlsx / .csv file or click to browse file',
    downloadTemplate: 'Download Excel Template Format',
    addNewItem: 'Add Work Item',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    colNo: 'No',
    colCode: 'Item Code',
    colCategory: 'Category',
    colDescription: 'Work Description',
    colUnit: 'Unit',
    colVolume: 'BOQ Volume',
    colUnitPrice: 'Unit Rate (Rp)',
    colTotalPrice: 'Total Price (Rp)',
    colWeight: 'Weight (%)',
    colRealization: 'Actual Progress (%)',
    colActualVol: 'Reported Volume',
    colEarnedVal: 'Earned Value (Rp)',
    totalRabValue: 'Total BOQ Budget',
    totalWeight: 'Total Project Weight',
    rabSearchPlaceholder: 'Search by work description, category, or item code...',
    noRabItems: 'No BOQ items yet. Please import from Excel or add manually.',
    editRabItem: 'Edit BOQ Item',
    deleteRabItemConfirm: 'Delete this work item from master BOQ?',

    // Timeline Planner
    timelineTitle: 'Weekly Schedule & S-Curve Distribution',
    timelineSubtitle: 'Plan percentage weight (%) distribution for each week throughout project duration',
    autoDistributeSCurve: 'Auto Distribute (S-Curve Shape)',
    resetDistribution: 'Reset Even Distribution',
    saveTimeline: 'Save Schedule Changes',
    weekHeader: 'Week',
    plannedWeightPct: 'Period Planned (%)',
    cumulativePlannedPct: 'Cum. Planned (%)',
    actualWeightPct: 'Period Actual (%)',
    cumulativeActualPct: 'Cum. Actual (%)',
    variancePct: 'Cum. Deviation (%)',
    totalDistributionMustBe100: 'Total planned weight distribution must equal 100%.',

    // Daily Report
    dailyReportTitle: 'Daily Site Reports & Field Documentation',
    dailyReportSubtitle: 'Record daily physical progress, manpower, weather, and GPS geotagged photos',
    createReport: 'Create New Daily Site Report',
    reportHistory: 'Site Progress Record History',
    selectRabItem: 'Select BOQ Work Item',
    volumeAddedToday: 'Volume Added Today',
    percentageAdded: 'Item Progress Added (%)',
    weightContribution: 'Project Weight Added (%)',
    workerCount: 'Manpower / Workers (Persons)',
    weatherCondition: 'Site Weather Condition',
    inspectorName: 'Site Supervisor / Inspector Name',
    siteNotes: 'Field Obstacles & Activity Notes',
    takePhotoGps: 'Capture Site Photo (GPS & Timestamp)',
    changePhoto: 'Change Documentation Photo',
    noDailyReports: 'No daily site reports recorded for this project yet.',
    filterByPeriod: 'Filter by Week Period:',
    allPeriods: 'All Week Periods',
    printReportPdf: 'Print PDF',
    printAllPdf: 'Export Summary PDF',
    deleteReportConfirm: 'Delete this daily report?',

    // Backup & Export Modal
    backupModalTitle: 'Local Data Backup & Export',
    backupModalSubtitle: 'Secure offline copies of your project data outside the cloud for local archiving.',
    tabExportData: 'Export Data (JSON & CSV)',
    tabRestoreData: 'Restore from JSON File',
    backupSingleJson: 'Backup Active Project (JSON)',
    backupSingleJsonDesc: 'Complete 1-file JSON backup (BOQ, S-Curve Distribution, Daily Reports & Photos).',
    downloadJsonBtn: 'Download Project JSON',
    backupBundleJson: 'Backup All Projects (Bundle JSON)',
    backupBundleJsonDesc: 'Packs all projects stored on this device into a single JSON archive file.',
    downloadBundleBtn: 'Download All Projects Archive',
    exportRabCsvTitle: 'Export BOQ to CSV Spreadsheet',
    exportRabCsvDesc: 'Spreadsheet table of work items, volumes, unit prices, weights, and realized quantities.',
    downloadRabCsvBtn: 'Download BOQ CSV',
    exportDailyCsvTitle: 'Export Daily Reports to CSV',
    exportDailyCsvDesc: 'Chronological summary of all daily physical progress, labor, weather, and supervisor notes.',
    downloadDailyCsvBtn: 'Download Daily Reports CSV',
    restoreDropzoneTitle: 'Select Backup JSON File',
    restoreDropzoneDesc: 'The system verifies and restores project data instantly into app memory and Firestore cloud.',
    chooseJsonFileBtn: 'Choose .JSON File from Device',
    restoreNoticeTitle: 'Restore Information:',
    restoreNotice1: 'Supports both single project backups and multi-project bundles.',
    restoreNotice2: 'If signed in to Google, restored projects automatically sync to Firestore Cloud.',
    restoreNotice3: 'Existing projects with different IDs will not be overwritten.',

    // Device Security & Lock
    deviceLockTitle: 'New Device Access Locked',
    deviceLockDesc: 'To safeguard project BOQ, S-Curve, and Daily Reports, every new device requires approval from Pak Tisna Satrio.',
    deviceNameLabel: 'Device Name:',
    deviceIdLabel: 'Device ID Code:',
    approvalStatusLabel: 'Approval Status:',
    waitingWaConfirm: 'Waiting for WhatsApp Approval',
    sendWaRequestBtn: 'Send Request to Pak Tisna via WhatsApp',
    lockLiveIndicator: 'This screen will unlock automatically once approved.',
    checkStatusNow: 'Check Status Now',
    adminBypassTitle: 'App Owner Access',
    adminBypassBtn: 'I am Pak Tisna (Direct Google Sign-in)',
    adminBypassNote: 'Signing in with tisnasatrio21@gmail.com unlocks this device immediately.',
    deviceManagementTitle: 'Device Security & Authorization',
    deviceManagementSubtitle: 'Manage list of authorized mobile and desktop devices accessing the application.',
    totalDevices: 'Total Registered',
    activeApproved: 'Authorized (Active)',
    waitingApproval: 'Pending Approval',
    approveAccess: 'Grant Access',
    revokeAccess: 'Revoke Access',
    reApproveAccess: 'Re-grant Access',
    deleteDeviceHistory: 'Delete Device History',
    currentDeviceBadge: 'Your Current Device',
    searchDevicePlaceholder: 'Search by device ID (DEV-...) or platform...',
    noDevicesYet: 'No registered devices found.',

    // Project Modal
    newProjectTitle: 'Create New Construction Project',
    editProjectTitle: 'Edit Project Details',
    projectName: 'Project Title / Name',
    startDate: 'Project Start Date',
    endDate: 'Target Completion Date',
    totalWeeks: 'Total Duration (Weeks)',
    currencyIdr: 'Indonesian Rupiah (IDR)',
    saveProjectBtn: 'Save Project',
    cancelBtn: 'Cancel',
  },
};
