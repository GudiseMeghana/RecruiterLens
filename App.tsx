import React, { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { parseFileText, parseZip, parseFileContent, ZipFileEntry } from './services/fileParserService';
import { extractSingleResumeData } from './services/geminiService';
import { ExtractedData, ResumeData, ProcessingState, ProcessProgress } from './types';
import { ACCEPTED_FILE_TYPES } from './constants';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [progress, setProgress] = useState<ProcessProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({}); // For individual file errors in a ZIP
  const [jobDescription, setJobDescription] = useState<string>("");
  const [atsCheckLoading, setAtsCheckLoading] = useState<boolean>(false);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setExtractedData(null);
    setError(null);
    setFileErrors({});
    setProcessingState(ProcessingState.IDLE);
    setProgress({});
  }, []);

  const getFileNameWithoutExtension = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return fileName;
    return fileName.substring(0, lastDot);
  };

  const processResume = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    if (!ACCEPTED_FILE_TYPES[selectedFile.type]) {
      setError(`Unsupported file type. Please upload: ${Object.values(ACCEPTED_FILE_TYPES).join(', ')}`);
      return;
    }

    setError(null);
    setExtractedData(null);
    setFileErrors({});
    setProcessingState(ProcessingState.PARSING_FILE); // Initial state: parsing the input file/zip
    setProgress({ currentFileName: selectedFile.name, currentFileStage: 'PARSING' });

    const allResults: ResumeData[] = [];
    const currentFileErrors: Record<string, string> = {};

    try {
      if (selectedFile.type === 'application/zip' || selectedFile.type === 'application/x-zip-compressed') {
        setProgress(prev => ({ ...prev, currentFileStage: 'PARSING', currentFileName: `ZIP: ${selectedFile.name}` }));
        const zipFiles = await parseZip(selectedFile);
        
        if (zipFiles.length === 0) {
            setError("The ZIP file is empty or contains no supported resume files (PDF, DOCX).");
            setProcessingState(ProcessingState.ERROR);
            setProgress({});
            return;
        }

        setProgress(prev => ({ ...prev, totalFiles: zipFiles.length, processedFiles: 0 }));

        for (let i = 0; i < zipFiles.length; i++) {
          const entry: ZipFileEntry = zipFiles[i];
          
          setProcessingState(ProcessingState.PARSING_FILE); // Set state for parsing current file in ZIP
          setProgress(prev => ({
            ...prev,
            processedFiles: i,
            currentFileName: entry.fileName,
            currentFileStage: 'PARSING',
          }));
          try {
            const text = await parseFileContent(entry.content, entry.type);
            if (!text.trim()) {
              console.warn(`Empty text extracted from ${entry.fileName}`);
              currentFileErrors[entry.fileName] = "Could not extract text or file is empty.";
              continue;
            }
            
            setProcessingState(ProcessingState.CALLING_API); // Switch to API calling state
            setProgress(prev => ({ ...prev, currentFileStage: 'EXTRACTING' }));
            const data = await extractSingleResumeData(text);
            allResults.push({ ...data, fileName: entry.fileName });
          } catch (fileErr) {
            console.error(`Error processing ${entry.fileName}:`, fileErr);
            currentFileErrors[entry.fileName] = fileErr instanceof Error ? fileErr.message : "Unknown error processing this file.";
          }
        }
        setFileErrors(currentFileErrors);
      } else {
        // Single file processing (PDF/DOCX)
        // Initial setProcessingState(ProcessingState.PARSING_FILE) at the top of processResume covers this.
        // Initial setProgress with currentFileStage: 'PARSING' at the top also covers this.
        const text = await parseFileText(selectedFile);
        if (!text.trim()) {
          setError("Could not extract text from the file, or the file is empty.");
          setProcessingState(ProcessingState.ERROR);
          setProgress({});
          return;
        }

        setProcessingState(ProcessingState.CALLING_API); // Switch to API calling state
        setProgress(prev => ({ ...prev, currentFileStage: 'EXTRACTING' }));
        const data = await extractSingleResumeData(text);
        allResults.push({ ...data, fileName: selectedFile.name });
        setProgress(prev => ({ ...prev, processedFiles: 1 }));
      }

      setExtractedData(allResults);
      setProcessingState(ProcessingState.SUCCESS);
      if (Object.keys(currentFileErrors).length > 0) {
        setError("Some files in the ZIP could not be processed. See details below the results.");
      }

    } catch (err) {
      console.error("Processing error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during processing.";
      setError(`Error: ${errorMessage}`);
      setProcessingState(ProcessingState.ERROR);
    } finally {
      setProgress(prev => ({ ...prev, currentFileStage: undefined })); // Clear stage
    }
  };

  // Handler for ATS check (detailed)
  const handleAtsCheck = async () => {
    if (!selectedFile || !jobDescription.trim()) return;
    setAtsCheckLoading(true);
    setError(null);
    try {
      let resumeText = "";
      if (selectedFile.type === 'application/zip' || selectedFile.type === 'application/x-zip-compressed') {
        setError("ATS check is only available for single resume files, not ZIPs.");
        setAtsCheckLoading(false);
        return;
      } else {
        resumeText = await parseFileText(selectedFile);
      }
      if (!resumeText.trim()) {
        setError("Could not extract text from the file, or the file is empty.");
        setAtsCheckLoading(false);
        return;
      }
      const { checkAtsMatchDetailed } = await import('./services/geminiService');
      const result = await checkAtsMatchDetailed(resumeText, jobDescription);
      setError(null);
      window.alert(
        `ATS Match Score: ${result.score} / 100\n\nMatched Keywords: ${result.matchedKeywords.join(', ') || 'None'}\nMissing Keywords: ${result.missingKeywords.join(', ') || 'None'}\n\nSummary: ${result.summary}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error during ATS check.");
    } finally {
      setAtsCheckLoading(false);
    }
  };

  const isLoading = processingState === ProcessingState.PARSING_FILE || processingState === ProcessingState.CALLING_API;
  
  let loadingMessage = "Processing...";
  if (isLoading) {
    if (progress.currentFileStage === 'PARSING') {
      loadingMessage = `Parsing ${progress.currentFileName || 'file'}...`;
    } else if (progress.currentFileStage === 'EXTRACTING') {
      loadingMessage = `Extracting data from ${progress.currentFileName || 'file'}...`;
    }
    if (progress.totalFiles && typeof progress.processedFiles !== 'undefined' && progress.totalFiles > 1) {
      loadingMessage += ` (File ${progress.processedFiles + 1} of ${progress.totalFiles})`;
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
          Resume Insight Extractor
        </h1>
        <p className="mt-3 text-xl text-slate-300 max-w-3xl mx-auto">
          Upload resumes (PDF, DOCX, or a ZIP of resumes) to automatically extract key information using AI.
        </p>
      </header>

      <main className="w-full max-w-3xl bg-slate-50 p-6 sm:p-8 rounded-xl shadow-2xl">
        <div className="mb-8">
          <label htmlFor="job-description" className="block text-base font-semibold text-slate-800 mb-2">Job Description for ATS Check</label>
          <textarea
            id="job-description"
            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white mb-2"
            rows={4}
            placeholder="Paste the job description here to check ATS match."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            disabled={isLoading || atsCheckLoading}
          />
          <button
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ minWidth: 180 }}
            disabled={!selectedFile || !jobDescription.trim() || isLoading || atsCheckLoading}
            onClick={() => handleAtsCheck()}
          >
            {atsCheckLoading ? 'Checking ATS Match...' : 'Check ATS Match'}
          </button>
        </div>

        <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />

        {selectedFile && (
          <button
            onClick={processResume}
            disabled={isLoading || !selectedFile}
            className="mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
            aria-live="polite"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingMessage}
              </>
            ) : (
              'Extract Information'
            )}
          </button>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading && <LoadingSpinner message={loadingMessage} />}
        
        {processingState === ProcessingState.SUCCESS && extractedData && (
          <ResultsDisplay 
            data={extractedData} 
            fileNameForDownload={selectedFile ? getFileNameWithoutExtension(selectedFile.name) + "_extracted_batch" : "resumes_data"}
            fileErrors={fileErrors}
          />
        )}
        {processingState === ProcessingState.SUCCESS && (!extractedData || extractedData.length === 0) && Object.keys(fileErrors).length === 0 && (
             <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md" role="alert">
                <p className="font-bold">Processing Complete</p>
                <p>No information could be extracted, or no valid resume content was found.</p>
             </div>
        )}
      </main>
      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>Built for Recruiters & Talent Acquisition Teams</p>
      </footer>
    </div>
  );
};

export default App;
