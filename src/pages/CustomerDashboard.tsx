import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, Phone, Mail, FileText } from 'lucide-react';

export default function CustomerDashboard() {
  const { leadId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/customer-portal/status/${leadId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('customer_token')}`
            }
          }
        );
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [leadId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Application not found</div>
      </div>
    );
  }

  const { application, documents } = data;

  const stages = [
    { key: 'lead', label: 'Application Submitted' },
    { key: 'login', label: 'Under Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'disbursed', label: 'Disbursed' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === application.stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Application Status
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Track your loan application progress
          </p>

          {/* Progress Tracker */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {stages.map((stage, index) => (
                <div key={stage.key} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index <= currentStageIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {index < currentStageIndex ? (
                        <CheckCircle size={20} />
                      ) : index === currentStageIndex ? (
                        <Clock size={20} />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="text-xs mt-2 text-center font-medium">
                      {stage.label}
                    </div>
                  </div>
                  {index < stages.length - 1 && (
                    <div className={`h-1 flex-1 ${
                      index < currentStageIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Application Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Customer Name
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {application.customer_name}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Loan Amount
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{Number(application.loan_amount_required || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Application Date
              </h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Current Status
              </h3>
              <p className="text-lg font-semibold text-blue-600">
                {stages[currentStageIndex]?.label || 'Processing'}
              </p>
            </div>
          </div>

          {/* Executive Contact */}
          {application.executive_name && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Relationship Manager
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-600" />
                  <span className="text-gray-900 dark:text-white">
                    {application.executive_name}
                  </span>
                </div>
                {application.executive_phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-blue-600" />
                    <a href={`tel:${application.executive_phone}`} className="text-blue-600 hover:underline">
                      {application.executive_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Document Status
            </h3>
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.document_type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {doc.document_type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    {doc.status === 'verified' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={18} /> Verified
                      </span>
                    )}
                    {doc.status === 'pending' && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Clock size={18} /> Pending
                      </span>
                    )}
                    {doc.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle size={18} /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </div>
          </div>

          {/* Disbursement Info */}
          {application.loan_status === 'disbursed' && (
            <div className="mt-8 bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                Loan Disbursed Successfully!
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Disbursement Date</p>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {new Date(application.disbursement_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">EMI Amount</p>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    ₹{Number(application.emi_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Tenure</p>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {application.tenure_months} months
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
