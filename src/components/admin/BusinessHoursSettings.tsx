'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Power } from 'lucide-react';
import {
  DEFAULT_BUSINESS_HOURS,
  computeOpenState,
  type BusinessHours,
} from '@/lib/business-hours';

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  kind: ToastKind;
  message: string;
}

// "HH:MM" with HH 00–24, MM 00–59. "24:00" allowed (= midnight). Mirrors server isValidTime.
const isValidTime = (value: string): boolean => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h === 24) return min === 0;
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
};

export const BusinessHoursSettings = () => {
  const [config, setConfig] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [initial, setInitial] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/business-hours');
      if (!res.ok) throw new Error(`영업시간 로드 실패 (HTTP ${res.status})`);
      const data = (await res.json()) as BusinessHours;
      setConfig(data);
      setInitial(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '영업시간 설정 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!isValidTime(config.open)) {
      showToast('error', '오픈 시간은 HH:MM 형식이어야 합니다 (예: 12:00)');
      return;
    }
    if (!isValidTime(config.close)) {
      showToast('error', '마감 시간은 HH:MM 형식이어야 합니다 (24:00 허용)');
      return;
    }
    setBusy('save');
    try {
      const res = await fetch('/api/admin/settings/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          open: config.open.trim(),
          close: config.close.trim(),
          manual_closed: config.manual_closed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as BusinessHours | { error?: string };
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const saved = data as BusinessHours;
      setConfig(saved);
      setInitial(saved);
      showToast('success', '영업시간 설정이 저장되었습니다.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setBusy(null);
    }
  };

  // 임시 휴무 토글은 즉시 저장하여 빠르게 매장을 닫을 수 있게 한다.
  const handleToggleManualClosed = async (next: boolean) => {
    setBusy('manual');
    try {
      const res = await fetch('/api/admin/settings/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_closed: next }),
      });
      const data = (await res.json().catch(() => ({}))) as BusinessHours | { error?: string };
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const saved = data as BusinessHours;
      setConfig(saved);
      setInitial(saved);
      showToast(next ? 'success' : 'info', next ? '🔴 임시 휴무 ON — 즉시 마감되었습니다.' : '임시 휴무 OFF — 정규 영업시간으로 복귀합니다.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '임시 휴무 변경 실패');
      // 실패 시 UI 롤백
      setConfig((c) => ({ ...c, manual_closed: !next }));
    } finally {
      setBusy(null);
    }
  };

  const isDirty =
    config.enabled !== initial.enabled ||
    config.open !== initial.open ||
    config.close !== initial.close;

  const state = computeOpenState(config);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.kind === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : toast.kind === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header>
        <h1 className="text-xl font-bold text-gray-900">영업시간 설정</h1>
        <p className="text-sm text-gray-600 mt-1">
          매장 영업시간을 설정합니다. 영업시간 외에는 고객 주문이 차단됩니다. (기준 시간대: Asia/Seoul)
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중…</div>
      ) : (
        <>
          {/* 현재 상태 미리보기 */}
          <section className="rounded-lg bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">현재 상태:</span>
              {state.isOpen ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 영업중
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  {state.reason === 'closed_manual' ? '임시 휴무' : '영업종료'}
                </span>
              )}
            </div>
          </section>

          {/* 임시 휴무 — 강조 스위치 */}
          <section
            className={`rounded-lg border p-5 space-y-3 transition-colors ${
              config.manual_closed
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Power
                  className={`w-5 h-5 ${config.manual_closed ? 'text-red-600' : 'text-gray-400'}`}
                />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">임시 휴무</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    재료 소진·개인사정 등으로 <strong>즉시 마감</strong>할 때 사용. 영업시간과 무관하게 모든 주문이 차단됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.manual_closed}
                disabled={!!busy}
                onClick={() => handleToggleManualClosed(!config.manual_closed)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  config.manual_closed ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    config.manual_closed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {config.manual_closed && (
              <div className="flex gap-2 items-center text-sm text-red-800 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                현재 임시 휴무 상태입니다. 고객은 주문할 수 없습니다.
              </div>
            )}
          </section>

          {/* 정규 영업시간 */}
          <section className="rounded-lg bg-white border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-pizza-red" />
              <h2 className="text-base font-semibold text-gray-900">정규 영업시간</h2>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
                className="w-4 h-4 accent-pizza-red"
              />
              영업시간 차단 사용
            </label>
            <p className="text-xs text-gray-500 -mt-2 pl-6">
              끄면 영업시간과 무관하게 24시간 주문이 허용됩니다.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">오픈 시간</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={config.open}
                  onChange={(e) => setConfig((c) => ({ ...c, open: e.target.value }))}
                  placeholder="12:00"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pizza-red/40 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">마감 시간</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={config.close}
                  onChange={(e) => setConfig((c) => ({ ...c, close: e.target.value }))}
                  placeholder="24:00"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pizza-red/40 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              24시간제 <span className="font-mono">HH:MM</span> 형식. 자정 마감은{' '}
              <span className="font-mono">24:00</span> 으로 입력하세요. 마감이 오픈보다 이르면 자정을 넘기는 영업으로 처리됩니다.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={!!busy || !isDirty}
                className="px-4 py-2 rounded-md bg-pizza-red text-white text-sm font-medium hover:bg-pizza-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === 'save' ? '저장 중…' : '💾 저장'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
