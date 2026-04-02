import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

/**
 * Compress image for mobile sharing
 * 800x600px, 70% quality - optimal for WhatsApp
 */
async function compressImageForSharing(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch document files from server
 */
async function fetchDocumentFiles(docs: any[]): Promise<File[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const files: File[] = [];

  if (!docs || docs.length === 0) {
    return files;
  }

  for (const doc of docs) {
    try {
      if (!doc.id) continue;

      const res = await fetch(`${API}/documents/${doc.id}/download`);
      if (!res.ok) continue;

      const blob = await res.blob();
      if (!blob || blob.size === 0) continue;

      const fileName = doc.file_name || `document-${doc.id}`;
      files.push(new File([blob], fileName, { type: blob.type }));
    } catch (error) {
      console.warn(`Error fetching document ${doc.id}:`, error);
    }
  }

  return files;
}

/**
 * Main function: Share PDF + Images as separate attachments
 * Jaise gallery se multiple photos select karke bhejte hain
 */
export async function shareAllAttachmentsWhatsApp(
  pdfBlob: Blob,
  pdfFileName: string,
  documentIds: any[] = [],
  loanData?: LoanData
): Promise<boolean> {
  try {
    // Step 1: Check if Share API supported hai
    if (!navigator.share || !navigator.canShare) {
      console.warn('Web Share API not supported');
      toast.error('Sharing not supported on this device');
      return false;
    }

    const loadingToast = toast.loading('Preparing attachments...');

    // Step 2: PDF ko File mein convert karo
    const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });

    console.log('PDF File:', {
      name: pdfFile.name,
      size: (pdfFile.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: pdfFile.type
    });

    // Step 3: Documents fetch karo
    let imageFiles: File[] = [];
    if (documentIds.length > 0) {
      const allDocs = await fetchDocumentFiles(documentIds);

      // Filter sirf images (PDFs ko skip karo)
      const imageDocs = allDocs.filter(f => f.type.startsWith('image/'));

      console.log('Fetched documents:', {
        total: allDocs.length,
        images: imageDocs.length,
        pdfs: allDocs.length - imageDocs.length
      });

      // Step 4: Images ko compress karo (mobile optimization)
      console.log('Compressing images for mobile...');
      const compressedImages: File[] = [];

      for (let i = 0; i < imageDocs.length; i++) {
        try {
          const compressed = await compressImageForSharing(imageDocs[i]);
          compressedImages.push(compressed);

          console.log(`Compressed image ${i + 1}:`, {
            original: (imageDocs[i].size / (1024 * 1024)).toFixed(2) + ' MB',
            compressed: (compressed.size / (1024 * 1024)).toFixed(2) + ' MB',
            reduction: (((imageDocs[i].size - compressed.size) / imageDocs[i].size) * 100).toFixed(0) + '%'
          });
        } catch (error) {
          console.warn(`Failed to compress image ${i + 1}:`, error);
          // Use original if compression fails
          compressedImages.push(imageDocs[i]);
        }
      }

      imageFiles = compressedImages;
    }

    // Step 5: Saari files ko ek array mein combine karo
    // PDF pehle, phir images (jaise gallery mein hota hai)
    const filesArray = [pdfFile, ...imageFiles];

    console.log('Files ready for sharing:', {
      total: filesArray.length,
      pdf: 1,
      images: imageFiles.length,
      totalSize: (filesArray.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2) + ' MB'
    });

    // Step 6: Check karo ki ye files share ho sakti hain
    if (!navigator.canShare({ files: filesArray })) {
      console.warn('Cannot share all files together');
      toast.dismiss(loadingToast);
      toast.error('Cannot share all files together. Try sharing fewer documents.');
      return false;
    }

    // Step 7: Share karo!
    const shareMessage = loanData
      ? `Loan Application - ${loanData.id}\n\nApplicant: ${loanData.applicant_name || 'Customer'}\nLoan Amount: ₹${Number(loanData.loan_amount || 0).toLocaleString()}\n\nDocuments: PDF + ${imageFiles.length} images`
      : `Loan Documents\n\nPDF + ${imageFiles.length} images`;

    console.log('Initiating share...');
    toast.dismiss(loadingToast);

    await navigator.share({
      files: filesArray,
      title: 'Finonest Loan Documents',
      text: shareMessage
    });

    console.log('✅ Success: All attachments shared to WhatsApp!');
    toast.success(`Shared PDF + ${imageFiles.length} images!`);
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
 * Share only images (without PDF)
 * Jab user sirf photos share karna chahta hai
 */
export async function shareImagesOnlyWhatsApp(
  documentIds: any[] = [],
  loanData?: LoanData
): Promise<boolean> {
  try {
    if (!navigator.share || !navigator.canShare) {
      console.warn('Web Share API not supported');
      toast.error('Sharing not supported on this device');
      return false;
    }

    const loadingToast = toast.loading('Preparing images...');

    // Fetch documents
    const allDocs = await fetchDocumentFiles(documentIds);
    const imageDocs = allDocs.filter(f => f.type.startsWith('image/'));

    if (imageDocs.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No images to share');
      return false;
    }

    // Compress images
    console.log('Compressing images...');
    const compressedImages: File[] = [];

    for (const img of imageDocs) {
      try {
        const compressed = await compressImageForSharing(img);
        compressedImages.push(compressed);
      } catch (error) {
        console.warn('Compression failed, using original:', error);
        compressedImages.push(img);
      }
    }

    // Check if can share
    if (!navigator.canShare({ files: compressedImages })) {
      toast.dismiss(loadingToast);
      toast.error('Cannot share these images');
      return false;
    }

    toast.dismiss(loadingToast);

    // Share
    await navigator.share({
      files: compressedImages,
      title: 'Loan Document Images',
      text: loanData
        ? `Document images for loan ${loanData.id}`
        : 'Loan document images'
    });

    console.log('✅ Images shared successfully!');
    toast.success(`Shared ${compressedImages.length} images!`);
    return true;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      toast.info('Sharing cancelled');
      return false;
    }
    console.error('Share error:', error);
    toast.error('Failed to share images');
    return false;
  }
}

/**
 * Get sharing statistics
 */
export async function getShareStatistics(
  pdfBlob: Blob,
  documentIds: any[] = []
): Promise<{
  totalFiles: number;
  totalSize: string;
  pdfSize: string;
  imageCount: number;
  imagesSize: string;
}> {
  try {
    const pdfSize = (pdfBlob.size / (1024 * 1024)).toFixed(2);

    const allDocs = await fetchDocumentFiles(documentIds);
    const imageDocs = allDocs.filter(f => f.type.startsWith('image/'));

    let compressedSize = 0;
    for (const img of imageDocs) {
      try {
        const compressed = await compressImageForSharing(img);
        compressedSize += compressed.size;
      } catch {
        compressedSize += img.size;
      }
    }

    const totalSize = pdfBlob.size + compressedSize;

    return {
      totalFiles: 1 + imageDocs.length,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      pdfSize: pdfSize + ' MB',
      imageCount: imageDocs.length,
      imagesSize: (compressedSize / (1024 * 1024)).toFixed(2) + ' MB'
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalFiles: 0,
      totalSize: '0 MB',
      pdfSize: '0 MB',
      imageCount: 0,
      imagesSize: '0 MB'
    };
  }
}

/**
 * Check device sharing capabilities
 */
export function canShareMultipleFiles(): boolean {
  return !!(navigator.share && navigator.canShare);
}

/**
 * Get device info for debugging
 */
export function getDeviceInfo() {
  return {
    supportsShare: !!navigator.share,
    supportsCanShare: !!navigator.canShare,
    userAgent: navigator.userAgent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  };
}
