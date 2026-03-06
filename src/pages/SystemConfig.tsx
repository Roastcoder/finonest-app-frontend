import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Sliders } from "lucide-react";

export default function SystemConfig() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage global system parameters and document rules.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400">Document Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Set mandatory docs based on case types</div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400">Stage Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Map role-based transitions for pipelines</div>
                    </CardContent>
                </Card>
            </div>

            <div className="glass-panel rounded-2xl p-6 min-h-[300px]">
                <h2 className="text-lg font-bold mb-4">Integrations Configuration</h2>
                <div className="text-center text-gray-500 py-12">
                    API and Integration settings panel development in progress...
                </div>
            </div>
        </div>
    );
}
