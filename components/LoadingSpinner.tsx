import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col justify-center items-center my-10 p-8 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-xl border border-slate-300" role="status" aria-live="assertive">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
      <p className="text-lg font-medium text-slate-800">{message || 'Analyzing resumes for recruiter insights...'}</p>
      {!message && <p className="text-sm text-slate-500">Sit tight! We’re extracting candidate details to help you shortlist faster.</p>}
      <div className="mt-2 text-xs text-indigo-400 animate-pulse">Recruiter Mode: Smart Extraction in Progress</div>
    </div>
  );
};

export default LoadingSpinner;