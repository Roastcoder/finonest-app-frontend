// Helper function to detect correct MIME type from file extension
export function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName?.toLowerCase() || '';
  
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.gif')) return 'image/gif';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.pdf')) return 'application/pdf';
  if (ext.endsWith('.doc') || ext.endsWith('.docx')) return 'application/msword';
  if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) return 'application/vnd.ms-excel';
  
  return 'application/octet-stream';
}

// Helper to ensure blob has correct MIME type
export function ensureCorrectMimeType(blob: Blob, fileName: string): Blob {
  const detectedMimeType = getMimeTypeFromFileName(fileName);
  
  // If blob already has correct type, return as is
  if (blob.type === detectedMimeType) {
    return blob;
  }
  
  // If blob has no type or wrong type, create new blob with correct type
  if (!blob.type || blob.type === 'application/octet-stream') {
    return new Blob([blob], { type: detectedMimeType });
  }
  
  return blob;
}
