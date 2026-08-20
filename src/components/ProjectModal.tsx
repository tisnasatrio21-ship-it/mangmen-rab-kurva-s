import React, { useState } from 'react';
import { Project } from '../types/project';
import { Building2, X, Plus, Calendar, MapPin, HardHat, DollarSign } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProject: (projectData: Partial<Project>) => void;
  initialProject?: Project;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSaveProject,
  initialProject,
}) => {
  const { t, language } = useLanguage();
  if (!isOpen) return null;

  const [form, setForm] = useState({
    name: initialProject?.name || '',
    code: initialProject?.code || `PRJ-${new Date().getFullYear()}-00${Math.floor(Math.random() * 90 + 10)}`,
    client: initialProject?.client || '',
    contractor: initialProject?.contractor || '',
    location: initialProject?.location || '',
    startDate: initialProject?.startDate || '2026-07-01',
    totalPeriods: initialProject?.totalPeriods || 12,
    totalContractValue: initialProject?.totalContractValue || 1500000000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.client) return;

    onSaveProject(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            {initialProject ? 'Edit Informasi Proyek' : 'Buat Proyek Konstruksi Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Proyek Konstruksi</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
              placeholder="Contoh: Pembangunan Ruko 3 Lantai Pemuda"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kode Proyek</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Durasi Proyek (Minggu)</label>
              <input
                type="number"
                required
                min="2"
                max="104"
                value={form.totalPeriods}
                onChange={(e) => setForm({ ...form, totalPeriods: parseInt(e.target.value, 10) || 12 })}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pemilik Proyek (Client / Bouwheer)</label>
              <input
                type="text"
                required
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                placeholder="PT. Sinar Perkasa Utama"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kontraktor Pelaksana</label>
              <input
                type="text"
                required
                value={form.contractor}
                onChange={(e) => setForm({ ...form, contractor: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                placeholder="PT. Cipta Karya Konstruksi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Lokasi Proyek</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                placeholder="Jakarta Timur"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tanggal Mulai SPMK</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Estimasi Nilai Kontrak (Rp)</label>
            <input
              type="number"
              required
              min="1000000"
              value={form.totalContractValue}
              onChange={(e) => setForm({ ...form, totalContractValue: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900 font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-colors shadow"
            >
              Simpan Proyek
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
