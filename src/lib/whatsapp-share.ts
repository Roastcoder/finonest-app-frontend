import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ShareToWhatsAppOptions {
  phoneNumber?: string;
  message: string;
  documents?: File[];
  loanId?: string;
}

// Share via WhatsApp Business API (if configured)
export async function shareViaWhatsAppAPI(options: ShareToWhatsAppOptions): Promise<boolean> {
  try {
    // Check if WhatsApp API is configured
    const status = await api.get('/whatsapp/status');
    if (!status.configured) {
      console.log('WhatsApp API not configured, falling back to web share');
      return false;
    }

    const { phoneNumber, message, documents = [], loanId } = options;
    
    if (!phoneNumber) {
      toast.error('Phone number is required for WhatsApp API sharing');
      return false;
    }

    // Send text message first
    await api.post('/whatsapp/send', {
      phone: phoneNumber,
      message,
      type: 'text'
    });

    // Send documents if any
    for (const doc of documents) {
      const formData = new FormData();
      formData.append('document', doc);
      formData.append('phone', phoneNumber);
      formData.append('caption', `Document: ${doc.name}`);
      
      // Upload document and send via WhatsApp
      try {
        await api.post('/whatsapp/send-document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (docError) {
        console.error('Failed to send document:', doc.name, docError);
      }
    }

    toast.success(`Sent to WhatsApp: ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('WhatsApp API sharing failed:', error);
    toast.error('Failed to send via WhatsApp API');
    return false;
  }
}

// Enhanced share function with phone number input
export async function shareToWhatsAppWithPhone(loanData: any, documents: File[] = []) {
  window.open('https://web.whatsapp.com/', '_blank');
}

// Share to customer's registered phone number
export async function shareToCustomer(loanData: any, documents: File[] = []) {
  const customerPhone = loanData.mobile || loanData.phone || loanData.customer_phone;
  
  if (!customerPhone) {
    toast.error('Customer phone number not found');
    return;
  }

  // Format phone number (add +91 if not present)
  let formattedPhone = customerPhone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
  }

  const message = `*Finonest India - Loan Application*

Dear ${loanData.applicant_name || 'Customer'},

Your loan application details:
*ID:* ${loanData.id}
*Vehicle:* ${loanData.maker_name || loanData.car_make || ''} ${loanData.model_variant_name || loanData.car_model || ''}
*Loan Amount:* ₹${Number(loanData.loan_amount).toLocaleString()}
*Status:* ${loanData.status}
*EMI:* ₹${Number(loanData.emi_amount || loanData.emi || 0).toLocaleString()}
*Tenure:* ${loanData.tenure} months

${documents.length > 0 ? `📎 ${documents.length} document(s) attached` : ''}

For any queries, please contact us.

Thank you,
Finonest India Team`;

  // Try WhatsApp API first
  const apiSuccess = await shareViaWhatsAppAPI({
    phoneNumber: formattedPhone,
    message,
    documents,
    loanId: loanData.id
  });

  if (!apiSuccess) {
    // Fallback to web sharing
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    if (documents.length > 0) {
      toast.info('Documents will need to be attached manually in WhatsApp');
    }
  }
}