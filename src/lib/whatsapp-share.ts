import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

/**
 * Check if device supports Web Share API
 */
function isShareAPISupported(): boolean {
  return !!(navigator.share && navigator.canShare);
}

/**
 * Check if specific file can be shared
 */
function canShareFile(file: File): boolean {
  if (!navigator.canShare) return false;
  return navigator.canShare({ files: [file] });
}

/**
 * Share PDF to WhatsApp/System Share
 * Blob ko File mein convert karke native share menu kholta hai
 */
export async function sharePDFToWhatsApp(
  pdfBlob: Blob,
  fileName: string,
  loanData?: LoanData
): Promise<boolean> {
  try {
    // Step 1: Check if Share API supported hai
    if (!isShareAPISupported()) {
      console.warn('Web Share API not supported on this device');
      toast.error('Sharing not supported on this device. Please download instead.');
      return false;
    }

    // Step 2: Blob ko File mein convert karo
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    console.log('File created:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    // Step 3: Check karo ki ye specific file share ho sakti hai
    if (!canShareFile(file)) {
      console.warn('This file cannot be shared on this device');
      toast.error('PDF file cannot be shared on this device');
      return false;
    }

    // Step 4: Share karo
    const shareData = {
      files: [file],
      title: 'Finonest Loan Document',
      text: loanData 
        ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}\nLoan Amount: ₹${Number(loanData.loan_amount || 0).toLocaleString()}`
        : 'Finonest Loan Application Document'
    };

    console.log('Sharing with data:', shareData);

    await navigator.share(shareData);

    console.log('✅ Success: PDF shared to WhatsApp/System!');
    toast.success('PDF shared successfully!');
    return true;

  } catch (error: any) {
    // Handle different error types
    if (error.name === 'AbortError') {
      console.log('User cancelled sharing');
      toast.info('Sharing cancelled');
      return false;
    }

    if (error.name === 'NotAllowedError') {
      console.error('Sharing not allowed:', error);
      toast.error('Sharing not allowed on this device');
      return false;
    }

    if (error.name === 'NotSupportedError') {
      console.error('Sharing not supported:', error);
      toast.error('Sharing not supported on this device');
      return false;
    }

    console.error('Sharing failed:', error);
    toast.error(`Failed to share: ${error.message}`);
    return false;
  }
}

/**
 * Share PDF with multiple images as attachments
 */
export async function sharePDFWithImagesWhatsApp(
  pdfBlob: Blob,
  pdfFileName: string,
  imageFiles: File[] = [],
  loanData?: LoanData
): Promise<boolean> {
  try {
    if (!isShareAPISupported()) {
      console.warn('Web Share API not supported');
      toast.error('Sharing not supported on this device');
      return false;
    }

    // Convert PDF blob to File
    const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

    // Combine PDF + Images
    const filesToShare = [pdfFile, ...imageFiles];

    console.log('Files to share:', {
      total: filesToShare.length,
      pdf: 1,
      images: imageFiles.length,
      totalSize: (filesToShare.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2) + ' MB'
    });

    // Check if all files can be shared
    if (!navigator.canShare({ files: filesToShare })) {
      console.warn('Cannot share all files together, trying PDF only');
      
      // Fallback: Share PDF only
      return await sharePDFToWhatsApp(pdfBlob, pdfFileName, loanData);
    }

    // Share all files
    const shareData = {
      files: filesToShare,
      title: 'Finonest Loan Documents',
      text: loanData
        ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}\nDocuments: PDF + ${imageFiles.length} images`
        : `Loan Documents - PDF + ${imageFiles.length} images`
    };

    console.log('Sharing PDF + images...');
    await navigator.share(shareData);

    console.log('✅ Success: PDF + Images shared!');
    toast.success(`Shared PDF with ${imageFiles.length} images!`);
    return true;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('User cancelled sharing');
      toast.info('Sharing cancelled');
      return false;
    }

    console.error('Sharing failed:', error);
    
    // Try fallback: Share PDF only
    console.log('Attempting fallback: Sharing PDF only...');
    return await sharePDFToWhatsApp(pdfBlob, pdfFileName, loanData);
  }
}

/**
 * Share documents only (images/PDFs)
 */
export async function shareDocumentsWhatsApp(
  files: File[],
  title: string = 'Loan Documents'
): Promise<boolean> {
  try {
    if (!isShareAPISupported()) {
      console.warn('Web Share API not supported');
      toast.error('Sharing not supported on this device');
      return false;
    }

    if (files.length === 0) {
      toast.error('No files to share');
      return false;
    }

    console.log('Sharing documents:', {
      count: files.length,
      totalSize: (files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2) + ' MB'
    });

    // Check if files can be shared
    if (!navigator.canShare({ files })) {
      console.warn('Cannot share these files');
      toast.error('These files cannot be shared on this device');
      return false;
    }

    // Share files
    await navigator.share({
      files,
      title,
      text: `${files.length} documents for loan application`
    });

    console.log('✅ Success: Documents shared!');
    toast.success(`Shared ${files.length} documents!`);
    return true;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('User cancelled sharing');
      toast.info('Sharing cancelled');
      return false;
    }

    console.error('Sharing failed:', error);
    toast.error('Failed to share documents');
    return false;
  }
}

/**
 * Download PDF (Fallback for devices that don't support sharing)
 */
export async function downloadPDFMobile(
  pdfBlob: Blob,
  fileName: string
): Promise<boolean> {
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log('✅ PDF downloaded successfully');
    toast.success('PDF downloaded successfully!');
    return true;

  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download PDF');
    return false;
  }
}

/**
 * Main function: Share or Download based on device capability
 */
export async function shareOrDownloadPDF(
  pdfBlob: Blob,
  fileName: string,
  loanData?: LoanData,
  imageFiles: File[] = []
): Promise<void> {
  try {
    // Check if device supports sharing
    if (isShareAPISupported()) {
      console.log('Device supports Web Share API');
      
      // Try sharing with images if available
      if (imageFiles.length > 0) {
        const success = await sharePDFWithImagesWhatsApp(pdfBlob, fileName, imageFiles, loanData);
        if (success) return;
      }

      // Try sharing PDF only
      const success = await sharePDFToWhatsApp(pdfBlob, fileName, loanData);
      if (success) return;
    }

    // Fallback: Download
    console.log('Falling back to download');
    await downloadPDFMobile(pdfBlob, fileName);

  } catch (error) {
    console.error('Error in shareOrDownloadPDF:', error);
    toast.error('Failed to share or download PDF');
  }
}

/**
 * Check device capabilities
 */
export function getDeviceShareCapabilities() {
  return {
    supportsShare: !!navigator.share,
    supportsCanShare: !!navigator.canShare,
    userAgent: navigator.userAgent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  };
}

/**
 * Log device capabilities (for debugging)
 */
export function logDeviceCapabilities() {
  const capabilities = getDeviceShareCapabilities();
  console.log('📱 Device Capabilities:', capabilities);
  
  if (capabilities.supportsShare) {
    console.log('✅ Web Share API supported');
  } else {
    console.log('❌ Web Share API NOT supported - will use download fallback');
  }

  if (capabilities.isAndroid) {
    console.log('📱 Android device detected');
  } else if (capabilities.isIOS) {
    console.log('📱 iOS device detected');
  } else {
    console.log('💻 Desktop/Other device detected');
  }
}
