import { GoogleGenerativeAI } from '@google/generative-ai';

// Keys for localStorage
const STORAGE_KEY_API_KEY = 'fluxshare_gemini_api_key';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string = '';
  private isCustomKey: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Try to get key from multiple sources
    // @ts-ignore
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY);

    if (storedKey) {
      this.apiKey = storedKey;
      this.isCustomKey = true;
    } else if (envKey) {
      this.apiKey = envKey;
      this.isCustomKey = false;
    }

    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } catch (error) {
        console.error("Failed to initialize GoogleGenerativeAI", error);
      }
    }
  }

  // Set a custom API key (e.g., provided by user)
  setCustomApiKey(key: string) {
    this.apiKey = key;
    this.isCustomKey = true;
    localStorage.setItem(STORAGE_KEY_API_KEY, key);
    this.genAI = new GoogleGenerativeAI(key);
  }

  // Remove custom key and revert to env var if available
  clearCustomApiKey() {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) {
      this.apiKey = envKey;
      this.isCustomKey = false;
      this.genAI = new GoogleGenerativeAI(envKey);
    } else {
      this.apiKey = '';
      this.genAI = null;
    }
  }

  hasKey(): boolean {
    return !!this.apiKey;
  }

  // Generic error handler that checks for rate limits
  private async handleApiCall<T>(call: () => Promise<T>): Promise<T> {
    if (!this.genAI) {
      throw new Error('API_KEY_MISSING');
    }

    try {
      return await call();
    } catch (error: any) {
      console.error('Gemini API Error:', error);

      // Check for 429 or quota exceeded
      const errorMessage = error.toString().toLowerCase();
      if (errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('limit')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }

      throw error;
    }
  }

  // --- FEATURE IMPLEMENTATIONS ---

  // 1. AI Chat Assistant
  async chat(message: string, history: any[] = []) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Convert minimal history to Gemini format if needed, 
      // but for simple one-off chat or managed history we can usually just send context + message
      // Or use startChat for persistent sessions.
      // For this implementation, we'll maintain a simple stateless context for robustness.

      const systemPrompt = `You are FluxShare AI, an advanced cyberpunk-themed assistant for a P2P file transfer platform. 
             Style: Professional, tech-savvy, concise, helpful.
             Context: FluxShare allows secure localized P2P file sharing, video calls, screen sharing, and whiteboard collaboration without servers.
             
             User: ${message}`;

      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    });
  }

  // 2. Smart File Analysis
  async analyzeFile(file: File) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: file.name.split('.').pop()
      };

      const prompt = `Analyze this file metadata and provide a brief, professional description and 3 relevant tags.
            File: ${JSON.stringify(fileInfo)}
            
            Respond in JSON format: { "description": "string", "tags": ["tag1", "tag2", "tag3"], "category": "document/image/video/audio/archive/other" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      try {
        // Sanitize code blocks if present
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        console.warn('Failed to parse Gemini JSON', e);
        return { description: 'Analysis failed to parse.', tags: [], category: 'unknown' };
      }
    });
  }

  // 3. Image Recognition (Vision)
  async analyzeImage(base64Image: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Remove header if present (data:image/png;base64,)
      const data = base64Image.split(',')[1] || base64Image;

      const prompt = `Analyze this image. Provide:
            1. A short caption (max 1 sentence)
            2. Detected objects/content
            3. 3-5 keywords
            
            Output JSON: { "caption": "string", "content": ["obj1", "obj2"], "keywords": ["k1", "k2"] }`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data, mimeType: 'image/png' } } // Assuming PNG/JPEG, API is flexible usually
      ]);

      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { caption: 'Could not analyze image.', content: [], keywords: [] };
      }
    });
  }

  // 4. Voice Transcription
  async transcribeAudio(base64Audio: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Remove header
      const data = base64Audio.split(',')[1] || base64Audio;

      const prompt = `Transcribe this audio message accurately.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data, mimeType: 'audio/webm' } } // Assuming webm from browser recorder
      ]);

      return result.response.text();
    });
  }

  // 5. Smart Quick Replies
  async generateQuickReplies(context: string): Promise<string[]> {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Given this chat context: "${context}", generate 3 short, relevant, professional quick reply options. Return ONLY a JSON array of strings. Example: ["Yes, sure.", "Can you explain?", "Thanks!"]`;

      const result = await model.generateContent(prompt);
      try {
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return Array.isArray(parsed) ? parsed : ["Acknowledged.", "Thanks.", "Details?"];
      } catch (e) {
        return ["Received.", "Thanks.", "Ok."];
      }
    });
  }

  // 6. Translate Text
  async translateText(text: string, targetLang: string = 'English'): Promise<string> {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Translate this text to ${targetLang}: "${text}". Return only the translated text.`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }

  // 7. Summarize Chat
  async summarizeChat(history: string): Promise<string> {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Summarize this chat conversation in 3 bullet points:\n\n${history}`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }

  // 8. Smart Security Scanning
  async securityScan(file: File) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        extension: file.name.split('.').pop()
      };

      // For text files, analyze content
      let content = '';
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        try {
          content = await file.text();
        } catch (e) {
          // Skip content if can't read
        }
      }

      const prompt = `Security analysis for file transfer:
            File: ${JSON.stringify(fileData)}
            ${content ? `Content Preview: ${content.slice(0, 1000)}` : ''}
            
            Analyze for:
            1. Risk level (low/medium/high)
            2. Potential security concerns
            3. Privacy recommendations
            
            Output JSON: { "riskLevel": "low|medium|high", "concerns": ["string"], "recommendations": ["string"], "safe": boolean }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { riskLevel: 'low', concerns: [], recommendations: [], safe: true };
      }
    });
  }

  // 9. Document Summarization
  async summarizeDocument(textContent: string, fileName?: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Limit to 30000 chars for context window
      const content = textContent.slice(0, 30000);

      const prompt = `Summarize this document${fileName ? ` (${fileName})` : ''}:
            
            ${content}
            
            Provide:
            1. Brief summary (2-3 sentences)
            2. Key points (3-5 bullet points)
            3. Main topics
            4. Document type/category
            
            Output JSON: { "summary": "string", "keyPoints": ["string"], "topics": ["string"], "documentType": "string" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { summary: 'Unable to summarize.', keyPoints: [], topics: [], documentType: 'unknown' };
      }
    });
  }

  // 10. Whiteboard Content Recognition (OCR)
  async analyzeWhiteboard(canvasDataUrl: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const data = canvasDataUrl.split(',')[1] || canvasDataUrl;

      const prompt = `Analyze this whiteboard/canvas content:
            1. Extract any text (OCR)
            2. Describe diagrams, drawings, shapes
            3. Identify annotations and key elements
            4. Provide a summary of the content
            
            Output JSON: { "extractedText": "string", "diagrams": ["string"], "shapes": ["string"], "summary": "string" }`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data, mimeType: 'image/png' } }
      ]);

      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { extractedText: '', diagrams: [], shapes: [], summary: 'Unable to analyze whiteboard.' };
      }
    });
  }

  // 11. Meeting/Video Call Summarization
  async summarizeMeeting(transcript: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Summarize this meeting/call transcript:
            
            ${transcript.slice(0, 30000)}
            
            Provide:
            1. Key discussion points
            2. Decisions made
            3. Action items
            4. Next steps
            
            Output JSON: { "discussionPoints": ["string"], "decisions": ["string"], "actionItems": ["string"], "nextSteps": ["string"] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { discussionPoints: [], decisions: [], actionItems: [], nextSteps: [] };
      }
    });
  }

  // 12. Smart File Search (Semantic)
  async smartSearch(query: string, files: any[]) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const fileList = files.map((f, idx) => ({
        index: idx,
        name: f.name,
        description: f.description || f.aiDescription || '',
        tags: f.tags || f.aiTags || []
      }));

      const prompt = `User is searching for: "${query}"
            
            Available files:
            ${JSON.stringify(fileList)}
            
            Return the indices of the most relevant files based on semantic meaning.
            Consider file names, descriptions, and tags.
            
            Output JSON array of indices: [0, 2, 5] (most relevant first)`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const indices = JSON.parse(cleanJson);
        return Array.isArray(indices) ? indices.map((i: number) => files[i]).filter(Boolean) : [];
      } catch (e) {
        return [];
      }
    });
  }

  // 13. Message Improvement
  async improveMessage(text: string, tone: 'professional' | 'casual' | 'concise' = 'professional') {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Improve this message for clarity and ${tone} tone:
            "${text}"
            
            Return ONLY the improved message text, nothing else.`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    });
  }

  // 14. File Naming Suggestions
  async suggestFilename(file: File) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Suggest a better, more descriptive filename for:
            Current name: ${file.name}
            Type: ${file.type}
            Size: ${file.size} bytes
            
            Make it professional, descriptive, and follow naming conventions.
            Return ONLY the suggested filename with extension.`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    });
  }

  // 15. Compression Recommendations
  async suggestCompression(file: File) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      const prompt = `File transfer compression analysis:
            File: ${file.name}
            Type: ${file.type}
            Size: ${fileSizeMB} MB
            
            Should this file be compressed before transfer?
            Recommend best compression method if applicable.
            
            Output JSON: { "shouldCompress": boolean, "reason": "string", "method": "zip|gzip|none", "estimatedSavings": "string" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { shouldCompress: false, reason: 'Unable to analyze', method: 'none', estimatedSavings: '0%' };
      }
    });
  }

  // 16. Error Diagnosis
  async diagnoseError(errorMessage: string, context?: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `User encountered this error in P2P file transfer:
            Error: "${errorMessage}"
            ${context ? `Context: ${context}` : ''}
            
            Provide:
            1. What it means (simple terms)
            2. Likely cause
            3. How to fix it (step-by-step)
            
            Output JSON: { "explanation": "string", "cause": "string", "solution": ["step1", "step2"] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { explanation: 'An error occurred', cause: 'Unknown', solution: ['Please try again'] };
      }
    });
  }

  // 17. Connection Quality Analysis
  async analyzeConnection(stats: any) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Analyze this WebRTC connection quality:
            ${JSON.stringify(stats, null, 2)}
            
            Provide:
            1. Overall quality rating (excellent/good/fair/poor)
            2. Specific issues detected
            3. Recommendations for improvement
            
            Output JSON: { "quality": "excellent|good|fair|poor", "issues": ["string"], "recommendations": ["string"] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { quality: 'unknown', issues: [], recommendations: [] };
      }
    });
  }

  // 18. Content Moderation
  async moderateContent(message: string) {
    return this.handleApiCall(async () => {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Analyze this broadcast/chat message for:
            1. Inappropriate content
            2. Spam detection
            3. Safety concerns
            4. Profanity or offensive language
            
            Message: "${message}"
            
            Output JSON: { "safe": boolean, "issues": ["string"], "severity": "none|low|medium|high", "recommendation": "string" }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        return { safe: true, issues: [], severity: 'none', recommendation: 'Unable to analyze' };
      }
    });
  }
}

export const geminiService = new GeminiService();
