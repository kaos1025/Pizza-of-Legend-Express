'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const submitPin = useCallback(async (pinValue: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(true);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
        setTimeout(() => setError(false), 2000);
        hiddenInputRef.current?.focus();
      }
    } catch {
      setError(true);
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleDigit = useCallback((digit: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  }, [pin, loading, submitPin]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }, [loading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleDelete();
    }
  }, [handleDigit, handleDelete]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center justify-center px-4"
      onClick={() => hiddenInputRef.current?.focus()}
    >
      {/* Hidden input for keyboard support */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="numeric"
        autoFocus
        className="absolute opacity-0 w-0 h-0"
        onKeyDown={handleKeyDown}
        value=""
        onChange={() => {}}
        aria-label="PIN input"
      />

      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/images/logo.jpg"
          alt="Pizza of Legend"
          width={120}
          height={120}
          className="rounded-2xl object-contain mx-auto"
          priority
        />
      </div>

      {/* Brand text */}
      <h1 className="text-2xl font-bold text-white mb-1">Pizza of Legend</h1>
      <p className="text-sm text-gray-500 mb-8">Admin Access</p>

      {/* PIN dots with shake animation */}
      <div
        className={`flex gap-4 mb-3 transition-transform ${
          shake ? '[animation:shake_0.5s_ease-in-out]' : ''
        }`}
        style={shake ? {
          animation: 'shake 0.5s ease-in-out',
        } : undefined}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              error
                ? 'bg-red-500'
                : i < pin.length
                ? 'bg-pizza-red scale-110'
                : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Status message */}
      <div className="h-6 mb-4">
        {error && (
          <p className="text-red-400 text-sm animate-pulse">잘못된 PIN입니다</p>
        )}
        {loading && (
          <p className="text-gray-500 text-sm">확인 중...</p>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((digit, i) => {
          if (digit === '') return <div key={i} />;
          if (digit === 'del') {
            return (
              <button
                key={i}
                data-testid="pin-delete"
                onClick={handleDelete}
                disabled={loading}
                className="h-14 rounded-xl bg-gray-800/50 text-gray-400 text-lg font-medium hover:bg-gray-700 active:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ←
              </button>
            );
          }
          return (
            <button
              key={i}
              data-testid={`pin-${digit}`}
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="h-14 rounded-xl bg-gray-800/80 text-white text-xl font-medium hover:bg-gray-700 active:bg-gray-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {digit}
            </button>
          );
        })}
      </div>
    </div>
  );
}
