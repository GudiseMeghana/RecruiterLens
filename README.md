
<div align="center">

# 🚀 RecruiterLens

[![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)](https://react.dev/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Google-blueviolet?logo=google)](https://ai.google.dev/)


<b>AI Resume Data Extractor & ATS Match for Recruiters</b>

</div>

> Professional, recruiter-focused AI tool for extracting candidate information and ATS match scores from resumes. Built for talent teams to streamline screening, keyword analysis, and data export.

---

## Features

- **Bulk Resume Upload:** PDF, DOCX, ZIP
- **Automated Data Extraction:** Name, contact info, experience, skills
- **ATS Score:** AI-powered score (0-100)
- **ATS Match Check:** Paste job description for transparent ATS match (score, matched/missing keywords, summary)
- **CSV Export:** Download extracted data
- **Error Reporting:** See which files failed and why
- **Fast & Secure:** Runs locally, no resume data leaves your machine


## ATS Match Transparency

- **Score (0-100):** Resume vs. job description
- **Matched Keywords:** Found in resume
- **Missing Keywords:** Not found in resume
- **Summary:** One-sentence match quality

---

## Project Structure

- `App.tsx` — Main UI
- `components/` — FileUpload, ResultsDisplay, LoadingSpinner
- `services/` — File parsing & AI extraction
- `utils/` — CSV export utility
- `outputs/` — Downloaded CSV files

---

## For Recruiters

- Fast, accurate, transparent
- Bulk resume processing
- Clear error messages
- Export-ready for ATS/Excel

---

## Installation
1. Clone Repository
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
1. Open [recruiter-lens.vercel.app](recruiter-lens.vercel.app) in your browser
2. Upload resumes (PDF, DOCX, or ZIP)
3. Click "Extract Information"
4. Review extracted data and download as CSV
5. Paste a job description and click "Check ATS Match" for a detailed score and keyword analysis



## Contributing
Pull requests welcome! For major changes, open an issue first to discuss what you’d like to change.

## License
MIT
