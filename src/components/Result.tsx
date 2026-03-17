'use client';

import { Translation } from '@/lib/translations';
import { Button } from '@/components/ui';

interface ResultProps {
  t: Translation;
  originalImage: string;
  resultImage: string;
  onTryAgain?: () => void;
}

export default function Result({ t, originalImage, resultImage, onTryAgain }: ResultProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `removed-bg-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-white mb-6 text-center">
        Result
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Image */}
        <div className="relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-gray-900/80 rounded text-xs text-gray-400">
            Original
          </div>
          <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            <img
              src={originalImage}
              alt="Original"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Result Image */}
        <div className="relative">
          <div className="absolute top-2 left-2 px-2 py-1 bg-violet-500/80 rounded text-xs text-white">
            Result
          </div>
          <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
            {/* Checkerboard pattern for transparent background */}
            <div className="w-full h-full bg-[linear-gradient(45deg,#1a1a1a_25%,transparent_25%),linear-gradient(-45deg,#1a1a1a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1a1a1a_75%),linear-gradient(-45deg,transparent_75%,#1a1a1a_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_0,8px_-8px,0_8px]">
              <img
                src={resultImage}
                alt="Result"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 mt-6">
        <Button onClick={handleDownload}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t.download}
        </Button>
        
        {onTryAgain && (
          <Button variant="outline" onClick={onTryAgain}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t.tryAgain}
          </Button>
        )}
      </div>
    </div>
  );
}
