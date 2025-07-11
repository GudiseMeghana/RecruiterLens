// constants.ts
export const ACCEPTED_FILE_TYPES: { [key: string]: string } = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip', // Common MIME type for ZIP
};

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';