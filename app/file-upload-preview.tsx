'use client';

import Image from 'next/image';
import { useState, useCallback, useRef } from 'react';
import { FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { uploadFile } from './actions';

export default function FileUploadPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<object>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);

      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        setPreview('pdf');
      }
    },
    [setFile, setPreview, file]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // file-upload-preview.tsx の handleSubmit 関数を修正
  const handleSubmit = async () => {
    if (file) {
      try {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('parseTargetFile', file);
        setTicketInfo(await uploadFile(formData));
        // 成功時の処理
        setFile(null);
        setPreview(null);
      } catch (error) {
        console.error('Upload failed:', error);
        // エラー処理を追加
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardContent>
        <div
          className={`mt-4 p-4 border-2 border-dashed rounded-lg text-center ${
            isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            id="fileInput"
            name="parseTargetFile"
            className="hidden"
            accept="image/*,application/pdf"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
          <label htmlFor="fileInput" className="cursor-pointer">
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Drag and drop your file here, or click to select
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Supports: Images and PDF
              </p>
              <Button
                className="mt-4"
                variant="outline"
                size="sm"
                onClick={onButtonClick}
              >
                Select File
              </Button>
            </div>
          </label>
        </div>

        {file && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold">File Preview</h3>
            <div className="mt-2 p-4 border rounded-lg">
              {preview === 'pdf' ? (
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-primary mr-2" />
                  <span>{file.name}</span>
                </div>
              ) : preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-auto rounded"
                />
              ) : (
                <div className="flex items-center">
                  <ImageIcon className="w-8 h-8 text-primary mr-2" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {file && (
          <Button
            className="mt-4 bg-orange-500"
            variant="outline"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      </CardContent>
      {Object.keys(ticketInfo).length > 0 && (
        <CardContent>
          {Object.entries(ticketInfo).map(([key, value]) => (
            <div key={key} className="mb-2">
              <CardTitle>{key}</CardTitle>
              <CardDescription>{value}</CardDescription>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
