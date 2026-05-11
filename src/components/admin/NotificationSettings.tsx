'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  RefreshCw,
  Trash2,
  Send,
} from 'lucide-react';
import {
  getCurrentSubscription,
  isPushSupported,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/subscribe';

interface DeviceRow {
  id: string;
  endpoint: string;
  endpointMasked: string;
  userAgent: string | null;
  deviceLabel: string | null;
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

type ToastKind = 'success' | 'error' | 'info';
interface ToastState {
  kind: ToastKind;
  message: string;
}

export const NotificationSettings = () => {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // 어떤 작업 중인지 키
  const [toast, setToast] = useState<ToastState | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [foregroundReceived, setForegroundReceived] = useState<number>(0);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sub = await getCurrentSubscription();
      setCurrentEndpoint(sub?.endpoint ?? null);

      const res = await fetch('/api/admin/push/devices');
      if (!res.ok) throw new Error(`devices fetch failed (HTTP ${res.status})`);
      const data = (await res.json()) as { devices: DeviceRow[] };
      setDevices(data.devices);

      // 현재 디바이스가 등록되어 있으면 deviceLabel 미리 채워주기
      if (sub) {
        const matched = data.devices.find((d) => d.endpoint === sub.endpoint);
        if (matched?.deviceLabel) setDeviceLabel(matched.deviceLabel);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 초기 로드
  useEffect(() => {
    setSupported(isPushSupported());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    setIosNeedsInstall(detectIOSNeedsInstall());
    void refresh();
  }, [refresh]);

  // SW message 리스너 (foreground push 수신 표시)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED_FOREGROUND') {
        setForegroundReceived((n) => n + 1);
        showToast('info', '🍕 포그라운드 푸시 수신됨 (알림 토스트 대신 메시지로 도착)');
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [showToast]);

  const handleRegister = async () => {
    setBusy('register');
    try {
      const result = await subscribeToPush({
        deviceLabel: deviceLabel.trim() || guessDeviceLabel(),
      });
      setCurrentEndpoint(result.subscription.endpoint);
      setPermission('granted');
      showToast('success', '이 기기가 등록되었습니다. 테스트 알림을 보내볼까요?');
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : '등록 실패';
      showToast('error', message);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    } finally {
      setBusy(null);
    }
  };

  const handleUnregister = async () => {
    if (!confirm('이 기기에서 알림 수신을 해제할까요?')) return;
    setBusy('unregister');
    try {
      await unsubscribeFromPush();
      setCurrentEndpoint(null);
      showToast('success', '이 기기에서 알림 수신이 해제되었습니다.');
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '해제 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy('test');
    try {
      const result = await sendTestPush();
      const pushMsg = `Push 총 ${result.total}대 / 성공 ${result.sent} / 실패 ${result.failed}`;
      const tg = result.telegram;
      const tgMsg = tg
        ? tg.enabled
          ? tg.sent
            ? ' · Telegram 발사됨'
            : ' · Telegram 실패'
          : ' · Telegram 비활성'
        : '';
      showToast('success', `테스트 결과: ${pushMsg}${tgMsg}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '테스트 발사 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleDeactivateDevice = async (endpoint: string) => {
    if (!confirm('이 기기의 알림을 해제할까요? (비활성화)')) return;
    setBusy(endpoint);
    try {
      const res = await fetch('/api/admin/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '해제되었습니다.');
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '해제 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteDevice = async (endpoint: string) => {
    if (!confirm('이 기기 등록을 완전히 삭제할까요? (되돌릴 수 없음)')) return;
    setBusy(endpoint);
    try {
      const res = await fetch(
        `/api/admin/push/devices?endpoint=${encodeURIComponent(endpoint)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('success', '삭제되었습니다.');
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setBusy(null);
    }
  };

  const isThisDeviceRegistered =
    !!currentEndpoint && devices.some((d) => d.endpoint === currentEndpoint && d.isActive);

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
        <h1 className="text-xl font-bold text-gray-900">알림 설정</h1>
        <p className="text-sm text-gray-600 mt-1">
          새 주문이 들어왔을 때 등록한 디바이스로 푸시 알림을 보냅니다.
        </p>
      </header>

      {/* 미지원 환경 */}
      {supported === false && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            이 브라우저는 Web Push 를 지원하지 않습니다. Chrome / Edge / iOS Safari 16.4+ (홈 화면 추가)를 사용해주세요.
          </div>
        </div>
      )}

      {/* iOS 홈화면 추가 안내 */}
      {iosNeedsInstall && supported !== false && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
          <div className="flex gap-2 items-center text-blue-900 font-semibold">
            <Smartphone className="w-4 h-4" />
            iOS 안내
          </div>
          <p className="text-sm text-blue-800">
            iOS 는 <strong>홈 화면에 추가</strong>해야 푸시 알림이 동작합니다.
          </p>
          <ol className="text-sm text-blue-800 list-decimal pl-5 space-y-1">
            <li>Safari 하단 <strong>공유</strong> 버튼 탭</li>
            <li><strong>홈 화면에 추가</strong> 선택</li>
            <li>홈 화면 아이콘으로 이 페이지를 다시 열고 등록</li>
          </ol>
        </div>
      )}

      {/* 권한 거부 안내 */}
      {permission === 'denied' && supported !== false && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            알림 권한이 <strong>거부</strong>되어 있습니다. 주소창 좌측 자물쇠 아이콘 →{' '}
            알림(Notifications) → <strong>Allow</strong> 로 변경 후 다시 시도해주세요.
          </div>
        </div>
      )}

      {/* 이 기기 카드 */}
      <section className="rounded-lg bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-pizza-red" />
          <h2 className="text-base font-semibold text-gray-900">이 기기</h2>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">상태:</span>
          {isThisDeviceRegistered ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> 활성화
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
              <BellOff className="w-3.5 h-3.5" /> 미등록
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">디바이스 별명</label>
          <input
            type="text"
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder={guessDeviceLabel()}
            maxLength={60}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pizza-red/40"
          />
          <p className="text-xs text-gray-500 mt-1">
            예: &quot;사장님 iPhone&quot;, &quot;매장 PC&quot;. 비워두면 브라우저 정보로 자동 지정.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isThisDeviceRegistered ? (
            <button
              onClick={handleRegister}
              disabled={!!busy || supported === false || permission === 'denied'}
              className="px-4 py-2 rounded-md bg-pizza-red text-white text-sm font-medium hover:bg-pizza-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === 'register' ? '등록 중…' : '이 기기 등록'}
            </button>
          ) : (
            <>
              <button
                onClick={handleRegister}
                disabled={!!busy}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                title="별명 또는 정보 갱신"
              >
                {busy === 'register' ? '갱신 중…' : '정보 갱신'}
              </button>
              <button
                onClick={handleUnregister}
                disabled={!!busy}
                className="px-4 py-2 rounded-md border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {busy === 'unregister' ? '해제 중…' : '등록 해제'}
              </button>
            </>
          )}
          <button
            onClick={handleTest}
            disabled={!!busy}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            {busy === 'test' ? '발사 중…' : '🧪 테스트 알림 보내기'}
          </button>
        </div>

        {foregroundReceived > 0 && (
          <div className="text-xs text-gray-500">
            포그라운드 푸시 수신 카운트:{' '}
            <span className="font-mono font-semibold">{foregroundReceived}</span>
          </div>
        )}
      </section>

      {/* 등록된 모든 기기 */}
      <section className="rounded-lg bg-white border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            등록된 기기 ({devices.length})
          </h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            등록된 기기가 없습니다. 위 &quot;이 기기 등록&quot; 으로 추가해주세요.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {devices.map((d) => {
              const isCurrent = d.endpoint === currentEndpoint;
              return (
                <li key={d.id} className="py-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    {guessDeviceIcon(d.userAgent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {d.deviceLabel || '(이름 없음)'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase tracking-wide bg-pizza-red/10 text-pizza-red px-1.5 py-0.5 rounded">
                          이 기기
                        </span>
                      )}
                      {d.isActive ? (
                        <span className="text-xs text-green-700">활성</span>
                      ) : (
                        <span className="text-xs text-gray-500">비활성</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <span className="font-mono">{d.endpointMasked}</span>
                      {d.failureCount > 0 && (
                        <span className="ml-2 text-orange-600">실패 {d.failureCount}회</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {d.lastSuccessAt && <>마지막 수신: {formatRelative(d.lastSuccessAt)}</>}
                      {!d.lastSuccessAt && d.lastFailureAt && (
                        <>마지막 실패: {formatRelative(d.lastFailureAt)}</>
                      )}
                      {!d.lastSuccessAt && !d.lastFailureAt && (
                        <>등록: {formatRelative(d.createdAt)}</>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {d.isActive ? (
                      <button
                        onClick={() => handleDeactivateDevice(d.endpoint)}
                        disabled={busy === d.endpoint}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        해제
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteDevice(d.endpoint)}
                        disabled={busy === d.endpoint}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-500 text-center pt-2">
        Push 알림은 페이지가 백그라운드일 때만 표시됩니다. <br />
        활성 상태일 때는 기존 화면 내 알림(TTS) 로직이 처리합니다.
      </p>
    </div>
  );
};

// ============================================================
// Helpers
// ============================================================

function detectIOSNeedsInstall(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return false;
  return true;
}

function guessDeviceLabel(): string {
  if (typeof navigator === 'undefined') return '내 기기';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return '내 기기';
}

function guessDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Monitor className="w-5 h-5 text-gray-500" />;
  if (/iPhone|iPad|iPod|Android/.test(userAgent)) {
    return <Smartphone className="w-5 h-5 text-gray-500" />;
  }
  return <Monitor className="w-5 h-5 text-gray-500" />;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  if (diff < 0) return '방금';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
