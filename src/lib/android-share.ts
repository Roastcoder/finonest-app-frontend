import { toast } from 'sonner';

interface ShareOptions {
  title?: string;
  text: string;
  files?: File[];
}

// Detect if running on Android
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

// Detect if running as PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Check if Web Share API is available
export const isWebShareAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

// Check if files can be shared
export const canShareFiles = async (files: File[]): Promise<boolean> => {
  if (!navigator.canShare) return false;
  try {
    return await navigator.canShare({ files });
  } catch {
    return false;
  }
};

// Share files with Android PWA optimization
export async function shareFilesAndroid(options: ShareOptions): Promise<boolean> {
  if (!isWebShareAvailable()) {
    toast.error('Sharing not available on this device');
    return false;
  }

  try {
    const shareData: ShareData = {
      title: options.title,
      text: options.text,
    };

    if (options.files && options.files.length > 0) {
      // For Android PWA, try sharing files
      try {
        const canShare = await canShareFiles(options.files);
        if (canShare) {
          shareData.files = options.files;
        } else {
          // If files can't be shared, try without them
          console.warn('Files cannot be shared on this device, sharing text only');
        }
      } catch (e) {
        console.warn('Error checking file sharing capability:', e);
      }
    }

    await navigator.share(shareData);
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
      return false;
    }
    console.error('Share error:', error);
    throw error;
  }
}

// Share documents with Android PWA optimization
export async function shareDocumentsAndroid(
  documents: File[],
  title: string = 'Documents',
  text: string = 'Shared documents'
): Promise<boolean> {
  if (!isWebShareAvailable()) {
    toast.error('Sharing not available on this device');
    return false;
  }

  if (documents.length === 0) {
    toast.error('No documents to share');
    return false;
  }

  try {
    // Separate documents by type for better Android compatibility
    const imageFiles = documents.filter(f => f.type.startsWith('image/'));
    const pdfFiles = documents.filter(f => f.type.includes('pdf'));
    const otherFiles = documents.filter(f => !f.type.startsWith('image/') && !f.type.includes('pdf'));

    // Try sharing in order of compatibility: images first, then PDFs, then others
    const fileGroups = [
      { files: imageFiles, label: 'images' },
      { files: pdfFiles, label: 'PDFs' },
      { files: otherFiles, label: 'documents' }
    ];

    for (const group of fileGroups) {
      if (group.files.length === 0) continue;

      try {
        const canShare = await canShareFiles(group.files);
        if (canShare) {
          await navigator.share({
            title: `${title} - ${group.label}`,
            text: `${group.files.length} ${group.label}`,
            files: group.files
          });
          toast.success(`Shared ${group.files.length} ${group.label}!`);
          return true;
        }
      } catch (e) {
        console.warn(`Could not share ${group.label}:`, e);
        continue;
      }
    }

    // Fallback: share as text only
    await navigator.share({
      title,
      text: `${text}\n\n${documents.length} documents available`
    });
    toast.info('Shared as text. Documents may need to be shared separately.');
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
      return false;
    }
    console.error('Document share error:', error);
    throw error;
  }
}

// Share loan application with documents
export async function shareLoanWithDocumentsAndroid(
  loanData: any,
  documents: File[] = []
): Promise<boolean> {
  if (!isWebShareAvailable()) {
    toast.error('Sharing not available on this device');
    return false;
  }

  try {
    const loanMessage = `Loan Application - ${loanData.id}

Applicant: ${loanData.applicant_name || 'Customer'}
Vehicle: ${loanData.maker_name || loanData.car_make || ''} ${loanData.model_variant_name || loanData.car_model || ''}
Loan Amount: ₹${Number(loanData.loan_amount || 0).toLocaleString()}
Status: ${loanData.status || loanData.application_stage}
Tenure: ${loanData.tenure || '—'} months`;

    // If no documents, just share text
    if (documents.length === 0) {
      await navigator.share({
        title: `Loan Application - ${loanData.id}`,
        text: loanMessage
      });
      toast.success('Loan details shared!');
      return true;
    }

    // Try sharing with documents
    try {
      const canShare = await canShareFiles(documents);
      if (canShare) {
        await navigator.share({
          title: `Loan Application - ${loanData.id}`,
          text: `${loanMessage}\n\n📎 ${documents.length} documents attached`,
          files: documents
        });
        toast.success(`Shared loan with ${documents.length} documents!`);
        return true;
      }
    } catch (e) {
      console.warn('Cannot share with documents, trying text only:', e);
    }

    // Fallback: share text only
    await navigator.share({
      title: `Loan Application - ${loanData.id}`,
      text: `${loanMessage}\n\n📎 ${documents.length} documents available separately`
    });
    toast.info('Shared loan details. Documents may need to be shared separately.');
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
      return false;
    }
    console.error('Loan share error:', error);
    throw error;
  }
}

// Optimized share for Android PWA with retry logic
export async function shareWithRetry(
  options: ShareOptions,
  maxRetries: number = 2
): Promise<boolean> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await shareFilesAndroid(options);
    } catch (error) {
      lastError = error;
      console.warn(`Share attempt ${attempt + 1} failed:`, error);

      // If files couldn't be shared, try without them
      if (options.files && options.files.length > 0 && attempt === 0) {
        try {
          console.log('Retrying without files...');
          return await shareFilesAndroid({
            title: options.title,
            text: options.text
          });
        } catch (e) {
          console.warn('Retry without files failed:', e);
        }
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}

// Get device info for debugging
export function getDeviceInfo(): {
  isAndroid: boolean;
  isPWA: boolean;
  hasWebShare: boolean;
  userAgent: string;
} {
  return {
    isAndroid: isAndroid(),
    isPWA: isPWA(),
    hasWebShare: isWebShareAvailable(),
    userAgent: navigator.userAgent
  };
}
