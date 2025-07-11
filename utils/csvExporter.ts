import { ResumeData, ExtractedData, ExperienceEntry } from '../types';

export const exportToCsv = (allResumeData: ExtractedData, baseFileName: string): void => {
  if (!allResumeData || allResumeData.length === 0) {
    if (typeof alert !== 'undefined') alert("No data available to export.");
    console.warn("exportToCsv called with no data.");
    return;
  }

  const headers = [
    "Source File Name",
    "Full Name",
    "Email",
    "Phone Number",
    "Company Name",
    "Customer Name",
    "Role",
    "Duration",
    "Skills/Technologies",
    "Industry/Domain",
    "Location"
  ];

  const rows: string[][] = [];

  allResumeData.forEach(resume => {
    if (resume.work_experience.length > 0) {
      resume.work_experience.forEach(entry => {
        const skillsString = entry.skills_technologies && Array.isArray(entry.skills_technologies)
                             ? entry.skills_technologies.join('; ')
                             : (entry.skills_technologies || "N/A");
        
        rows.push([
          resume.fileName || "N/A",
          resume.full_name || "N/A",
          resume.email || "N/A",
          resume.phone_number || "N/A",
          entry.company_name || "N/A",
          entry.customer_name || "N/A",
          entry.role || "N/A",
          entry.duration || "N/A",
          skillsString,
          entry.industry_domain || "N/A",
          entry.location || "N/A"
        ].map(field => `"${String(field).replace(/"/g, '""')}"`));
      });
    } else {
      // Add a row for resumes with no work experience but with personal info
       rows.push([
          resume.fileName || "N/A",
          resume.full_name || "N/A",
          resume.email || "N/A",
          resume.phone_number || "N/A",
          "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A" // Placeholders for experience fields
        ].map(field => `"${String(field).replace(/"/g, '""')}"`));
    }
  });


  let csvContent = headers.join(",") + "\n";
  csvContent += rows.map(row => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");

  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${baseFileName}.csv`);

  link.style.visibility = 'hidden';
  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};