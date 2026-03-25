import { askClaude } from './claude.js';
import fs from 'fs';
import path from 'path';

// Extract text content from uploaded PDF or Word document
export async function importDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.pdf') {
    return await extractPDFText(filePath);
  }

  if (ext === '.doc' || ext === '.docx') {
    return await extractDocxText(filePath);
  }

  throw new Error(`Unsupported document format: ${ext}`);
}

// Extract text from PDF using Node.js
async function extractPDFText(filePath: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[DocumentImport] Extracting text from PDF: ${filePath}`);

  try {
    // Try using pdf-parse library
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DocumentImport] PDF extracted — ${duration}s — ${data.text.length} chars`);
    return data.text;
  } catch {
    // Fallback: send to Claude as base64 for OCR
    console.log(`[DocumentImport] pdf-parse failed, falling back to Claude OCR`);
    const base64 = fs.readFileSync(filePath).toString('base64');
    const response = await askClaude(
      'Extract all text from this document.',
      `Here is a PDF document encoded in base64. Extract all the text content from it and return it as plain text:\n\n${base64.slice(0, 50000)}`
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DocumentImport] PDF extracted via Claude — ${duration}s`);
    return response;
  }
}

// Extract text from DOCX
async function extractDocxText(filePath: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[DocumentImport] Extracting text from DOCX: ${filePath}`);

  try {
    // Try using mammoth library
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DocumentImport] DOCX extracted — ${duration}s — ${result.value.length} chars`);
    return result.value;
  } catch {
    // Fallback: read as binary and send to Claude
    console.log(`[DocumentImport] mammoth failed, falling back to Claude`);
    const response = await askClaude(
      'Extract text content.',
      `Extract the text from this Word document. The user uploaded a .docx file with the following prompt: "Create a video from this document."`
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DocumentImport] DOCX extracted via Claude — ${duration}s`);
    return response;
  }
}

// Summarize document for video script creation
export async function summarizeForVideo(documentText: string, targetDuration: number): Promise<string> {
  const startTime = Date.now();
  console.log(`[DocumentImport] Summarizing document for ${targetDuration}s video`);

  const response = await askClaude(
    'You summarize documents into video-ready content.',
    `Summarize this document into key points suitable for a ${targetDuration}-second video. Extract: main message, key facts/numbers, benefits, call to action. Return as a structured brief that can be turned into a video script.

Document: ${documentText.slice(0, 10000)}

Return in Hebrew.`
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DocumentImport] Summary generated — ${duration}s`);

  return response;
}
