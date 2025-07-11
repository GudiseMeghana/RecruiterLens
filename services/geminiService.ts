import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ExperienceEntry, ResumeData } from '../types';
import { GEMINI_MODEL_NAME } from '../constants';

const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set.");
    throw new Error("API_KEY environment variable not set. Please configure it in your environment.");
  }
  return apiKey;
};

let ai: GoogleGenAI;
try {
    ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    // Allow the app to load, errors will be thrown when ai.models methods are called
}

const PROMPT_TEMPLATE = (resumeText: string) => `
You are an expert resume data extraction system. Your sole output MUST be a single, valid JSON object.
Extract the following information from the provided resume text.

The JSON object must have these top-level keys:
1.  "Full Name": The full name of the person. If not found, use JSON null (not the string "null").
2.  "Email": The primary email address. If not found, use JSON null.
3.  "Phone Number": The primary phone number. If not found, use JSON null.
4.  "Work Experience": An array of objects. Each object represents a distinct work experience.
5.  "ATS Score": (number, 0-100) A score estimating how well this resume would perform in a typical Applicant Tracking System (ATS) for recruiter search and ranking. Consider keyword match, clarity, formatting, and completeness. If not possible to score, use 0.

For each object in the "Work Experience" array, provide these keys:
    a.  "Company Name": (string) The name of the company. If not found, use the string "N/A".
    b.  "Customer Name": (string) The client/customer name. If internal or not mentioned, use "N/A".
    c.  "Role": (string) The job title/role. If not found, use "N/A".
    d.  "Duration": (string) The period worked (e.g., 'Jan 2020 - Dec 2022'). If not found, use "N/A".
    e.  "Skills/Technologies": (array of strings) Key skills/technologies for this role. If none found, use an empty array []. All strings in this array MUST be in double quotes.
    f.  "Industry/Domain": (string) Industry sector. If not found, use "N/A".
    g.  "Location": (string) Geographical region (e.g., "North America", "Remote"). If not found, use "N/A".

IMPORTANT JSON Structure Rules:
- The entire output MUST be a single JSON object. Do NOT include any explanatory text, markdown formatting (like \`\`\`json), or anything else before or after the JSON object.
- ALL string values, including keys and all textual data, MUST be enclosed in double quotes.
- If a specific Work Experience entry is badly garbled, incomplete, or cannot be reliably extracted to fit the defined structure, OMIT that entire entry from the 'Work Experience' array. Ensure the 'Work Experience' array itself remains valid JSON (e.g., [] if all entries are omitted, or [{...valid_entry...}]).
- Ensure no unquoted words or characters appear directly within arrays or objects outside of quoted strings.
- Between the closing brace \`}\` of one work experience object and the comma \`,\` and opening brace \`{\` of the next (or the final closing bracket \`]\` of the array), there must be absolutely no other text or characters.

Example structure:
{
  "Full Name": "Jane Doe",
  "Email": "jane.doe@example.com",
  "Phone Number": "123-456-7890",
  "ATS Score": 87,
  "Work Experience": [
    {
      "Company Name": "Tech Solutions Inc.",
      "Customer Name": "Client X",
      "Role": "Software Engineer",
      "Duration": "Jan 2020 - Present",
      "Skills/Technologies": ["Java", "Spring Boot", "AWS"],
      "Industry/Domain": "Technology",
      "Location": "North America"
    },
    {
      "Company Name": "Old Company LLC",
      "Customer Name": "N/A",
      "Role": "Junior Developer",
      "Duration": "May 2018 - Dec 2019",
      "Skills/Technologies": [],
      "Industry/Domain": "N/A",
      "Location": "Remote"
    }
  ]
}
If the input text does not appear to be a resume, or no information can be extracted:
{
  "Full Name": null,
  "Email": null,
  "Phone Number": null,
  "ATS Score": 0,
  "Work Experience": []
}

Resume Text:
---
${resumeText}
---
End of Resume Text. Output JSON object:
`;


