import React, { useState } from 'react';
import { Project, SPoint } from '../types/project';
import { calculateSCurvePoints, formatPercent, formatIDR } from '../utils/calculator';
import {
  Sparkles,
  BrainCircuit,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Send,
  Loader2,
  Copy,
  Check,
  X,
  Zap,
  Users,
  Clock,
  Hammer,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface AiProjectAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  initialTab?: 'scurve' | 'report' | 'audit' | 'chat';
}

export const AiProjectAdvisorModal: React.FC<AiProjectAdvisorModalProps> = ({
  isOpen,
  onClose,
  project,
  initialTab = 'scurve',
}) => {
  const [activeTab, setActiveTab] = useState<'scurve' | 'report' | 'audit' | 'chat'>(initialTab);

  // States for S-Curve Analysis
  const [isAnalyzingSCurve, setIsAnalyzingSCurve] = useState(false);
  const [scurveAnalysisData, setScurveAnalysisData] = useState<any | null>(null);
  const [scurveError, setScurveError] = useState<string | null>(null);

  // States for Executive Report
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // States for RAB Audit
  const [isAuditingRab, setIsAuditingRab] = useState(false);
  const [rabAuditData, setRabAuditData] = useState<any | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // States for AI Chat
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: 'user' | 'model'; text: string; time: string }>
  >([
    {
      id: 'welcome',
      role: 'model',
      text: `Halo! Saya Asisten AI Konsultan Proyek untuk "${project.name}". Anda dapat menanyakan strategi percepatan kurva S, perhitungan volume pekerjaan, estimasi material, atau kendala lapangan. Apa yang ingin Anda diskusikan?`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  if (!isOpen) return null;

  // Calculate current project metrics
  const sPoints = calculateSCurvePoints(project);
  const lastRealizedPoint =
    [...sPoints].reverse().find((p) => p.isCompletedPeriod) || sPoints[0] || {
      periodNumber: 1,
      plannedCumulative: 0,
      actualCumulative: 0,
      deviation: 0,
    };

  const plannedCum = lastRealizedPoint.plannedCumulative;
  const actualCum = lastRealizedPoint.actualCumulative;
  const dev = lastRealizedPoint.deviation;
  const spi = plannedCum > 0 ? actualCum / plannedCum : 1;

  // Critical items
  const criticalItems = project.rabItems
    .map((item) => {
      const realizedVol = project.dailyReports
        .filter((r) => r.rabItemId === item.id)
        .reduce((sum, r) => sum + r.volumeProgress, 0);
      const realPct = item.volume > 0 ? (realizedVol / item.volume) * 100 : 0;
      const plannedWeightSoFar = project.plannedDistributions
        .filter((d) => d.rabItemId === item.id)
        .reduce((sum, d) => {
          let pSum = 0;
          for (let p = 1; p <= lastRealizedPoint.periodNumber; p++) {
            pSum += d.periodWeights?.[p] || 0;
          }
          return sum + pSum;
        }, 0);
      const actualWeightSoFar = (realPct / 100) * item.weightPercentage;
      const deviation = actualWeightSoFar - plannedWeightSoFar;

      return {
        code: item.code || '-',
        description: item.description,
        weightPercentage: item.weightPercentage,
        realizationPercentage: realPct,
        deviation,
      };
    })
    .filter((it) => it.deviation < -0.1 || it.weightPercentage > 15)
    .sort((a, b) => a.deviation - b.deviation);

  // Run S-Curve Risk Analysis
  const handleAnalyzeSCurve = async () => {
    setIsAnalyzingSCurve(true);
    setScurveError(null);
    try {
      const res = await fetch('/api/gemini/analyze-scurve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          contractValue: project.totalContractValue,
          totalPeriods: project.totalPeriods,
          currentPeriod: lastRealizedPoint.periodNumber,
          plannedCumulative: plannedCum,
          actualCumulative: actualCum,
          deviation: dev,
          spi,
          criticalItems: criticalItems.slice(0, 8),
          recentDailyNotes: project.dailyReports
            .slice(-10)
            .map((r) => r.notes)
            .filter(Boolean) as string[],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal melakukan analisis Kurva S.');
      }

      const data = await res.json();
      setScurveAnalysisData(data);
    } catch (err: any) {
      console.error(err);
      setScurveError(err.message || 'Terjadi kesalahan saat memanggil Gemini AI.');
    } finally {
      setIsAnalyzingSCurve(false);
    }
  };

  // Run Executive Report Generator
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const activeItems = project.rabItems
        .filter((it) => {
          const rep = project.dailyReports.filter((r) => r.rabItemId === it.id);
          return rep.length > 0;
        })
        .map((it) => it.description)
        .slice(0, 6);

      const res = await fetch('/api/gemini/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          periodNumber: lastRealizedPoint.periodNumber,
          dateRange: (lastRealizedPoint as any).dateRangeStr || `Minggu ${lastRealizedPoint.periodNumber}`,
          plannedCumulative: plannedCum,
          actualCumulative: actualCum,
          deviation: dev,
          completedItemsThisWeek: activeItems.slice(0, 3),
          activeItemsThisWeek: activeItems.slice(3, 6),
          weatherSummary: 'Dominan Cerah, beberapa hari hujan lokal',
          workerSummary: `${project.dailyReports.length > 0 ? 'Tukang & Pekerja aktif di lapangan' : 'Kapasitas standar'}`,
          siteNotes: project.dailyReports
            .slice(-8)
            .map((r) => r.notes)
            .filter(Boolean) as string[],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal membuat narasi laporan.');
      }

      const data = await res.json();
      setGeneratedReportText(data.markdownReport);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || 'Gagal menghasilkan narasi laporan.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Run RAB Audit
  const handleAuditRab = async () => {
    setIsAuditingRab(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/gemini/sanity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          totalContractValue: project.totalContractValue,
          items: project.rabItems.slice(0, 60),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal melakukan audit RAB.');
      }

      const data = await res.json();
      setRabAuditData(data);
    } catch (err: any) {
      console.error(err);
      setAuditError(err.message || 'Terjadi kesalahan saat mengaudit RAB.');
    } finally {
      setIsAuditingRab(false);
    }
  };

  // Handle Send Chat
  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || isChatSending) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectContext: {
            name: project.name,
            code: project.code,
            client: project.client,
            contractValue: project.totalContractValue,
            totalWeeks: project.totalPeriods,
            currentWeek: lastRealizedPoint.periodNumber,
            plannedProgress: plannedCum,
            actualProgress: actualCum,
            deviation: dev,
            itemCount: project.rabItems.length,
            dailyReportCount: project.dailyReports.length,
          },
          userMessage: textToSend,
          chatHistory: chatMessages.slice(-6).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menghubungi asisten AI.');
      }

      const data = await res.json();
      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model' as const,
        text: data.reply,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'model' as const,
        text: `⚠️ Maaf, terjadi kendala saat memproses: ${err.message}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Asisten Konsultan AI Proyek
                </h2>
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full tracking-wider">
                  GEMINI 3.7
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Analisis Kurva S, Laporan Otomatis &amp; Audit Teknis untuk: <strong>{project.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-2 flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('scurve')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'scurve'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-amber-500 shrink-0" />
            <span>1. Analisis Kurva S &amp; Catch-Up</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'report'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            <span>2. Narasi Laporan Mingguan</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>3. Audit &amp; Cek Kelayakan RAB</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-500 shrink-0" />
            <span>4. Tanya Konsultan AI</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: S-CURVE RISK & CATCH-UP PLAN */}
          {activeTab === 'scurve' && (
            <div className="space-y-4">
              {/* Snapshot Metric Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Minggu Evaluasi</span>
                  <strong className="text-slate-900 text-sm font-mono">Minggu {lastRealizedPoint.periodNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Target Rencana</span>
                  <strong className="text-slate-900 text-sm font-mono">{formatPercent(plannedCum)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Realisasi Fisik</span>
                  <strong className="text-slate-900 text-sm font-mono">{formatPercent(actualCum)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Deviasi Kurva S</span>
                  <strong
                    className={`text-sm font-mono flex items-center gap-1 ${
                      dev < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {dev < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {dev >= 0 ? '+' : ''}{formatPercent(dev)}
                  </strong>
                </div>
              </div>

              {!scurveAnalysisData && !isAnalyzingSCurve && (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Analisis Risiko Keterlambatan &amp; Rencana Percepatan (Catch-up Plan)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gemini AI akan mengevaluasi titik deviasi Kurva S, mendiagnosis pekerjaan kritis yang lambat, dan menyusun langkah percepatan (tambah tukang, shift lembur, urutan kerja).
                  </p>
                  <button
                    onClick={handleAnalyzeSCurve}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Mulai Analisis Kurva S Sekarang</span>
                  </button>
                </div>
              )}

              {isAnalyzingSCurve && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">Sedang Menganalisis Kurva S &amp; Log Proyek...</div>
                  <p className="text-xs text-slate-400">Gemini 3.7 sedang menghitung skenario percepatan fisik...</p>
                </div>
              )}

              {scurveError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{scurveError}</span>
                </div>
              )}

              {scurveAnalysisData && !isAnalyzingSCurve && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                          scurveAnalysisData.healthStatus === 'KRITIS'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : scurveAnalysisData.healthStatus === 'WASPADA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        Status: {scurveAnalysisData.statusLabel || scurveAnalysisData.healthStatus}
                      </span>
                    </div>

                    <button
                      onClick={handleAnalyzeSCurve}
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Analisis Ulang</span>
                    </button>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-1.5 shadow-xs">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Diagnosis Eksekutif AI:
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-200 font-medium">
                      {scurveAnalysisData.executiveSummary}
                    </p>
                  </div>

                  {/* Root Cause & Projected Completion */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Identifikasi Akar Masalah (Root Causes)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {scurveAnalysisData.rootCauseAnalysis?.map((rc: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{rc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Prakiraan Waktu Penyelesaian
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {scurveAnalysisData.projectedCompletion ||
                          'Proyek memerlukan tindakan mitigasi agar tidak melampaui tanggal akhir kontrak.'}
                      </p>
                    </div>
                  </div>

                  {/* Catch-Up Plan Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Rencana Aksi Percepatan (Catch-Up Action Plan)
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">No</th>
                            <th className="py-2.5 px-3">Tindakan Mitigasi</th>
                            <th className="py-2.5 px-3">Item Sasaran</th>
                            <th className="py-2.5 px-3">Dampak Progres</th>
                            <th className="py-2.5 px-3 text-center">Prioritas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {scurveAnalysisData.catchUpPlan?.map((plan: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                                {plan.step || idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{plan.action}</td>
                              <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                {plan.targetItem}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-700 font-medium">{plan.impact}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    plan.priority === 'HIGH'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {plan.priority}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Resource recommendations */}
                  {scurveAnalysisData.resourceRecommendations && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200/70 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-600" />
                          Tenaga Kerja &amp; Shift:
                        </span>
                        <p className="text-slate-700">
                          {scurveAnalysisData.resourceRecommendations.manpower} (
                          {scurveAnalysisData.resourceRecommendations.scheduleShift})
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Hammer className="w-3.5 h-3.5 text-amber-600" />
                          Material &amp; Alat:
                        </span>
                        <p className="text-slate-700">
                          {scurveAnalysisData.resourceRecommendations.material} -{' '}
                          {scurveAnalysisData.resourceRecommendations.equipment}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXECUTIVE REPORT GENERATOR */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              {!generatedReportText && !isGeneratingReport && (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Auto-Generate Narasi Laporan Mingguan Resmi
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gemini AI akan merangkum seluruh deviasi Kurva S, log harian, progres pekerjaan, dan cuaca menjadi narasi laporan eksekutif resmi yang siap diserahkan ke Owner/Klien atau dicetak ke PDF.
                  </p>
                  <button
                    onClick={handleGenerateReport}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buat Narasi Laporan Minggu {lastRealizedPoint.periodNumber}</span>
                  </button>
                </div>
              )}

              {isGeneratingReport && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">Menyusun Narasi Laporan Resmi...</div>
                  <p className="text-xs text-slate-400">Merangkum data lapangan ke format laporan standar konsultan...</p>
                </div>
              )}

              {reportError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              {generatedReportText && !isGeneratingReport && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Draft Narasi Resmi Minggu Ke-{lastRealizedPoint.periodNumber}:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(generatedReportText)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedReport ? 'Tersalin!' : 'Salin Teks'}</span>
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Generate Ulang</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs text-xs sm:text-sm leading-relaxed text-slate-800 font-sans whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                    {generatedReportText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAB SANITY CHECK & AUDITING */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {!rabAuditData && !isAuditingRab && (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Pemeriksa Kualitas &amp; Anomali RAB (AI Cost Sanity Check)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gemini AI memindai seluruh item RAB untuk mendeteksi satuan yang tidak wajar, harga satuan ekstrem di luar standar AHSP, item pekerjaan berisiko tunggal, serta item struktural penting yang mungkin terlewat.
                  </p>
                  <button
                    onClick={handleAuditRab}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Audit {project.rabItems.length} Item RAB Sekarang</span>
                  </button>
                </div>
              )}

              {isAuditingRab && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">Memeriksa Seluruh Susunan RAB...</div>
                  <p className="text-xs text-slate-400">Membandingkan dengan kaidah teknik sipil &amp; AHSP...</p>
                </div>
              )}

              {auditError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{auditError}</span>
                </div>
              )}

              {rabAuditData && !isAuditingRab && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Health Score Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-amber-400 font-mono">
                        {rabAuditData.rabHealthScore}/100
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-300">Skor Kualitas Susunan RAB</div>
                        <div className="text-[11px] text-slate-400">
                          Status: <strong className="text-white">{rabAuditData.overallVerdict}</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleAuditRab}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Audit Ulang</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                    "{rabAuditData.summary}"
                  </p>

                  {/* Findings */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      Temuan &amp; Rekomendasi Auditor ({rabAuditData.findings?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {rabAuditData.findings?.map((f: any, i: number) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                            f.severity === 'CRITICAL'
                              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                              : f.severity === 'WARNING'
                              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                              : 'bg-blue-50/80 border-blue-200 text-blue-950'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border">
                                {f.itemCode || 'ITEM'}
                              </span>
                              <span>{f.issue}</span>
                            </span>
                            <span className="text-[10px] uppercase font-black">{f.severity}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 pt-1">
                            <strong>Solusi:</strong> {f.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing scopes if any */}
                  {rabAuditData.missingScopeSuggestions && rabAuditData.missingScopeSuggestions.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-800">Usulan Pekerjaan Pelengkap yang Mungkin Perlu Ditambahkan:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        {rabAuditData.missingScopeSuggestions.map((sug: string, i: number) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERACTIVE AI CONSULTANT CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4 flex flex-col h-[52vh]">
              {/* Preset question chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">Tanya Cepat:</span>
                {[
                  'Bagaimana mengejar deviasi keterlambatan saat ini?',
                  'Berapa estimasi kebutuhan semen & pasir untuk plesteran?',
                  'Tips mempercepat pekerjaan pengecoran beton?',
                  'Cara menghitung bobot Kurva S yang ideal?',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(preset)}
                    disabled={isChatSending}
                    className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      <div
                        className={`text-[9px] mt-1 text-right ${
                          msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}

                {isChatSending && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Konsultan AI sedang menyusun jawaban...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Tanyakan hal apa pun seputar proyek, Kurva S, atau metode kerja..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isChatSending}
                  className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                  title="Kirim Pertanyaan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3.5 sm:px-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Didukung oleh model AI Google Gemini 3.7 Flash</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
