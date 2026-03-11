import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Plus } from "lucide-react";

export default function InsuranceModule() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage external vehicle insurance policies attached to loans.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all">
                        <Plus size={16} /> Add Policy
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
                <h2 className="text-lg font-bold mb-4">Active Policies</h2>
                <div className="text-center text-gray-500 py-12">
                    Insurance tracking development in progress...
                </div>
            </div>
        </div>
    );
}
