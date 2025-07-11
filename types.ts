export interface ExperienceEntry {
  company_name: string;
  customer_name: string;
  role: string;
  duration: string;
  skills_technologies: string[];
  industry_domain: string;
  location: string;
}

export interface ResumeData {
  fileName: string; // Original name of the file processed
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  work_experience: ExperienceEntry[];
  ats_score?: number; // ATS score (0-100)
}

export type ExtractedData = ResumeData[]; // An array of ResumeData objects

export enum ProcessingState {
  IDLE = 'IDLE',
  PARSING_FILE = 'PARSING_FILE', // Covers single file parsing or parsing files from ZIP
  CALLING_API = 'CALLING_API',   // API call in progress
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ProcessProgress {
  totalFiles?: number;
  processedFiles?: number;
  currentFileName?: string;
  currentFileStage?: 'PARSING' | 'EXTRACTING';
}