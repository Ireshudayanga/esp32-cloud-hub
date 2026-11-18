'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export default function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const validPin = process.env.NEXT_PUBLIC_DASHBOARD_PIN || '2026';
    if (pin === validPin) {
      sessionStorage.setItem('esp32_hub_pin', pin);
      onUnlock(pin);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-center text-slate-100">ESP32 Cloud Hub</h1>
        <p className="text-xs text-slate-400 text-center mt-1 mb-6">
          Enter your access PIN to control relays & view analytics
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            placeholder="••••"
            className="w-full text-center tracking-[0.5em] text-2xl font-mono bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-3 text-white outline-none"
            autoFocus
          />

          {error && <p className="text-xs text-rose-400 text-center font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Unlock Control Hub
          </button>
        </form>
      </div>
    </div>
  );
}