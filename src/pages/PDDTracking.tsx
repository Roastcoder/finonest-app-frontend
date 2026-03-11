import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const PDD_DATA = [
  { loanId: 'CL-2025-001', applicant: 'Arjun Mehta', docs: [
    { name: 'RC Copy', status: 'completed' },
    { name: 'Insurance Copy', status: 'completed' },
    { name: 'NACH', status: 'pending' },
    { name: 'Bank Statement', status: 'pending' },
    { name: 'Income Proof', status: 'completed' },
  ]},
  { loanId: 'CL-2025-002', applicant: 'Sneha Reddy', docs: [
    { name: 'RC Copy', status: 'pending' },
    { name: 'Insurance Copy', status: 'overdue' },
    { name: 'NACH', status: 'completed' },
    { name: 'Bank Statement', status: 'completed' },
    { name: 'Income Proof', status: 'completed' },
  ]},
];

const statusIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle2 size={16} className="text-success" />;
  if (status === 'overdue') return <AlertTriangle size={16} className="text-destructive" />;
  return <Clock size={16} className="text-warning" />;
};

export default function PDDTracking() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">PDD Tracking</h1>
      <p className="text-sm text-muted-foreground mb-6">Post Disbursement Documents status</p>

      <div className="space-y-4">
        {PDD_DATA.map(item => (
          <div key={item.loanId} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="mono text-xs text-accent font-medium">{item.loanId}</span>
                <p className="font-medium text-foreground">{item.applicant}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.docs.filter(d => d.status === 'completed').length}/{item.docs.length} completed
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {item.docs.map(doc => (
                <div key={doc.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  {statusIcon(doc.status)}
                  <span className="text-sm text-foreground">{doc.name}</span>
                  <span className={`ml-auto text-xs font-medium capitalize ${
                    doc.status === 'completed' ? 'text-success' : doc.status === 'overdue' ? 'text-destructive' : 'text-warning'
                  }`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
