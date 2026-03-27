// Debug version to test RC template generation
import { generateRCTemplatePDF } from './rc-template';

export async function testRCTemplate(loan: any) {
  try {
    console.log('Starting RC template generation for loan:', loan.id);
    const blob = await generateRCTemplatePDF(loan);
    console.log('PDF blob generated:', blob.size, 'bytes');
    
    const url = URL.createObjectURL(blob);
    console.log('Object URL created:', url);
    
    // Try to open in new window
    const win = window.open(url, '_blank');
    if (win) {
      console.log('PDF opened in new window');
    } else {
      console.error('Could not open new window');
    }
    
    return { success: true, blob, url };
  } catch (error) {
    console.error('RC template generation failed:', error);
    return { success: false, error };
  }
}
