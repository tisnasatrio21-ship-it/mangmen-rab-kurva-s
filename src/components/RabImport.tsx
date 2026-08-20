import React, { useState, useRef } from 'react';
import { Project, RabItem } from '../types/project';
import { parseExcelOrCsvRab, downloadSampleRabTemplate, exportRabToExcel } from '../utils/excelParser';
import { recalculateRabItems, formatIDR, formatPercent } from '../utils/calculator';
import { exportRabToCsv } from '../utils/dataExporter';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Save,
  Layers,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Hash,
} from 'lucide-react';

interface RabImportProps {
  project: Project;
  onUpdateProjectRab: (updatedItems: RabItem[], totalContractValue: number) => void;
}

export const RabImport: React.FC<RabImportProps> = ({ project, onUpdateProjectRab }) => {
  const { t, language } = useLanguage();
  const [rabItems, setRabItems] = useState<RabItem[]>(project.rabItems || []);
  const [previewItems, setPreviewItems] = useState<RabItem[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  );

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Modal State for adding/editing manual item
  const [editingItem, setEditingItem] = useState<RabItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for add/edit item
  const [itemForm, setItemForm] = useState({
    code: '',
    category: 'I. Pekerjaan Umum',
    description: '',
    volume: 1,
    unit: 'm2',
    unitPrice: 100000,
  });

  const activeItems = previewItems || rabItems;
  const categories = Array.from(new Set(activeItems.map((i) => i.category || 'Umum')));
  const currentTotalVal = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const parsedRows = await parseExcelOrCsvRab(file);

      if (parsedRows.length === 0) {
        throw new Error('Tidak ada baris data pekerjaan valid yang ditemukan dalam file.');
      }

      const mappedItems: RabItem[] = parsedRows.map((row, idx) => ({
        id: `rab-imported-${Date.now()}-${idx}`,
        code: row.code || `1.${idx + 1}`,
        category: row.category || 'Pekerjaan Utama',
        description: row.description,
        volume: Number(row.volume) || 1,
        unit: row.unit || 'ls',
        unitPrice: Number(row.unitPrice) || 0,
        totalPrice: Number(row.volume || 1) * Number(row.unitPrice || 0),
        weightPercentage: 0,
      }));

      const { items: recalculated } = recalculateRabItems(mappedItems);

      setPreviewItems(recalculated);
      setSuccessMessage(
        `Berhasil membaca ${recalculated.length} item pekerjaan dari file "${file.name}". Silakan periksa pratinjau di bawah dan klik "Konfirmasi & Simpan".`
      );
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Gagal memproses file RAB. Pastikan format kolom sesuai template.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Confirm Preview
  const handleConfirmPreview = () => {
    if (!previewItems) return;
    setRabItems(previewItems);
    onUpdateProjectRab(previewItems, currentTotalVal);
    setPreviewItems(null);
    setSuccessMessage(`Berhasil menyimpan ${previewItems.length} item ke Master RAB proyek.`);
  };

  // Cancel Preview
  const handleCancelPreview = () => {
    setPreviewItems(null);
    setUploadError(null);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item pekerjaan ini? Bobot akan dihitung ulang otomatis.')) {
      const updated = activeItems.filter((i) => i.id !== id);
      const { items: recalculated, totalValue } = recalculateRabItems(updated);

      if (previewItems) {
        setPreviewItems(recalculated);
      } else {
        setRabItems(recalculated);
        onUpdateProjectRab(recalculated, totalValue);
      }
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: RabItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      category: item.category,
      description: item.description,
      volume: item.volume,
      unit: item.unit,
      unitPrice: item.unitPrice,
    });
    setIsAddModalOpen(true);
  };

  // Open Add New Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemForm({
      code: `${activeItems.length + 1}`,
      category: categories[0] || 'I. Pekerjaan Umum',
      description: '',
      volume: 1,
      unit: 'm2',
      unitPrice: 100000,
    });
    setIsAddModalOpen(true);
  };

  // Save Item from Modal
  const handleSaveModalItem = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList: RabItem[];

    if (editingItem) {
      updatedList = activeItems.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              code: itemForm.code,
              category: itemForm.category,
              description: itemForm.description,
              volume: Number(itemForm.volume),
              unit: itemForm.unit,
              unitPrice: Number(itemForm.unitPrice),
              totalPrice: Number(itemForm.volume) * Number(itemForm.unitPrice),
            }
          : i
      );
    } else {
      const newItem: RabItem = {
        id: `item-manual-${Date.now()}`,
        code: itemForm.code,
        category: itemForm.category,
        description: itemForm.description,
        volume: Number(itemForm.volume),
        unit: itemForm.unit,
        unitPrice: Number(itemForm.unitPrice),
        totalPrice: Number(itemForm.volume) * Number(itemForm.unitPrice),
        weightPercentage: 0,
      };
      updatedList = [...activeItems, newItem];
    }

    const { items: recalculated, totalValue } = recalculateRabItems(updatedList);

    if (previewItems) {
      setPreviewItems(recalculated);
    } else {
      setRabItems(recalculated);
      onUpdateProjectRab(recalculated, totalValue);
    }

    setIsAddModalOpen(false);
  };

  // Filter items
  const filteredItems = activeItems.filter((i) => {
    const matchesCat = filterCategory === 'all' || i.category === filterCategory;
    const matchesSearch =
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: File Upload Area & Template Download */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              Impor File RAB (Excel .xlsx / CSV)
            </h2>
            <p className="text-xs text-slate-500">
              Upload RAB proyek Anda. Sistem akan otomatis mem-parsing kolom & menghitung bobot pekerjaan (%).
            </p>
          </div>

          <button
            onClick={downloadSampleRabTemplate}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200 shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Download Template Excel RAB</span>
          </button>
        </div>

        {/* Drag & Drop or Browse Box */}
        <div className="relative border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-50/60 hover:bg-amber-50/30">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            title="Klik atau seret file Excel/CSV ke sini"
          />
          <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {isUploading ? 'Sedang memproses dan mem-parsing data RAB...' : 'Klik atau seret file Excel / CSV ke area ini'}
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              Mendukung file <strong>.xlsx, .xls, dan .csv</strong> standar BQ/RAB konstruksi (Kode, Kategori, Uraian Pekerjaan, Volume, Satuan, Harga Satuan).
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {uploadError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Gagal Mengimpor File</strong>
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Pemberitahuan</strong>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview Confirmation Bar (If Preview Mode Active) */}
      {previewItems && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 border border-amber-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 text-amber-400 rounded-xl shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm block">MODE PREVIEW DATA IMPOR</span>
              <p className="text-xs text-slate-900 font-medium">
                Ditemukan <strong>{previewItems.length} item pekerjaan</strong> dengan total nilai{' '}
                <strong>{formatIDR(currentTotalVal)}</strong>. Klik Konfirmasi & Simpan untuk menyimpan ke Master RAB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelPreview}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-black/10 rounded-xl transition-colors cursor-pointer"
            >
              Batal Preview
            </button>
            <button
              onClick={handleConfirmPreview}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Konfirmasi & Simpan Master RAB</span>
            </button>
          </div>
        </div>
      )}

      {/* Master RAB Table Section */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500 shrink-0" />
              Daftar Rencana Anggaran Biaya (Master RAB)
            </h3>
            <p className="text-xs text-slate-500">
              Total Nilai Proyek:{' '}
              <strong className="text-slate-900 font-bold">{formatIDR(currentTotalVal)}</strong> (100.00% Bobot)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher (Table vs Mobile Cards) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Tabel Lengkap"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Kartu Ringkas (Mobile Friendly)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="hidden xs:inline">Tambah Item Manual</span>
              <span className="xs:hidden">Tambah</span>
            </button>

            <button
              onClick={() => exportRabToExcel(project.name, activeItems, currentTotalVal)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Unduh format spreadsheet Excel .xlsx"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={() => exportRabToCsv(project)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Unduh format file CSV (.csv)"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Kategori:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-800 font-medium focus:outline-none w-full max-w-xs"
            >
              <option value="all">Semua Kategori ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Cari item pekerjaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* VIEW 1: Mobile Cards Mode (Zero Overlap, Touch Friendly) */}
        {viewMode === 'cards' ? (
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 italic text-xs">
                Belum ada data pekerjaan RAB yang cocok. Silakan upload file Excel atau tambah item manual.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 hover:border-amber-400/80 rounded-xl shadow-xs space-y-3 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                          {item.code || `#${idx + 1}`}
                        </span>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 truncate max-w-[160px]">
                          {item.category}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                        {formatPercent(item.weightPercentage)}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                      {item.description}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Volume & Satuan</span>
                        <strong className="font-mono text-slate-800">
                          {item.volume} {item.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Harga Satuan</span>
                        <span className="font-mono text-slate-700">{formatIDR(item.unitPrice)}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Nilai:</span>
                        <strong className="font-mono text-slate-900 text-sm font-bold">
                          {formatIDR(item.totalPrice)}
                        </strong>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: Table Mode (Responsive Horizontal Scroll with Streamlined Mobile Layout) */
          <>
            {/* Mobile Scroll Indicator & Scroll Navigation */}
            <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200/90 rounded-xl px-3.5 py-2 text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">
                  Geser tabel ke samping untuk melihat detail harga lengkap &amp; bobot (%)
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => scrollTable('left')}
                  className="p-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kiri</span>
                </button>
                <button
                  onClick={() => scrollTable('right')}
                  className="p-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kanan"
                >
                  <span className="hidden sm:inline">Kanan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* RAB Items Table Container */}
            <div
              ref={tableContainerRef}
              className="w-full overflow-x-auto custom-table-scrollbar touch-scroll-x border border-slate-200 rounded-xl shadow-xs"
            >
              <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[700px] lg:min-w-[850px]">
                <thead className="bg-slate-900 text-slate-200 uppercase font-bold text-[11px] tracking-wider sticky top-0 z-20">
                  <tr>
                    <th className="py-3 px-2 sm:px-3 w-10 text-center bg-slate-900 border-r border-slate-800">
                      No
                    </th>
                    <th className="py-3 px-2 sm:px-3 w-16 sm:w-20 bg-slate-900 border-r border-slate-800">
                      Kode
                    </th>
                    <th className="py-3 px-3 sm:px-4 min-w-[180px] sm:min-w-[220px] bg-slate-900 border-r border-slate-700">
                      Uraian Pekerjaan
                    </th>
                    <th className="hidden md:table-cell py-3 px-3 whitespace-nowrap">Kategori</th>
                    <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Vol</th>
                    <th className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">Sat</th>
                    <th className="hidden lg:table-cell py-3 px-3 text-right whitespace-nowrap">Harga Satuan (Rp)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Jumlah Harga (Rp)</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Bobot (%)</th>
                    <th className="py-3 px-2 sm:px-3 w-16 sm:w-20 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 italic">
                        Belum ada data pekerjaan RAB yang cocok. Silakan upload file Excel atau tambah item.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="py-2.5 px-2 sm:px-3 text-center text-slate-400 font-mono bg-white group-hover:bg-slate-50 border-r border-slate-200/60">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 font-semibold text-slate-900 font-mono bg-white group-hover:bg-slate-50 border-r border-slate-200/60 text-[11px] sm:text-xs">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-800 bg-white group-hover:bg-slate-50 border-r border-slate-200">
                          <div className="line-clamp-2">{item.description}</div>
                          {/* Display Category under title on smaller screens */}
                          <div className="text-[10px] text-slate-400 font-normal md:hidden mt-0.5">
                            {item.category}
                          </div>
                        </td>
                        <td className="hidden md:table-cell py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-medium whitespace-nowrap">
                          {item.volume}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {item.unit}
                        </td>
                        <td className="hidden lg:table-cell py-2.5 px-3 text-right font-mono whitespace-nowrap">
                          {formatIDR(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div>{formatIDR(item.totalPrice)}</div>
                          <div className="text-[9px] text-slate-400 font-normal lg:hidden">
                            @{formatIDR(item.unitPrice)}/{item.unit}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 bg-amber-50/50 whitespace-nowrap">
                          {formatPercent(item.weightPercentage)}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer */}
                <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 sm:px-4 text-right uppercase tracking-wider bg-slate-100 border-r border-slate-300">
                      Total Nilai &amp; Bobot:
                    </td>
                    <td className="hidden md:table-cell"></td>
                    <td colSpan={2} className="py-3 px-2 sm:px-3 text-right font-mono text-slate-500 text-[11px]">
                      (Master)
                    </td>
                    <td className="hidden lg:table-cell"></td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                      {formatIDR(currentTotalVal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 bg-amber-100 whitespace-nowrap">
                      100.00%
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Add / Edit RAB Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingItem ? 'Edit Item Pekerjaan RAB' : 'Tambah Item Pekerjaan RAB Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kode Item</label>
                <input
                  type="text"
                  required
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                  placeholder="Contoh: 1.1 atau II.A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Pekerjaan</label>
                <input
                  type="text"
                  required
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  placeholder="Contoh: Pekerjaan Struktur, Pekerjaan Arsitektur"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Uraian / Nama Pekerjaan</label>
                <textarea
                  required
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Contoh: Pekerjaan Beton Kolom K1 30x30 cm fc' 25 Mpa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Volume</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={itemForm.volume}
                    onChange={(e) => setItemForm({ ...itemForm, volume: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="m3, m2, ls, kg, ttk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({ ...itemForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Calculated preview */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">Estimasi Subtotal:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIDR(Number(itemForm.volume) * Number(itemForm.unitPrice))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl transition-colors shadow-sm"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
