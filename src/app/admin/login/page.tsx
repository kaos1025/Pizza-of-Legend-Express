'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const submitPin = async (pinValue: string) => {
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
        setError('\uc798\ubabb\ub41c PIN\uc785\ub2c8\ub2e4');
        setPin('');
      }
    } catch {
      setError('\uc11c\ubc84 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen bg-pizza-dark flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Pizza of Legend</h1>
        <p className="text-gray-400 text-sm mt-1">{'\uad00\ub9ac\uc790 \uc778\uc99d'}</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              i < pin.length ? 'bg-pizza-red' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4 animate-pulse">{error}</p>
      )}

      {loading && (
        <p className="text-gray-400 text-sm mb-4">{'\ud655\uc778 \uc911...'}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((digit, i) => {
          if (digit === '') return <div key={i} />;
          if (digit === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="h-14 rounded-xl bg-gray-700 text-white text-lg font-medium hover:bg-gray-600 active:bg-gray-500 transition-colors"
              >
                {'\u2190'}
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="h-14 rounded-xl bg-gray-800 text-white text-xl font-medium hover:bg-gray-700 active:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {digit}
            </button>
          );
        })}
      </div>
    </div>
  );
}
