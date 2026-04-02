import { toast } from 'sonner';

/**
 * Debug WhatsApp sharing issues
 */
export function debugWhatsAppSharing() {
  console.log('=== WhatsApp Sharing Debug ===');
  
  // Check 1: Share API support
  console.log('1. Share API Support:');
  console.log('   navigator.share:', !!navigator.share);
  console.log('   navigator.canShare:', !!navigator.canShare);
  
  // Check 2: Device info
  console.log('2. Device Info:');
  console.log('   User Agent:', navigator.userAgent);
  console.log('   Is Android:', /Android/i.test(navigator.userAgent));
  console.log('   Is iOS:', /iPhone|iPad|iPod/i.test(navigator.userAgent));
  
  // Check 3: WhatsApp detection
  console.log('3. WhatsApp Detection:');
  const isWhatsAppBrowser = /WhatsApp/i.test(navigator.userAgent);
  console.log('   Is WhatsApp Browser:', isWhatsAppBrowser);
  
  // Check 4: File sharing capability
  console.log('4. File Sharing Capability:');
  if (navigator.canShare) {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const canSharePDF = navigator.canShare({ files: [testFile] });
    console.log('   Can share PDF:', canSharePDF);
  }
  
  console.log('=== End Debug ===');
}

/**
 * WhatsApp-specific share function
 * Direct WhatsApp link share (fallback method)
 */
export async function shareToWhatsAppDirect(
  message: string,
  phoneNumber?: string
): Promise<boolean> {
  try {
    // Format: https://wa.me/[phone]?text=[message]
    // Or: https://api.whatsapp.com/send?phone=[phone]&text=[message]
    
    const encodedMessage = encodeURIComponent(message);
    let whatsappUrl: string;
    
    if (phoneNumber) {
      // Direct to specific number
      whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    } else {
      // Open WhatsApp (user selects contact)
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    }
    
    console.log('Opening WhatsApp with URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
    
    toast.success('Opening WhatsApp...');
    return true;
    
  } catch (error) {
    console.error('WhatsApp direct share failed:', error);
    toast.error('Failed to open WhatsApp');
    return false;
  }
}

/**
 * WhatsApp file sharing with fallback
 * Tries Web Share API first, then falls back to direct link
 */
export async function shareToWhatsAppWithFallback(
  pdfBlob: Blob,
  pdfFileName: string,
  loanData?: any
): Promise<boolean> {
  try {
    console.log('Attempting WhatsApp share...');
    debugWhatsAppSharing();
    
    // Step 1: Try Web Share API
    if (navigator.share && navigator.canShare) {
      console.log('Trying Web Share API...');
      
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      
      if (navigator.canShare({ files: [pdfFile] })) {
        console.log('Web Share API supported, attempting share...');
        
        try {
          await navigator.share({
            files: [pdfFile],
            title: 'Finonest Loan Document',
            text: loanData
              ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}`
              : 'Loan Application Document'
          });
          
          console.log('✅ Web Share API successful');
          toast.success('Shared to WhatsApp!');
          return true;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            console.log('User cancelled share');
            return false;
          }
          console.warn('Web Share API failed:', shareError);
        }
      }
    }
    
    // Step 2: Fallback - Direct WhatsApp link
    console.log('Web Share API not available, using direct WhatsApp link...');
    
    const message = loanData
      ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}\nLoan Amount: ₹${Number(loanData.loan_amount || 0).toLocaleString()}\nStatus: ${loanData.status || loanData.application_stage}\n\nPlease find the attached PDF document.`
      : 'Loan Application Document - Please find the attached PDF.';
    
    return await shareToWhatsAppDirect(message);
    
  } catch (error) {
    console.error('WhatsApp share failed:', error);
    toast.error('Failed to share to WhatsApp');
    return false;
  }
}

/**
 * Download PDF as fallback
 */
export async function downloadPDFAsWhatsAppFallback(
  pdfBlob: Blob,
  fileName: string
): Promise<boolean> {
  try {
    console.log('Downloading PDF as fallback...');
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ PDF downloaded');
    toast.success('PDF downloaded! You can now share it manually via WhatsApp.');
    return true;
    
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download PDF');
    return false;
  }
}

/**
 * Smart WhatsApp share with multiple fallbacks
 */
export async function smartWhatsAppShare(
  pdfBlob: Blob,
  pdfFileName: string,
  loanData?: any
): Promise<boolean> {
  try {
    console.log('Starting smart WhatsApp share...');
    
    // Strategy 1: Web Share API
    console.log('Strategy 1: Trying Web Share API...');
    if (navigator.share && navigator.canShare) {
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      
      if (navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: 'Finonest Loan Document',
            text: loanData
              ? `Loan Application - ${loanData.id}`
              : 'Loan Application Document'
          });
          
          console.log('✅ Strategy 1 Success: Web Share API');
          toast.success('Shared to WhatsApp!');
          return true;
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.warn('Strategy 1 failed:', error);
          }
        }
      }
    }
    
    // Strategy 2: Direct WhatsApp link
    console.log('Strategy 2: Trying direct WhatsApp link...');
    const message = loanData
      ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}\nLoan Amount: ₹${Number(loanData.loan_amount || 0).toLocaleString()}`
      : 'Loan Application Document';
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    console.log('✅ Strategy 2 Success: Direct WhatsApp link');
    toast.success('Opening WhatsApp...');
    return true;
    
  } catch (error) {
    console.error('All strategies failed:', error);
    
    // Strategy 3: Download fallback
    console.log('Strategy 3: Falling back to download...');
    return await downloadPDFAsWhatsAppFallback(pdfBlob, pdfFileName);
  }
}

/**
 * Check if WhatsApp is installed/available
 */
export function isWhatsAppAvailable(): boolean {
  // Check if WhatsApp browser
  const isWhatsAppBrowser = /WhatsApp/i.test(navigator.userAgent);
  
  // Check if can open WhatsApp
  const canOpenWhatsApp = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  console.log('WhatsApp availability:', {
    isWhatsAppBrowser,
    canOpenWhatsApp,
    hasShareAPI: !!navigator.share
  });
  
  return isWhatsAppBrowser || canOpenWhatsApp || !!navigator.share;
}

/**
 * Get WhatsApp share method for current device
 */
export function getWhatsAppShareMethod(): 'web-share-api' | 'direct-link' | 'download' {
  if (navigator.share && navigator.canShare) {
    return 'web-share-api';
  }
  
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'direct-link';
  }
  
  return 'download';
}
