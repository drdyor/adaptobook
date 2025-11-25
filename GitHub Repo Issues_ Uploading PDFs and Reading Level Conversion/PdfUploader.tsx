import React, { useState, useCallback } from 'react';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  status: 'ready' | 'processing' | 'done' | 'error';
  message: string;
}

const PdfUploader: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'error',
        message: 'Invalid file type. Please upload a PDF file.',
      });
      return;
    }

    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      message: 'File selected. Reading content...',
    });

    // Minimal logic to read the file locally (no backend needed)
    const reader = new FileReader();
    reader.onloadstart = () => {
      setFileInfo(prev => prev ? { ...prev, status: 'processing', message: 'Reading file...' } : null);
    };
    reader.onload = (e) => {
      // In a real application, the result (e.target.result) would be sent to a backend
      // for text extraction and analysis.
      // For this minimal example, we just confirm the read was successful.
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileInfo(prev => prev ? {
        ...prev,
        status: 'done',
        message: `Successfully read ${fileSizeMB} MB. Ready for backend processing (e.g., text extraction and reading level analysis).`,
      } : null);
    };
    reader.onerror = () => {
      setFileInfo(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Error reading file with FileReader.',
      } : null);
    };

    // Read the file as an ArrayBuffer (common for sending to a server)
    reader.readAsArrayBuffer(file);
  }, []);

  const getStatusColor = (status: FileInfo['status']) => {
    switch (status) {
      case 'done': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'processing': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Minimal PDF Uploader (React/TS)</h1>
      
      <div style={{ border: '2px dashed #ccc', padding: '40px', textAlign: 'center', cursor: 'pointer' }}
           onClick={() => document.getElementById('file-input')?.click()}>
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p style={{ margin: '0', fontSize: '18px' }}>
          Drag 'n' drop a PDF here, or click to select file
        </p>
        <p style={{ fontSize: '14px', color: '#888' }}>(Only .pdf files accepted)</p>
      </div>

      {fileInfo && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
          <p><strong>File:</strong> {fileInfo.name}</p>
          <p><strong>Size:</strong> {(fileInfo.size / 1024).toFixed(2)} KB</p>
          <p>
            <strong>Status:</strong> 
            <span className={getStatusColor(fileInfo.status)} style={{ marginLeft: '10px' }}>
              {fileInfo.message}
            </span>
          </p>
        </div>
      )}
      
      <p style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        *This component uses the browser's FileReader API to read the file locally and does not require a backend. 
        In a real application, the file data would be sent to a server for PDF text extraction and reading level analysis.
      </p>
    </div>
  );
};

export default PdfUploader;
