// services/fileParserService.ts

declare var mammoth: any;
declare var pdfjsLib: any;
declare var JSZip: any; // Declare JSZip

// Helper: Convert File to ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parsePdfFromArrayBuffer = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) {
    console.error("pdf.js library (pdfjsLib) is not loaded correctly. WorkerSrc:", pdfjsLib?.GlobalWorkerOptions?.workerSrc);
    throw new Error('pdf.js library is not loaded.');
  }
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textData = await page.getTextContent();
    textContent += textData.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return textContent.trim();
};

export const parseDocxFromArrayBuffer = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  if (typeof mammoth === 'undefined' || !mammoth.extractRawText) {
    throw new Error('mammoth.js library is not loaded.');
  }
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOCX with mammoth.js:", error);
    throw new Error("Failed to parse DOCX file content. It might be corrupted or in an unsupported format.");
  }
};


export interface ZipFileEntry {
  fileName: string;
  content: ArrayBuffer;
  type: string; // 'application/pdf' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export const parseZip = async (file: File): Promise<ZipFileEntry[]> => {
  if (typeof JSZip === 'undefined') {
    console.error("JSZip library is not loaded. Ensure it is included in index.html.");
    throw new Error('JSZip library is not loaded.');
  }
  const zip = await JSZip.loadAsync(file);
  const filesData: ZipFileEntry[] = [];
  const promises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      const lowerCaseName = zipEntry.name.toLowerCase();
      let fileType = '';
      if (lowerCaseName.endsWith('.pdf')) {
        fileType = 'application/pdf';
      } else if (lowerCaseName.endsWith('.docx')) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      if (fileType) {
        promises.push(
          zipEntry.async('arraybuffer').then(content => {
            filesData.push({ fileName: zipEntry.name, content, type: fileType });
          }).catch(err => {
            console.warn(`Could not extract ${zipEntry.name} from ZIP: ${err.message}`);
            // Optionally, push an error marker or skip
          })
        );
      } else {
         console.log(`Skipping unsupported file in ZIP: ${zipEntry.name}`);
      }
    }
  });
  await Promise.all(promises);
  return filesData;
};

export const parseFileText = async (file: File): Promise<string> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  if (file.type === 'application/pdf') {
    return parsePdfFromArrayBuffer(arrayBuffer);
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocxFromArrayBuffer(arrayBuffer);
  } else {
    // This case should ideally be caught earlier by checking ACCEPTED_FILE_TYPES
    throw new Error('Unsupported file type for direct parsing.');
  }
};

export const parseFileContent = async (arrayBuffer: ArrayBuffer, fileType: string): Promise<string> => {
  if (fileType === 'application/pdf') {
    return parsePdfFromArrayBuffer(arrayBuffer);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDocxFromArrayBuffer(arrayBuffer);
  } else {
    throw new Error('Unsupported file type for content parsing.');
  }
};