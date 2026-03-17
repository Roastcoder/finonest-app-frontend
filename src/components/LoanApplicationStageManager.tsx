import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { APPLICATION_STAGES, ApplicationStage } from '@/lib/mock-data';
import { X, Save, AlertCircle } from 'lucide-react';

interface LoanApplicationStageManagerProps {
  loan: any;
  isOpen: boolean;
  onClose: () => void;
}

interface StageFormData {
  stage: ApplicationStage;
  appScore?: number;
  creditScore?: number;
  tags?: string[];
  remarks?: string;
  loanAmount?: number;
  roi?: number;
  tenure?: number;
  loanAccountNumber?: string;
  rcType?: 'PHYSICAL_RC' | 'DIGITAL_RC';
  collectedBy?: 'SELF' | 'RTO_AGENT' | 'BANKER';
  agentName?: string;
  agentMobile?: string;
  bankerName?: string;
  bankerMobile?: string;
}

export default function LoanApplicationStageManager({ loan, isOpen, onClose }: LoanApplicationStageManagerProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<StageFormData>({
    stage: loan?.application_stage || 'SUBMITTED',
    appScore: loan?.app_score || undefined,
    creditScore: loan?.credit_score || undefined,
    tags: loan?.tags || [],
    remarks: '',
    loanAmount: loan?.loan_amount || undefined,
    roi: loan?.roi || undefined,
    tenure: loan?.tenure || undefined,
    loanAccountNumber: loan?.loan_account_number || '',
    rcType: loan?.rc_type || 'PHYSICAL_RC',
    collectedBy: loan?.rc_collected_by || 'SELF',
    agentName: loan?.rto_agent_name_rc || '',
    agentMobile: loan?.rto_agent_mobile || '',
    bankerName: loan?.banker_name || '',
    bankerMobile: loan?.banker_mobile || ''
  });

  const updateStage = useMutation({
    mutationFn: async (data: StageFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${loan.id}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update stage');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Application stage updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update application stage');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.stage === 'LOGIN' && (!formData.appScore || !formData.creditScore)) {
      toast.error('App Score and Credit Score are required for Login stage');
      return;
    }
    updateStage.mutate(formData);
  };

  const renderStageFields = () => {
    switch (formData.stage) {
      case 'SUBMITTED':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Application has been submitted and is awaiting review.</p>
          </div>
        );

      case 'LOGIN':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">App Score (0-1000) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="1000"
                  value={formData.appScore || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, appScore: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter app score (0-1000)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Credit Score (300-900) *</label>
                <input
                  type="number"
                  required
                  min="300"
                  max="900"
                  value={formData.creditScore || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, creditScore: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter credit score (300-900)"
                />
              </div>
            </div>
          </div>
        );

      case 'IN_PROCESS': {
        const PENDENCY_TAGS = [
          'Bank Statement', 'Alternate Bank Statement', 'LOAN SOA',
          'LOAN FORECLOSURE LETTER', 'NOC', 'CO-APP KYC',
          'CO-APP BANK STATEMENT', 'VEHICLE RC', 'VEHICLE VALUATION', 'FIELD INSPECTION'
        ];
        const selectedTags: string[] = formData.tags || [];
        const toggleTag = (tag: string) => {
          const updated = selectedTags.includes(tag)
            ? selectedTags.filter((t: string) => t !== tag)
            : [...selectedTags, tag];
          setFormData((prev: any) => ({ ...prev, tags: updated }));
        };
        return (
          <div className="space-y-3">
            <label className="block text-sm font-medium">Pendency Tags</label>
            <div className="grid grid-cols-2 gap-2">
              {PENDENCY_TAGS.map(tag => (
                <label key={tag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border hover:bg-muted'
                }`}>
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="text-xs">{tag}</span>
                </label>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">Selected: {selectedTags.join(', ')}</p>
            )}
          </div>
        );
      }

      case 'REJECTED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rejection Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                rows={3}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
        );

      case 'APPROVED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter loan amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter ROI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="Enter tenure"
                />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Auto-cancellation Notice</p>
                  <p>If not disbursed within 30 days, this application will automatically move to CANCELLED stage.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'DISBURSED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Loan Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.loanAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ROI (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.roi || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, roi: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tenure (months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.tenure || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Loan Account Number *</label>
              <input
                type="text"
                required
                value={formData.loanAccountNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, loanAccountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                placeholder="Enter loan account number"
              />
            </div>

            <div className="border border-border rounded-lg p-4">
              <h4 className="font-medium mb-3">Vehicle RC Status</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">RC Type *</label>
                  <select
                    required
                    value={formData.rcType}
                    onChange={(e) => setFormData(prev => ({ ...prev, rcType: e.target.value as 'PHYSICAL_RC' | 'DIGITAL_RC' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="PHYSICAL_RC">Physical RC</option>
                    <option value="DIGITAL_RC">Digital RC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Collected By *</label>
                  <select
                    required
                    value={formData.collectedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, collectedBy: e.target.value as 'SELF' | 'RTO_AGENT' | 'BANKER' }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  >
                    <option value="SELF">Self</option>
                    <option value="RTO_AGENT">RTO Agent</option>
                    <option value="BANKER">Banker</option>
                  </select>
                </div>
              </div>

              {formData.collectedBy === 'RTO_AGENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.agentName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Agent Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="{10}"
                      value={formData.agentMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, agentMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}

              {formData.collectedBy === 'BANKER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Banker Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankerName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter banker name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Banker Mobile *</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={formData.bankerMobile || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        if (value.length <= 10) {
                          setFormData(prev => ({ ...prev, bankerMobile: value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cancellation Remarks *</label>
              <textarea
                required
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                rows={3}
                placeholder="Enter reason for cancellation"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Update Application Stage</h2>
            <p className="text-sm text-muted-foreground">Loan: {loan?.loan_number || loan?.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Application Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value as ApplicationStage }))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
            >
              {APPLICATION_STAGES.map(stage => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {renderStageFields()}

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStage.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={16} />
              {updateStage.isPending ? 'Updating...' : 'Update Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}