import React from 'react';
import { ExtractedData, ResumeData, ExperienceEntry } from '../types';
import { exportToCsv } from '../utils/csvExporter';

interface ResultsDisplayProps {
  data: ExtractedData | null;
  fileNameForDownload: string;
  fileErrors?: Record<string, string>; // Optional: errors for individual files in a ZIP
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, fileNameForDownload, fileErrors }) => {
  if (!data || data.length === 0) {
    if (fileErrors && Object.keys(fileErrors).length > 0) {
      // Show only file errors if no data was successfully extracted
    } else {
      return null; // No data and no specific file errors to show, App.tsx handles generic "no data" message
    }
  }

  const handleDownload = () => {
    if (data && data.length > 0) {
      exportToCsv(data, fileNameForDownload || "resumes_extracted_data");
    } else {
      alert("No data to download.");
    }
  };

  const hasSuccessfullyExtractedData = data && data.length > 0;

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-300">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2 sm:mb-0 tracking-tight">
          Candidate Extraction Results
        </h2>
        {hasSuccessfullyExtractedData && (
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-150 ease-in-out shadow-sm text-sm font-medium"
          >
            Download All as CSV
          </button>
        )}
      </div>
      {hasSuccessfullyExtractedData && (
        <div className="mb-4 text-sm text-slate-600">
          <span className="font-semibold text-green-700">Tip:</span> CSV is compatible with most ATS and spreadsheet tools.
        </div>
      )}

      {(!hasSuccessfullyExtractedData && (!fileErrors || Object.keys(fileErrors).length === 0)) && (
         <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
            <p className="font-bold">No Data</p>
            <p>No information could be extracted from the provided file(s).</p>
         </div>
      )}

      {fileErrors && Object.keys(fileErrors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-700 mb-2">File Processing Issues</h3>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
            {Object.entries(fileErrors).map(([fileName, errorMsg]) => (
              <li key={fileName}><strong>{fileName}:</strong> {errorMsg}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="space-y-8">
        {data?.map((resume: ResumeData, resumeIndex: number) => (
          <div key={resumeIndex} className="bg-gradient-to-br from-white to-slate-100 p-6 rounded-xl shadow-xl border border-slate-300">
            <h3 className="text-xl font-bold text-indigo-800 mb-4 pb-2 border-b border-indigo-100">
              Candidate: <span className="font-medium">{resume.full_name || resume.fileName}</span>
            </h3>
            <div className="mb-4 text-sm text-slate-700">
              <span className="font-semibold">File:</span> {resume.fileName}
              {typeof resume.ats_score === 'number' && (
                <span className="ml-4 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold" title="ATS Score">
                  ATS Score: {resume.ats_score} / 100
                </span>
              )}
            </div>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong className="text-slate-700 block">Full Name:</strong>
                <p className="text-gray-600">{resume.full_name || 'N/A'}</p>
              </div>
              <div>
                <strong className="text-slate-700 block">Email:</strong>
                <p className="text-gray-600 break-all">{resume.email || 'N/A'}</p>
              </div>
              <div>
                <strong className="text-slate-700 block">Phone Number:</strong>
                <p className="text-gray-600">{resume.phone_number || 'N/A'}</p>
              </div>
            </div>

            {resume.work_experience.length > 0 ? (
              <>
                <h4 className="text-lg font-semibold text-indigo-700 mb-3">Work Experience:</h4>
                <div className="space-y-5">
                  {resume.work_experience.map((entry: ExperienceEntry, expIndex: number) => (
                    <div key={expIndex} className="p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-md">
                      <h5 className="text-md font-semibold text-indigo-700">
                        {entry.role || 'Role Not Specified'}
                      </h5>
                      <p className="text-sm text-slate-700 font-medium mb-2">
                        <span className="font-normal">at</span> {entry.company_name || 'Company Not Specified'}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                        <div>
                          <strong className="text-slate-800">Client/Customer:</strong>
                          <p>{entry.customer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <strong className="text-slate-800">Duration:</strong>
                          <p>{entry.duration || 'N/A'}</p>
                        </div>
                        <div>
                          <strong className="text-slate-800">Industry/Domain:</strong>
                          <p>{entry.industry_domain || 'N/A'}</p>
                        </div>
                        <div>
                          <strong className="text-slate-800">Location:</strong>
                          <p>{entry.location || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2 mt-1">
                          <strong className="text-slate-800 block mb-1">Skills/Technologies:</strong>
                          {entry.skills_technologies && entry.skills_technologies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {entry.skills_technologies.map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : <p>N/A</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic mt-4">No specific work experiences found or extracted for this resume.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;