import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Search, Plus } from "lucide-react";

export default function PayoutManagement() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage DSA payouts and auto-calculated ledger rules.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all">
                        <Plus size={16} /> Configure Policy
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Pending Payouts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">₹ 14,50,000</div>
                    </CardContent>
                </Card>
            </div>

            <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
                <h2 className="text-lg font-bold mb-4">Payout Ledger</h2>
                <div className="text-center text-gray-500 py-12">
                    Ledger development in progress...
                </div>
            </div>
        </div>
    );
}
