import React, { useState } from 'react';
import { Search } from "lucide-react";
import logo from '@/assets/logo.png';

export default function CustomerPortal() {
    const [phone, setPhone] = useState('');

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-transparent font-sans">
            <div className="w-full max-w-md glass-card p-8 shadow-xl text-center">
                <div className="flex justify-center mb-6">
                    <img src={logo} alt="Finonest India" className="h-14 w-auto object-contain drop-shadow-md" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Track Your Application</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Enter your registered mobile number to receive an OTP and view your loan status.</p>

                <div className="relative mb-6">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile Number"
                        className="w-full px-4 py-3 rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-black/20 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>

                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-bold shadow-md">
                    Send OTP
                </button>

                <p className="mt-6 text-xs text-gray-400 font-medium">Secured with end-to-end encryption</p>
            </div>
        </div>
    );
}
