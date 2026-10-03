import React from 'react';
import { Hazard, RouteEvent } from '../../types';
import { realtimeSync } from '../../services/realtimeSync';
import { getTranslation } from '../../services/i18n';

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: Hazard[];
  routeEvents: RouteEvent[];
  language?: 'en' | 'hi';
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  hazards,
  routeEvents,
  language = 'en',
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const t = getTranslation(language);
  const activeHazards = hazards.filter((h) => h.status === 'ACTIVE');
  const recentEvents = (routeEvents || []).slice(0, 4);

  const handleResolve = (hazardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    realtimeSync.resolveHazard(hazardId);
  };

  const handleResolveAll = () => {
    realtimeSync.resolveAllHazards();
  };

  const handleTabClick = (tabName: string) => {
    if (onNavigateTab) {
      onNavigateTab(tabName);
    }
    onClose();
  };

  return (
    <>
      {/* Invisible fixed backdrop for clean dismissal on outside click */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Dropdown Container */}
      <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-96 bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal-content flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#AEF5F0]/15 text-[#AEF5F0] flex items-center justify-center border border-[#AEF5F0]/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{t.notificationsTitle}</span>
                {activeHazards.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {activeHazards.length}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {activeHazards.length > 0 ? `${activeHazards.length} ${t.activeHazardsCount}` : t.allClearNotice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeHazards.length > 0 && (
              <button
                type="button"
                onClick={handleResolveAll}
                className="text-[10px] text-slate-400 hover:text-emerald-400 transition px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] cursor-pointer"
                title={t.markAllRead}
              >
                {t.markAllRead}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262D] transition cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Alerts Content */}
        <div className="overflow-y-auto divide-y divide-[#30363D] max-h-[60vh]">
          {/* Active Hazards Section */}
          {activeHazards.length > 0 ? (
            <div className="p-2 space-y-2">
              <div className="px-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                {t.activeHazards} ({activeHazards.length})
              </div>
              {activeHazards.map((hazard) => (
                <div
                  key={hazard.hazardId}
                  className="p-2.5 rounded-xl bg-[#21262D] hover:bg-[#282E38] border border-[#30363D] transition space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {hazard.type.includes('Bridge')
                          ? '🌉'
                          : hazard.type.includes('Water')
                          ? '🌊'
                          : hazard.type.includes('Blockage')
                          ? '🚧'
                          : '⚠️'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">{hazard.type}</div>
                        <div className="text-[11px] text-slate-300 font-medium">{hazard.locationName}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        hazard.severity === 'CRITICAL' || hazard.severity === 'BLOCKED'
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {hazard.severity}
                    </span>
                  </div>

                  {hazard.description && (
                    <p className="text-[10px] text-slate-400 pl-6 leading-relaxed line-clamp-2">
                      {hazard.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pl-6 pt-1 text-[10px] text-slate-400">
                    <span className="font-mono text-cyan-400">
                      📍 {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleResolve(hazard.hazardId, e)}
                      className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
                    >
                      ✓ {t.dismiss}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-lg">
                ✓
              </div>
              <div className="text-xs font-bold text-white">{t.noNotifications}</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {t.allClearNotice}
              </p>
            </div>
          )}

          {/* Recent Route Events Section */}
          {recentEvents.length > 0 && (
            <div className="p-2 space-y-1.5 bg-[#0D1117]/50">
              <div className="px-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                {t.tabRouteEvents}
              </div>
              {recentEvents.map((evt) => (
                <div key={evt.id} className="p-2 rounded-lg bg-[#161B22] border border-[#30363D] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-medium text-white">{evt.event}</span>
                    <span className="text-[10px] font-mono text-slate-400">{evt.time}</span>
                  </div>
                  {evt.details && (
                    <div className="text-[10px] text-slate-400 truncate">{evt.details}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 bg-[#0D1117] border-t border-[#30363D] grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleTabClick('Hazards')}
            className="py-1.5 px-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-center font-medium transition cursor-pointer"
          >
            {t.viewAllHazards}
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('System Logs')}
            className="py-1.5 px-3 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-slate-200 border border-[#30363D] text-center font-medium transition cursor-pointer"
          >
            {t.viewSystemLogs}
          </button>
        </div>
      </div>
    </>
  );
};
