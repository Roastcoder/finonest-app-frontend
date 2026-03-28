import { ScrollSection } from '@/components/ScrollSection';
import { Users, Clock, CheckCircle2, IndianRupee, TrendingUp } from 'lucide-react';

export default function MobileDashboard() {
  const stats = [
    { label: 'Logins', value: '245', icon: Users, color: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600' },
    { label: 'In Process', value: '32', icon: Clock, color: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600' },
    { label: 'Approved', value: '28', icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600' },
    { label: 'Disbursed', value: '22', icon: IndianRupee, color: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 pb-20">
      {/* Header */}
      <ScrollSection className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back</p>
      </ScrollSection>

      <div className="px-4 py-6 space-y-6">
        {/* KPI Cards - Staggered */}
        <div className="space-y-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <ScrollSection key={stat.label} delay={index * 0.1}>
                <div className="bg-white dark:bg-gray-900/40 rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-3xl font-black text-foreground mt-2">{stat.value}</h3>
                    </div>
                    <div className={`p-3 ${stat.color} rounded-lg`}>
                      <Icon size={20} className={stat.iconColor} />
                    </div>
                  </div>
                </div>
              </ScrollSection>
            );
          })}
        </div>

        {/* Chart Section */}
        <ScrollSection delay={0.4}>
          <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="font-bold text-sm text-foreground">Performance Trend</h3>
              </div>
            </div>
            <div className="p-4 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black text-primary mb-2">↗</div>
                <p className="text-sm text-muted-foreground">Chart visualization here</p>
              </div>
            </div>
          </div>
        </ScrollSection>

        {/* Activity Section */}
        <ScrollSection delay={0.5}>
          <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-gray-50/30 dark:bg-gray-800/20">
              <h3 className="font-bold text-sm text-foreground">Recent Activity</h3>
            </div>
            <div className="divide-y divide-border/50">
              {[1, 2, 3].map((item) => (
                <div key={item} className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Loan Application #{item}</p>
                      <p className="text-xs text-muted-foreground mt-1">Status updated 2 hours ago</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollSection>

        {/* Summary Section */}
        <ScrollSection delay={0.6}>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl border border-primary/20 p-4">
            <h3 className="font-bold text-foreground mb-2">Monthly Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Logins</p>
                <p className="text-xl font-black text-primary mt-1">245</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-black text-primary mt-1">18.4%</p>
              </div>
            </div>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
