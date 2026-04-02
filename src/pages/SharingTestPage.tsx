import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { shareLoanWithDocumentsAndroid, shareDocumentsAndroid, getDeviceInfo, isAndroid, isPWA, isWebShareAvailable } from '@/lib/android-share';
import { toast } from 'sonner';

export default function SharingTestPage() {
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testDeviceDetection = () => {
    const info = getDeviceInfo();
    setDeviceInfo(info);
    addTestResult(`Device detection: Android=${info.isAndroid}, PWA=${info.isPWA}, WebShare=${info.hasWebShare}`);
    toast.success('Device detection test completed');
  };

  const testLoanSharing = async () => {
    try {
      addTestResult('Starting loan sharing test...');

      // Create a mock PDF file
      const mockPDF = new File(['Mock PDF content for testing'], 'test-loan.pdf', { type: 'application/pdf' });

      const mockLoan = {
        id: 'TEST-123',
        applicant_name: 'John Doe',
        car_make: 'Toyota',
        car_model: 'Camry',
        loan_amount: 500000,
        status: 'Approved',
        tenure: 60
      };

      const result = await shareLoanWithDocumentsAndroid(mockLoan, [mockPDF]);
      addTestResult(`Loan sharing test: ${result ? 'SUCCESS' : 'CANCELLED'}`);
      toast.success('Loan sharing test completed');
    } catch (error: any) {
      addTestResult(`Loan sharing test failed: ${error.message}`);
      toast.error('Loan sharing test failed');
    }
  };

  const testDocumentSharing = async () => {
    try {
      addTestResult('Starting document sharing test...');

      // Create mock files
      const mockImage = new File(['Mock image content'], 'test-image.jpg', { type: 'image/jpeg' });
      const mockPDF = new File(['Mock PDF content'], 'test-doc.pdf', { type: 'application/pdf' });

      const result = await shareDocumentsAndroid([mockImage, mockPDF], 'Test Documents', 'Multiple test documents');
      addTestResult(`Document sharing test: ${result ? 'SUCCESS' : 'CANCELLED'}`);
      toast.success('Document sharing test completed');
    } catch (error: any) {
      addTestResult(`Document sharing test failed: ${error.message}`);
      toast.error('Document sharing test failed');
    }
  };

  const testTextOnlySharing = async () => {
    try {
      addTestResult('Starting text-only sharing test...');

      if (!navigator.share) {
        addTestResult('Web Share API not available');
        toast.error('Web Share API not available');
        return;
      }

      await navigator.share({
        title: 'Test Text Sharing',
        text: 'This is a test of text-only sharing functionality.'
      });

      addTestResult('Text-only sharing test: SUCCESS');
      toast.success('Text-only sharing test completed');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addTestResult('Text-only sharing test: CANCELLED');
      } else {
        addTestResult(`Text-only sharing test failed: ${error.message}`);
        toast.error('Text-only sharing test failed');
      }
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Android PWA Sharing Test</h1>
        <p className="text-muted-foreground">
          Test the document and PDF sharing functionality for Android PWA
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
            <CardDescription>Current device and browser capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Android Device:</span>
              <Badge variant={deviceInfo.isAndroid ? "default" : "secondary"}>
                {deviceInfo.isAndroid ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>PWA Mode:</span>
              <Badge variant={deviceInfo.isPWA ? "default" : "secondary"}>
                {deviceInfo.isPWA ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Web Share API:</span>
              <Badge variant={deviceInfo.hasWebShare ? "default" : "secondary"}>
                {deviceInfo.hasWebShare ? "Available" : "Not Available"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              User Agent: {deviceInfo.userAgent.substring(0, 50)}...
            </div>
            <Button onClick={testDeviceDetection} className="w-full">
              Refresh Device Info
            </Button>
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Sharing Tests</CardTitle>
            <CardDescription>Test different sharing scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={testLoanSharing} className="w-full" disabled={!deviceInfo.hasWebShare}>
              Test Loan PDF Sharing
            </Button>
            <Button onClick={testDocumentSharing} className="w-full" disabled={!deviceInfo.hasWebShare}>
              Test Document Sharing
            </Button>
            <Button onClick={testTextOnlySharing} className="w-full" disabled={!deviceInfo.hasWebShare}>
              Test Text-Only Sharing
            </Button>
            <Button onClick={clearResults} variant="outline" className="w-full">
              Clear Results
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Output from sharing tests</CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-muted-foreground">No test results yet. Run a test to see results here.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-muted p-2 rounded">
                  {result}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Test on Android PWA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <strong>Open in Chrome on Android</strong></p>
          <p>2. <strong>Add to Home screen:</strong> Menu → "Add to Home screen"</p>
          <p>3. <strong>Open the PWA</strong> from your home screen</p>
          <p>4. <strong>Run tests above</strong> to verify sharing functionality</p>
          <p>5. <strong>Check results</strong> for success/failure status</p>
        </CardContent>
      </Card>
    </div>
  );
}