export const extractSingleResumeData = async (resumeText: string): Promise<Omit<ResumeData, 'fileName'>> => {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. This might be due to a missing API key or an initialization error.");
  }

  if (!resumeText.trim()) {
    console.warn("Empty resume text provided. Returning empty data structure.");
    return {
      full_name: null,
      email: null,
      phone_number: null,
      work_experience: [],
    };
  }

  const prompt = PROMPT_TEMPLATE(resumeText);
  let rawApiResponse: GenerateContentResponse | null = null;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, 
        topP: 0.9,
        topK: 30,
      },
    });

    rawApiResponse = response;

    if (response.promptFeedback?.blockReason) {
      console.error(
        "Gemini API blocked the prompt or response. Reason:", response.promptFeedback.blockReason,
        "Safety Ratings:", response.promptFeedback.safetyRatings,
        "Full API Response:", JSON.stringify(rawApiResponse, null, 2)
      );
      throw new Error(
        `AI processing failed: ${response.promptFeedback.blockReason}. This may be due to safety filters on the input or output.`
      );
    }
    
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
        console.error("Gemini API returned no valid content parts. Full API Response:", JSON.stringify(rawApiResponse, null, 2));
        throw new Error("AI response was empty or malformed (no content parts).");
    }

    let jsonStr = response.text; // Accessing .text as per SDK guidelines for GenerateContentResponse
    
    if (typeof jsonStr !== 'string') {
        console.error("Gemini API response.text is not a string or is undefined. Full API Response:", JSON.stringify(rawApiResponse, null, 2));
        throw new Error("AI response text is not in the expected string format.");
    }
    
    jsonStr = jsonStr.trim();

    // Remove markdown fences if present (as a fallback, though responseMimeType: "application/json" should prevent this)
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    } else if (jsonStr.startsWith("```") && jsonStr.endsWith("```")) {
      // Handle cases where regex might not match but simple prefix/suffix removal works
      jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
    }
    
    // Attempt to trim to the first '{' and last '}'
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    } else {
        console.warn("Could not find valid outer braces {} in the response string after fence removal. String (first 200 chars):", jsonStr.substring(0, 200));
        // The parse attempt later will likely fail, which is handled.
    }

    const stringAfterInitialCleanup = jsonStr; // For logging

    // Clean up common comma issues (these are generally safer transformations)
    jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1'); // Trailing comma before } or ]
    jsonStr = jsonStr.replace(/([\{\[])\s*,/g, '$1'); // Leading comma after { or [
    
    // Iteratively remove multiple commas
    let lastLength = -1;
    while(jsonStr.length !== lastLength) {
      lastLength = jsonStr.length;
      jsonStr = jsonStr.replace(/,\s*,/g, ','); 
    }
    // These might be redundant if the above loop catches all, but kept for safety
    jsonStr = jsonStr.replace(/\[\s*,/g, '['); // Comma after [
    jsonStr = jsonStr.replace(/,\s*\]/g, ']'); // Comma before ]
    jsonStr = jsonStr.replace(/\{\s*,/g, '{'); // Comma after {  
    jsonStr = jsonStr.replace(/,\s*\}/g, '}'); // Comma before }
    
    jsonStr = jsonStr.trim();
    const stringAfterCommaCleanup = jsonStr; // For logging

    let parsedResponse: any;
    try {
      if (jsonStr === "") { 
        console.warn("JSON string became empty after all sanitization. Assuming no valid data.");
        // Return a default structure as per prompt instructions for "no information"
        parsedResponse = { "Full Name": null, "Email": null, "Phone Number": null, "Work Experience": [] };
      } else {
        parsedResponse = JSON.parse(jsonStr);
      }
    } catch (parseError) {
      console.error(
        "Failed to parse JSON response from Gemini.\n" +
        "String after initial cleanup (fences/braces):\n" + `"${stringAfterInitialCleanup}"\n` +
        "String attempted for parsing (after comma cleanup):\n" + `"${stringAfterCommaCleanup}"\n` +
        "Parse error:", parseError, "\n" +
        "Full API Response (if available):", JSON.stringify(rawApiResponse, null, 2)
      );
      throw new Error("Received an invalid JSON response from the AI. The AI's output could not be parsed. Check console for details including the problematic string and full API response.");
    }

    if (typeof parsedResponse !== 'object' || parsedResponse === null) {
        console.error("Parsed response is not a valid object. Parsed data:", parsedResponse, "Full API Response:", JSON.stringify(rawApiResponse, null, 2));
        throw new Error("AI response was parsed, but it is not a valid JSON object.");
    }

    // Map to expected structure, defaulting missing fields as per prompt
    const workExperienceRaw = parsedResponse["Work Experience"];
    const mappedWorkExperience: ExperienceEntry[] = [];

    if (Array.isArray(workExperienceRaw)) {
      workExperienceRaw.forEach((exp: any, index: number) => { // Added index for logging
        if (typeof exp === 'object' && exp !== null) {
          mappedWorkExperience.push({
            company_name: exp["Company Name"] || "N/A",
            customer_name: exp["Customer Name"] || "N/A",
            role: exp["Role"] || "N/A",
            duration: exp["Duration"] || "N/A",
            skills_technologies: Array.isArray(exp["Skills/Technologies"]) 
                                 ? exp["Skills/Technologies"].map(String).filter(s => s && typeof s === 'string' && s.trim() !== "") 
                                 : [],
            industry_domain: exp["Industry/Domain"] || "N/A",
            location: exp["Location"] || "N/A",
          });
        } else {
            console.warn(`Work experience entry at index ${index} is not a valid object:`, exp);
        }
      });
    } else if (workExperienceRaw !== undefined) {
        console.warn("'Work Experience' field was present but not an array:", workExperienceRaw);
    }


    return {
      full_name: parsedResponse["Full Name"] === undefined ? null : parsedResponse["Full Name"],
      email: parsedResponse["Email"] === undefined ? null : parsedResponse["Email"],
      phone_number: parsedResponse["Phone Number"] === undefined ? null : parsedResponse["Phone Number"],
      work_experience: mappedWorkExperience,
      ats_score: typeof parsedResponse["ATS Score"] === "number" ? parsedResponse["ATS Score"] : 0,
    };

  } catch (error) {
    // Avoid re-logging if the error message already indicates it contains full details
    const isAlreadyDetailedError = error instanceof Error && 
                                (error.message.includes("Full API Response:") || 
                                 error.message.includes("AI's output could not be parsed"));
    
    if (!isAlreadyDetailedError && rawApiResponse) {
        console.error("Error in extractSingleResumeData. Full API Response (if available at error time):", JSON.stringify(rawApiResponse, null, 2));
    } else if (!isAlreadyDetailedError) {
        console.error("Error in extractSingleResumeData. No raw API response available at time of error logging.");
    }
    // console.error("Error details:", error); // This might be redundant if the above logs cover it.

    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) { // This check should be earlier, at initialization
        throw new Error(`API Key error: ${error.message}. Please check your API_KEY configuration.`);
      }
      // Re-throw specific, informative errors
      const specificMessages = [
        "AI processing failed:", 
        "AI response was empty", 
        "AI response text is not", 
        "Received an invalid JSON", 
        "AI response was parsed, but"
      ];
      if (specificMessages.some(msg => error.message.startsWith(msg))) {
        throw error; 
      }
      // Generic fallback
      throw new Error(`Failed to extract data: ${error.message}`);
    }
    // Fallback for non-Error objects
    throw new Error("Failed to extract data due to an unknown error with the AI service.");
  }
};

