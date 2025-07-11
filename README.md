# Resume Insight Extractor

Recruiter-ready AI tool for extracting key candidate information from resumes (PDF, DOCX, or ZIP of resumes). Built for talent acquisition teams to streamline candidate screening and data extraction.

## Features
- **Bulk Resume Upload:** Upload single or multiple resumes (PDF/DOCX/ZIP)
- **Automated Data Extraction:** Extracts name, contact info, education, experience, skills, and more
- **ATS Score:** Each resume gets an AI-powered ATS score (0-100) for recruiter relevance
- **ATS Match Check:** Paste a job description and get a transparent ATS match score, matched/missing keywords, and summary
- **CSV Export:** Download extracted data for ATS or spreadsheet use
- **Error Reporting:** See which files failed and why
- **Fast & Secure:** Runs locally, no resume data leaves your machine

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)

### Installation
1. Clone this repo:
   ```sh
   git clone https://github.com/your-org/resume-data-extractor.git
   cd resume-data-extractor
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set your Gemini API key in `.env.local`:
   ```env
   GEMINI_API_KEY=your-key-here
   ```
4. Start the app:
   ```sh
   npm run dev
   ```

## Usage
1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. Upload resumes (PDF, DOCX, or ZIP)
3. Click "Extract Information"
4. Review extracted data and download as CSV
5. Paste a job description and click "Check ATS Match" for a detailed score and keyword analysis

## ATS Match Transparency
- The ATS Match feature provides:
  - **Score (0-100):** How well the resume matches the job description
  - **Matched Keywords:** Keywords from the job description found in the resume
  - **Missing Keywords:** Important keywords not found in the resume
  - **Summary:** One-sentence explanation of the match quality

## Project Structure
- `App.tsx` - Main application logic and UI
- `components/` - UI components (FileUpload, ResultsDisplay, LoadingSpinner)
- `services/` - File parsing and AI extraction logic (including ATS match)
- `utils/` - CSV export utility
- `outputs/` - Downloaded CSV files

## For Recruiters
- Designed for speed and accuracy
- Handles bulk resume processing
- Clear error messages for problematic files
- Export-ready for ATS or Excel
- Transparent ATS scoring and match analysis

## Contributing
Pull requests welcome! For major changes, open an issue first to discuss what you’d like to change.

## License
MIT
