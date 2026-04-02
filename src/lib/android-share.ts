import { toast } from 'sonner';

export async function shareDocumentsAndroid(
  files: File[],
  title: string = 'Documents',
  text: string = 'Shared documents'
): Promise<boolean> {
  if (!navigator.share) {
    toast.error('Sharing not available on this device');
    return false;
  }

  if (files.length === 0) {
    toast.error('No documents to share');
    return false;
  }

  try {
    const canShare = navigator.canShare ? await navigator.canShare({ files }) : true;
    
    if (!canShare) {
      toast.error('This device cannot share these files');
      return false;
    }

    await navigator.share({
      title,
      text,
      files
    });
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Share cancelled');
      return false;
    }
    throw error;
  }
}

export async function shareLoanWithDocumentsAndroid(
  loan: any,
  files: File[] = []
): Promise<boolean> {
  if (!navigator.share) {
    toast.error('Sharing not available on this device');
    return false;
  }

  try {
    const message = `Loan Application - ${loan.id}\n\nApplicant: ${loan.applicant_name || 'Customer'}\nVehicle: ${loan.maker_name || loan.car_make || ''} ${loan.model_variant_name || loan.car_model || ''}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}\nStatus: ${loan.status || loan.application_stage}`;

    if (files.length === 0) {
      await navigator.share({
        title: `Loan Application - ${loan.id}`,
        text: message
      });
      return true;
    }

    const canShare = navigator.canShare ? await navigator.canShare({ files }) : true;
    
    if (canShare) {
      await navigator.share({
        title: `Loan Application - ${loan.id}`,
        text: message,
        files
      });
      return true;
    } else {
      await navigator.share({
        title: `Loan Application - ${loan.id}`,
        text: message + '\n\n📎 Documents available separately'
      });
      return true;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Share cancelled');
      return false;
    }
    throw error;
  }
}

export function getDeviceInfo() {
  return {
    isAndroid: /Android/i.test(navigator.userAgent),
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    hasWebShare: 'share' in navigator,
    userAgent: navigator.userAgent
  };
}
