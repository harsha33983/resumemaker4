interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeminiErrorResponse {
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const errorData: GeminiErrorResponse = await response.json();
      if (errorData.error?.message) {
        return errorData.error.message;
      }
    } catch (e) {
      // If we can't parse the error response, fall back to status text
    }
    return response.statusText || 'Unknown error';
  }

  async generateCoverLetter(resumeData: any, jobDescription: string, companyName: string, position: string): Promise<string> {
    const prompt = `
      Generate a professional cover letter based on the following information:
      
      Resume Data:
      - Name: ${resumeData.header?.name || 'Candidate'}
      - Current Title: ${resumeData.header?.title || ''}
      - Summary: ${resumeData.summary?.text || ''}
      - Experience: ${JSON.stringify(resumeData.experience?.items || [])}
      - Skills: ${JSON.stringify(resumeData.skills?.items || [])}
      
      Job Information:
      - Company: ${companyName}
      - Position: ${position}
      - Job Description: ${jobDescription}
      
      Please write a compelling, personalized cover letter that:
      1. Addresses the hiring manager professionally
      2. Shows enthusiasm for the specific role and company
      3. Highlights relevant experience and skills from the resume
      4. Demonstrates knowledge of the company/role from the job description
      5. Includes a strong closing with call to action
      6. Maintains professional tone throughout
      7. Is approximately 3-4 paragraphs long
      
      Format the response as a complete cover letter ready to send.
    `;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorMessage = await this.getErrorMessage(response);
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error generating cover letter:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate cover letter. Please try again.');
    }
  }

  async generateResumeContent(section: string, context: string): Promise<string> {
    const prompt = `
      ${section === 'analysis' ? context : `
        Generate professional resume content for the ${section} section.
        Context: ${context}
        
        Please provide content that is:
        1. Professional and impactful
        2. ATS-friendly with relevant keywords
        3. Quantified with metrics where possible
        4. Action-oriented using strong verbs
        5. Tailored to the provided context
        
        Return only the generated content without additional formatting or explanations.
      `}
    `;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorMessage = await this.getErrorMessage(response);
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error generating content:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate content. Please try again.');
    }
  }

  async analyzeResume(resumeText: string, jobDescription?: string): Promise<any> {
    const prompt = `
      You are an expert resume analyzer and career coach with deep knowledge of ATS systems, hiring practices, and industry standards. Analyze this resume comprehensively and provide detailed, actionable feedback in a structured format.
      
      Resume Content:
      ${resumeText}
      
      ${jobDescription ? `
      Job Description for Matching Analysis:
      ${jobDescription}
      
      Please also analyze how well this resume matches the job description and provide specific recommendations for improvement.
      ` : ''}
      
      Please provide a comprehensive analysis with the following EXACT structure and headings:

      ## SCORING ANALYSIS
      Overall Resume Quality Score: [0-100]
      ATS Compatibility Score: [0-100]
      Readability Score: [0-100]
      Keyword Optimization Score: [0-100]
      ${jobDescription ? 'Job Match Score: [0-100]' : ''}

      ## CRITICAL IMPROVEMENTS NEEDED:
      - [List 3-5 critical issues that must be fixed immediately]
      - [Focus on ATS compatibility, major formatting issues, missing essential information]
      - [Each point should be specific and actionable]

      ## RECOMMENDED IMPROVEMENTS:
      - [List 4-6 recommended enhancements for better impact]
      - [Focus on content optimization, keyword enhancement, achievement quantification]
      - [Each point should provide clear guidance for improvement]

      ## EXCELLENT ASPECTS:
      - [List 3-5 things the resume does well]
      - [Highlight strengths to maintain and build upon]
      - [Acknowledge good practices and effective elements]

      ## KEYWORD ANALYSIS:
      Found Keywords: [List 8-12 relevant keywords currently present in the resume]
      Missing Keywords: [List 6-10 important industry keywords that are missing]
      Suggested Keywords: [List 8-12 specific keywords to add for better ATS performance]

      ${jobDescription ? `
      ## JOB MATCHING ANALYSIS:
      Match Percentage: [0-100]%
      Missing Skills: [List skills from job description not found in resume]
      Aligned Experience: [List experience that matches job requirements well]
      Recommended Keywords: [List job-specific keywords to incorporate]
      ` : ''}

      ## SECTION-BY-SECTION ANALYSIS:
      ### Contact Information: [Score: 0-100]
      [Specific feedback and suggestions]

      ### Professional Summary: [Score: 0-100]
      [Specific feedback and suggestions]

      ### Work Experience: [Score: 0-100]
      [Specific feedback and suggestions]

      ### Skills Section: [Score: 0-100]
      [Specific feedback and suggestions]

      ### Education: [Score: 0-100]
      [Specific feedback and suggestions]

      ## ATS OPTIMIZATION RECOMMENDATIONS:
      - [Specific formatting improvements for better ATS parsing]
      - [Keyword density and placement suggestions]
      - [Section organization recommendations]
      - [File format and structure advice]

      ## CONTENT EXTRACTION:
      Personal Information:
      - Name: [Extract name]
      - Email: [Extract email]
      - Phone: [Extract phone]
      - Location: [Extract location]
      - LinkedIn: [Extract if present]
      - Website: [Extract if present]

      Professional Summary: [Extract or note if missing]

      Work Experience: [List companies, positions, and key achievements]

      Education: [List degrees and institutions]

      Skills: [Categorize technical and soft skills]

      Certifications: [List if present]

      Projects: [List if present]

      Please ensure your response follows this EXACT structure with clear headings and bullet points. Be specific, actionable, and encouraging while being honest about areas needing improvement. Focus on both immediate fixes and long-term enhancements.
    `;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        })
      });

      if (!response.ok) {
        const errorMessage = await this.getErrorMessage(response);
        throw new Error(`AI Analysis Error: ${errorMessage}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No analysis response from AI');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error analyzing resume with AI:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to analyze resume with AI. Please check your connection and try again.');
    }
  }
}