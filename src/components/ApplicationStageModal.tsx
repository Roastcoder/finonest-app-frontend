import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { 
  ApplicationStage, 
  ApplicationStageData,
  LoginStageData,
  InProcessStageData,
  RejectedStageData,
  ApprovedStageData,
  DisbursedStageData,
  CancelledStageData,
  VehicleRCStatus,
  RCType,
  CollectedBy,
  STAGE_LABELS 
} from '@/types/applicationStages';

interface ApplicationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: ApplicationStage;
  leadId: number;
  onStageUpdate: (stageData: ApplicationStageData) => void;
}

export default function ApplicationStageModal({ 
  isOpen, 
  onClose, 
  currentStage, 
  leadId, 
  onStageUpdate 
}: ApplicationStageModalProps) {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(currentStage);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStageChange = (stage: ApplicationStage) => {
    setSelectedStage(stage);
    setFormData({});
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const stageData: ApplicationStageData = {
        stage: selectedStage,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current_user', // Replace with actual user
      };

      // Add stage-specific data
      switch (selectedStage) {
        case 'LOGIN':
          stageData.loginData = formData as LoginStageData;
          break;
        case 'IN_PROCESS':
          stageData.inProcessData = formData as InProcessStageData;
          break;
        case 'REJECTED':
          stageData.rejectedData = formData as RejectedStageData;
          break;
        case 'APPROVED':
          stageData.approvedData = {
            ...formData,
            approvedDate: new Date().toISOString()
          } as ApprovedStageData;
          break;
        case 'DISBURSED':
          stageData.disbursedData = {
            ...formData,
            disbursedDate: new Date().toISOString()
          } as DisbursedStageData;
          break;
        case 'CANCELLED':
          stageData.cancelledData = {
            ...formData,
            cancelledDate: new Date().toISOString()
          } as CancelledStageData;
          break;
      }

      // API call to update stage
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(stageData)
      });

      if (!response.ok) throw new Error('Failed to update stage');

      onStageUpdate(stageData);
      toast.success(`Stage updated to ${STAGE_LABELS[selectedStage]}`);
      onClose();
    } catch (error) {
      toast.error('Failed to update stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStageForm = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent";
    const labelClass = "block text-sm font-medium text-foreground mb-1";

    switch (selectedStage) {
      case 'LOGIN':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>App Score</label>
              <input
                type="number"
                className={inputClass}
                value={formData.appScore || ''}
                onChange={e => setFormData({...formData, appScore: Number(e.target.value)})}
                placeholder="Enter app score"
              />
            </div>
            <div>
              <label className={labelClass}>Credit Score</label>
              <input
                type="number"
                className={inputClass}
                value={formData.creditScore || ''}
                onChange={e => setFormData({...formData, creditScore: Number(e.target.value)})}
                placeholder="Enter credit score"
              />
            </div>
          </div>
        );

      case 'IN_PROCESS':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Add Tags</label>
              <input
                type="text"
                className={inputClass}
                value={formData.tagsInput || ''}
                onChange={e => setFormData({...formData, tagsInput: e.target.value})}
                placeholder="Enter tags separated by commas"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate multiple tags with commas</p>
            </div>
          </div>
        );

      case 'REJECTED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Remarks *</label>
              <textarea
                className={inputClass}
                rows={3}
                value={formData.remarks || ''}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter rejection reason..."
                required
              />
            </div>
          </div>
        );

      case 'APPROVED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Loan Amount *</label>
              <input
                type="number"
                className={inputClass}
                value={formData.loanAmount || ''}
                onChange={e => setFormData({...formData, loanAmount: Number(e.target.value)})}
                placeholder="Enter approved loan amount"
                required
              />
            </div>
            <div>
              <label className={labelClass}>ROI (%) *</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={formData.roi || ''}
                onChange={e => setFormData({...formData, roi: Number(e.target.value)})}
                placeholder="Enter rate of interest"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Tenure (Months) *</label>
              <input
                type="number"
                className={inputClass}
                value={formData.tenure || ''}
                onChange={e => setFormData({...formData, tenure: Number(e.target.value)})}
                placeholder="Enter tenure in months"
                required
              />
            </div>
          </div>
        );

      case 'DISBURSED':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Loan Amount *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.loanAmount || ''}
                  onChange={e => setFormData({...formData, loanAmount: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>ROI (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.roi || ''}
                  onChange={e => setFormData({...formData, roi: Number(e.target.value)})}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tenure (Months) *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.tenure || ''}
                  onChange={e => setFormData({...formData, tenure: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Loan Account Number *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={formData.loanAccountNumber || ''}
                  onChange={e => setFormData({...formData, loanAccountNumber: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold text-foreground mb-3">Vehicle RC Status</h4>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>RC Type *</label>
                  <select
                    className={inputClass}
                    value={formData.rcType || ''}
                    onChange={e => setFormData({...formData, rcType: e.target.value as RCType})}
                    required
                  >
                    <option value="">Select RC Type</option>
                    <option value="PHYSICAL_RC">Physical RC</option>
                    <option value="DIGITAL_RC">Digital RC</option>
                  </select>
                </div>
                
                <div>
                  <label className={labelClass}>Collected By *</label>
                  <select
                    className={inputClass}
                    value={formData.collectedBy || ''}
                    onChange={e => setFormData({...formData, collectedBy: e.target.value as CollectedBy})}
                    required
                  >
                    <option value="">Select Collection Method</option>
                    <option value="SELF">Self</option>
                    <option value="RTO_AGENT">RTO Agent</option>
                    <option value="BANKER">Banker</option>
                  </select>
                </div>

                {formData.collectedBy === 'RTO_AGENT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Agent Name *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.rtoAgentName || ''}
                        onChange={e => setFormData({...formData, rtoAgentName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Agent Mobile *</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.rtoAgentMobile || ''}
                        onChange={e => setFormData({...formData, rtoAgentMobile: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.collectedBy === 'BANKER' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Banker Name *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={formData.bankerName || ''}
                        onChange={e => setFormData({...formData, bankerName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Banker Mobile *</label>
                      <input
                        type="tel"
                        className={inputClass}
                        value={formData.bankerMobile || ''}
                        onChange={e => setFormData({...formData, bankerMobile: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Remarks *</label>
              <textarea
                className={inputClass}
                rows={3}
                value={formData.remarks || ''}
                onChange={e => setFormData({...formData, remarks: e.target.value})}
                placeholder="Enter cancellation reason..."
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Update Application Stage</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Stage</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              value={selectedStage}
              onChange={e => handleStageChange(e.target.value as ApplicationStage)}
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="LOGIN">Login</option>
              <option value="IN_PROCESS">In Process</option>
              <option value="REJECTED">Rejected</option>
              <option value="APPROVED">Approved</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {renderStageForm()}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save size={16} />
            {isSubmitting ? 'Updating...' : 'Update Stage'}
          </button>
        </div>
      </div>
    </div>
  );
}