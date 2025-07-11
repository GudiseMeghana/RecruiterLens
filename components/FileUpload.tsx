import React, { useRef, useState } from 'react';
import { ACCEPTED_FILE_TYPES } from '../constants';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (ACCEPTED_FILE_TYPES[file.type]) {
        setSelectedFileName(file.name);
        onFileSelect(file);
      } else {
        // Fallback for zip if main type isn't registered but name suggests zip
        const isZipByName = file.name.toLowerCase().endsWith('.zip');
        if (isZipByName && (ACCEPTED_FILE_TYPES['application/zip'] || ACCEPTED_FILE_TYPES['application/x-zip-compressed'])) {
             setSelectedFileName(file.name);
             onFileSelect(file);
        } else {
            const friendlyFileTypes = Object.values(ACCEPTED_FILE_TYPES)
                .filter((value, index, self) => self.indexOf(value) === index) // Unique values
                .join(', ');
            setFileError(`Unsupported file type. Please upload: ${friendlyFileTypes}`);
            setSelectedFileName(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset file input
            }
        }
      }
    } else {
      setSelectedFileName(null); // No file selected or selection cancelled
    }
  };

  const acceptedTypesString = Object.keys(ACCEPTED_FILE_TYPES).join(',');

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-200 p-8 rounded-xl shadow-xl border border-slate-300">
      <label htmlFor="resume-upload-input" className="block text-lg font-semibold text-gray-800 mb-3">
        <span className="text-slate-900">Upload Resume(s)</span> <span className="text-indigo-500">(PDF, DOCX, or ZIP for bulk)</span>
      </label>
      <p className="text-xs text-slate-500 mb-2 italic">Tip: Upload a ZIP to process multiple candidates at once.</p>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-400 border-dashed rounded-xl">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-indigo-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="resume-upload-input"
              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              aria-label="Choose resume file to upload"
            >
              <span className="transition-colors duration-150">Choose file</span>
              <input
                id="resume-upload-input"
                name="resume-upload-input"
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept={acceptedTypesString}
                onChange={handleFileChange}
                disabled={disabled}
                aria-describedby="resume-upload-tip"
              />
            </label>
            <p className="pl-1 text-slate-500">or drag and drop</p>
          </div>
          <p id="resume-upload-tip" className="text-xs text-slate-400">Accepted formats: PDF, DOCX, ZIP (max 10MB)</p>
        </div>
      </div>

      {selectedFileName && (
        <p className="mt-3 text-sm font-medium text-indigo-700">Selected file: {selectedFileName}</p>
      )}
      {fileError && (
        <p className="mt-2 text-sm text-red-500">{fileError}</p>
      )}
    </div>
  );
};

export default FileUpload;