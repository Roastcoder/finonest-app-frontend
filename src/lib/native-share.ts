import { toast } from 'sonner';

interface ShareOptions {
  title?: string;
  text: string;
  url?: string;
  files?: File[];
}

// Check if native sharing is supported
export const isNativeShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

// Check if file sharing is supported
export const isFileShareSupported = (): boolean => {
  return isNativeShareSupported() && 'canShare' in navigator && typeof navigator.canShare === 'function';
};

// Native share function
export async function shareNatively(options: ShareOptions): Promise<boolean> {
  if (!isNativeShareSupported()) {
    console.log('Native sharing not supported');
    return false;
  }

  try {
    const shareData: ShareData = {
      title: options.title,
      text: options.text,
      url: options.url,
    };

    // Add files if supported and provided
    if (options.files && options.files.length > 0 && isFileShareSupported()) {
      // Check if files can be shared
      const canShareFiles = await navigator.canShare({ files: options.files });
      if (canShareFiles) {
        shareData.files = options.files;
      } else {
        console.log('File sharing not supported for these file types');
        // Share without files
        delete shareData.files;
      }
    }

    await navigator.share(shareData);
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // User cancelled the share
      console.log('Share cancelled by user');
      return false;
    } else {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
      return false;
    }
  }
};

// Fallback share function for unsupported browsers
export function fallbackShare(options: ShareOptions): void {
  // Try to copy to clipboard as fallback
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(options.text)
      .then(() => {
        toast.success('Content copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy to clipboard');
      });
  } else {
    // Last resort: show the text in an alert
    alert(`Share this content:\n\n${options.text}`);
  }
}

// Main share function that tries native first, then fallback
export async function shareContent(options: ShareOptions): Promise<void> {
  const success = await shareNatively(options);
  
  if (!success && !isNativeShareSupported()) {
    // Only show fallback if native sharing failed or isn't supported
    fallbackShare(options);
  }
}

// Share loan details
export async function shareLoanDetails(loanData: any, documents: File[] = []): Promise<void> {
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

  await shareContent({
    title: 'Loan Application Details',
    text: message,
    files: documents.length > 0 ? documents : undefined
  });
}

// Share with customer phone number context
export async function shareToCustomer(loanData: any, documents: File[] = []): Promise<void> {
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

Customer Phone: ${formattedPhone}

${documents.length > 0 ? `📎 ${documents.length} document(s) attached` : ''}

For any queries, please contact us.

Thank you,
Finonest India Team`;

  await shareContent({
    title: 'Loan Application Details',
    text: message,
    files: documents.length > 0 ? documents : undefined
  });
}