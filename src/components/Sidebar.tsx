import React from 'react';
import { LayoutDashboard, FileSpreadsheet, CalendarRange, ClipboardList } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type ActiveTab = 'dashboard' | 'rab-import' | 'timeline' | 'daily-report';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  dailyReportsCount: number;
  rabItemsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  dailyReportsCount,
  rabItemsCount,
}) => {
  const { t, language } = useLanguage();

  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: t.tabDashboard,
      icon: LayoutDashboard,
      badge: null,
      description: 'Grafik Kurva S & Status Deviasi',
    },
    {
      id: 'rab-import' as ActiveTab,
      label: t.tabRab,
      icon: FileSpreadsheet,
      badge: rabItemsCount > 0 ? `${rabItemsCount} ${language === 'id' ? 'Item' : 'Items'}` : null,
      description: 'Upload Excel/CSV & Master Pekerjaan',
    },
    {
      id: 'timeline' as ActiveTab,
      label: t.tabTimeline,
      icon: CalendarRange,
      badge: null,
      description: 'Distribusi Bobot & Kurva Rencana',
    },
    {
      id: 'daily-report' as ActiveTab,
      label: t.tabDailyReport,
      icon: ClipboardList,
      badge: dailyReportsCount > 0 ? `${dailyReportsCount} ${language === 'id' ? 'Log' : 'Logs'}` : null,
      description: 'Input Progres & Riwayat Laporan',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-[105px] z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
