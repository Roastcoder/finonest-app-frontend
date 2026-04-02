// Updated prepareDocumentShareBundle with proper MIME type handling

import { getMimeTypeFromFileName, ensureCorrectMimeType } from '@/lib/document-utils';

export async function prepareDocumentShareBundleFixed(docs: any[] = []) {
  try {
    if (!docs || docs.length === 0) {
      return {
        title: 'Loan Documents',
        text: '0 loan documents',
        files: [],
        docCount: 0,
      };
    }

    console.log(`Preparing document share bundle for ${docs.length} documents`);
    const docFileObjs = await fetchDocumentFiles(docs);
    
    if (!docFileObjs || docFileObjs.length === 0) {
      console.warn('No document files could be fetched');
      return {
        title: 'Loan Documents',
        text: `${docs.length} documents (could not load files)`,
        files: [],
        docCount: docs.length,
      };
    }
    
    console.log(`Successfully fetched ${docFileObjs.length} document files`);
    
    // Separate by file type for better mobile compatibility
    const imageFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      const isImage = fileType.startsWith('image/');
      console.log(`Document ${docFile.name}: type=${fileType}, isImage=${isImage}`);
      return isImage;
    });
    
    const pdfFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.includes('pdf');
    });
    
    const otherFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return !fileType.startsWith('image/') && !fileType.includes('pdf');
    });
    
    console.log(`Image files: ${imageFiles.length}, PDF files: ${pdfFiles.length}, Other files: ${otherFiles.length}`);
    
    // Prioritize images for Android/PWA compatibility, then PDFs, then others
    const prioritizedFiles = [...imageFiles, ...pdfFiles, ...otherFiles].map(docFile => docFile.file);
    
    console.log(`Final share bundle: ${prioritizedFiles.length} files ready to share`);
    console.log('File types in bundle:', prioritizedFiles.map(f => ({ name: f.name, type: f.type })));
    
    return {
      title: 'Loan Documents',
      text: `${docFileObjs.length} loan documents`,
      files: prioritizedFiles,
      docCount: docFileObjs.length,
    };
  } catch (error) {
    console.error('Error preparing document share bundle:', error);
    throw error;
  }
}