export const checkAtsMatch = async (resumeText: string, jobDescription: string): Promise<number> => {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. This might be due to a missing API key or an initialization error.");
  }
  if (!resumeText.trim() || !jobDescription.trim()) {
    throw new Error("Both resume text and job description are required for ATS check.");
  }
  const prompt = `You are an ATS scoring system. Given the following resume and job description, output ONLY a single number (0-100) representing how well the resume matches the job description for recruiter search and ranking. Consider keyword match, skills, experience, and formatting. Do not output any explanation or text, just the score.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "text/plain",
      temperature: 0.1,
      topP: 0.9,
      topK: 30,
    },
  });
  let scoreStr = response.text?.trim() || "0";
  // Extract number from response
  const match = scoreStr.match(/\d+/);
  return match ? Math.min(100, Math.max(0, parseInt(match[0], 10))) : 0;
};

export interface AtsMatchResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
}

export const checkAtsMatchDetailed = async (resumeText: string, jobDescription: string): Promise<AtsMatchResult> => {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized. This might be due to a missing API key or an initialization error.");
  }
  if (!resumeText.trim() || !jobDescription.trim()) {
    throw new Error("Both resume text and job description are required for ATS check.");
  }
  const prompt = `You are an ATS scoring system. Given the following resume and job description, output a valid JSON object with these keys:\n- score: number (0-100)\n- matchedKeywords: array of strings (keywords from job description found in resume)\n- missingKeywords: array of strings (important keywords from job description missing in resume)\n- summary: string (one-sentence summary of match quality)\nDo not output any explanation or text before or after the JSON.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: GEMINI_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
      topP: 0.9,
      topK: 30,
    },
  });
  let jsonStr = response.text?.trim() || "";
  // Remove markdown fences if present
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }
  // Trim to first '{' and last '}'
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  try {
    const parsed: AtsMatchResult = JSON.parse(jsonStr);
    return parsed;
  } catch {
    return { score: 0, matchedKeywords: [], missingKeywords: [], summary: "Could not parse ATS match details." };
  }
};
