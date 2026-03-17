'use client';

import { useState, useRef } from 'react';
import { Translation } from '@/lib/translations';
import { Button } from '@/components/ui';

interface UploadProps {
  t: Translation;
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export default function Upload({ t, onUpload, isProcessing }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert(t.errorFile);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large (max 10MB)');
      return;
    }

    onUpload(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
        ${isDragging 
          ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' 
          : 'border-gray-700 hover:border-violet-500/50 hover:bg-gray-800/30'
        }
        ${isProcessing ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center py-16 px-8">
        {/* Upload Icon */}
        <div className={`mb-6 p-4 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 ${isDragging ? 'animate-pulse' : ''}`}>
          <svg 
            className={`w-12 h-12 text-violet-400 transition-transform ${isDragging ? 'scale-110' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>

        {/* Text */}
        <p className="text-xl font-semibold text-white mb-2">
          {t.uploadTitle}
        </p>
        <p className="text-gray-400 mb-6">
          {t.uploadHint}
        </p>

        {/* Supported formats */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
            PNG
          </span>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
            JPG
          </span>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
            WebP
          </span>
          <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-400">
            Max 10MB
          </span>
        </div>

        {/* Button */}
        <Button size="lg" loading={isProcessing}>
          {isProcessing ? t.processing : t.uploadButton}
        </Button>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-2xl">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">{t.processing}</p>
          </div>
        </div>
      )}
    </div>
  );
}
