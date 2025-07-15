import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, FileText, Download, Save, Loader2, Target, Zap, CheckCircle, AlertCircle, User, Briefcase, GraduationCap, Award, Plus, Trash2, Edit3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../lib/gemini';
import { PDFGenerator } from '../lib/pdfGenerator';

type View = 'home' | 'dashboard' | 'builder' | 'analyzer' | 'templates' | 'pricing' | 'settings' | 'nlp-generator';

interface NLPResumeGeneratorProps {
  onNavigate: (view: View) => void;
}

interface JobAnalysis {
  requiredSkills: string[];
  preferredSkills: string[];
  keyResponsibilities: string[];
  qualifications: string[];
  industryKeywords: string[];
  experienceLevel: string;
  companyType: string;
}

interface GeneratedResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    title: string;
  };
  professionalSummary: string;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    honors?: string;
  }>;
  skills: Array<{
    id: string;
    category: string;
    items: string[];
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    link?: string;
    duration: string;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }>;
  achievements: string[];
}

const NLPResumeGenerator: React.FC<NLPResumeGeneratorProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState<'input' | 'analysis' | 'generation' | 'preview'>('input');
  
  // Input form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior' | 'executive'>('mid');
  const [userBackground, setUserBackground] = useState('');
  const [existingResumeId, setExistingResumeId] = useState<string>('');
  
  // Analysis and generation state
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [generatedResume, setGeneratedResume] = useState<GeneratedResume | null>(null);
  const [existingResumes, setExistingResumes] = useState<any[]>([]);
  
  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const geminiService = new GeminiService();

  useEffect(() => {
    if (user) {
      fetchExistingResumes();
    }
  }, [user]);

  const fetchExistingResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, personal_info, summary, experience, education, skills, projects')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setExistingResumes(data || []);
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  // NLP Analysis Functions
  const extractKeywords = (text: string): string[] => {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  };

  const extractSkills = (text: string): { required: string[], preferred: string[] } => {
    const skillPatterns = [
      // Technical skills
      /\b(javascript|python|java|react|node\.?js|angular|vue|typescript|html|css|sql|mongodb|postgresql|aws|docker|kubernetes|git|linux|windows|macos)\b/gi,
      // Soft skills
      /\b(leadership|communication|teamwork|problem[\s-]solving|analytical|creative|organizational|time[\s-]management|project[\s-]management|agile|scrum)\b/gi,
      // Tools and frameworks
      /\b(photoshop|illustrator|figma|sketch|jira|confluence|slack|microsoft[\s-]office|excel|powerpoint|word|salesforce|hubspot)\b/gi
    ];

    const requiredSection = text.match(/(?:required|must[\s-]have|essential)[\s\S]*?(?:preferred|nice[\s-]to[\s-]have|desired|optional|plus|bonus)/i);
    const preferredSection = text.match(/(?:preferred|nice[\s-]to[\s-]have|desired|optional|plus|bonus)[\s\S]*$/i);

    const extractFromSection = (section: string | null): string[] => {
      if (!section) return [];
      const skills: string[] = [];
      skillPatterns.forEach(pattern => {
        const matches = section.match(pattern);
        if (matches) {
          skills.push(...matches.map(match => match.toLowerCase()));
        }
      });
      return [...new Set(skills)];
    };

    const required = extractFromSection(requiredSection?.[0] || text);
    const preferred = extractFromSection(preferredSection?.[0] || '');

    return { required, preferred };
  };

  const extractResponsibilities = (text: string): string[] => {
    const responsibilityPatterns = [
      /(?:responsibilities|duties|role|you will|candidate will)[\s\S]*?(?:\n\n|\r\n\r\n|requirements|qualifications|skills)/i
    ];

    let responsibilities: string[] = [];
    
    responsibilityPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        const section = match[0];
        const bullets = section.match(/[•\-\*]\s*([^\n\r]+)/g);
        if (bullets) {
          responsibilities.push(...bullets.map(bullet => bullet.replace(/[•\-\*]\s*/, '').trim()));
        }
      }
    });

    if (responsibilities.length === 0) {
      // Fallback: extract sentences that contain action verbs
      const actionVerbs = ['develop', 'create', 'manage', 'lead', 'implement', 'design', 'analyze', 'coordinate', 'collaborate', 'maintain', 'optimize', 'support'];
      const sentences = text.split(/[.!?]+/);
      
      responsibilities = sentences
        .filter(sentence => actionVerbs.some(verb => sentence.toLowerCase().includes(verb)))
        .slice(0, 5)
        .map(sentence => sentence.trim());
    }

    return responsibilities.slice(0, 8);
  };

  const determineExperienceLevel = (text: string): string => {
    const entryKeywords = ['entry', 'junior', 'graduate', 'new grad', '0-2 years', 'recent graduate'];
    const midKeywords = ['mid', 'intermediate', '2-5 years', '3-7 years'];
    const seniorKeywords = ['senior', 'lead', '5+ years', '7+ years', 'experienced'];
    const executiveKeywords = ['director', 'manager', 'vp', 'executive', '10+ years'];

    const lowerText = text.toLowerCase();
    
    if (executiveKeywords.some(keyword => lowerText.includes(keyword))) return 'Executive';
    if (seniorKeywords.some(keyword => lowerText.includes(keyword))) return 'Senior';
    if (midKeywords.some(keyword => lowerText.includes(keyword))) return 'Mid-level';
    if (entryKeywords.some(keyword => lowerText.includes(keyword))) return 'Entry-level';
    
    return 'Mid-level';
  };

  const analyzeJobDescription = async () => {
    if (!jobDescription.trim() || !jobTitle.trim()) {
      setError('Please provide both job title and job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Extract skills using NLP
      const { required, preferred } = extractSkills(jobDescription);
      
      // Extract responsibilities
      const responsibilities = extractResponsibilities(jobDescription);
      
      // Extract keywords
      const keywords = extractKeywords(jobDescription);
      
      // Determine experience level from job description
      const detectedExperienceLevel = determineExperienceLevel(jobDescription);
      
      // Extract qualifications
      const qualificationSection = jobDescription.match(/(?:qualifications|requirements|education)[\s\S]*?(?:\n\n|\r\n\r\n|responsibilities|duties|benefits)/i);
      const qualifications = qualificationSection 
        ? qualificationSection[0].split(/[•\-\*]/).slice(1, 6).map(q => q.trim())
        : [];

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      const analysis: JobAnalysis = {
        requiredSkills: required,
        preferredSkills: preferred,
        keyResponsibilities: responsibilities,
        qualifications,
        industryKeywords: keywords,
        experienceLevel: detectedExperienceLevel,
        companyType: companyIndustry || 'Technology'
      };

      setJobAnalysis(analysis);
      setActiveStep('analysis');
    } catch (error: any) {
      setError(error.message || 'Failed to analyze job description');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateResumeWithAI = async () => {
    if (!jobAnalysis) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Get existing resume data if selected
      let existingData = null;
      if (existingResumeId) {
        const existingResume = existingResumes.find(r => r.id === existingResumeId);
        if (existingResume) {
          existingData = existingResume;
        }
      }

      // Create comprehensive prompt for AI generation
      const prompt = `
        Generate a complete professional resume based on the following job analysis and user information:

        JOB INFORMATION:
        - Position: ${jobTitle}
        - Company: ${companyName}
        - Industry: ${companyIndustry}
        - Experience Level: ${experienceLevel}

        JOB ANALYSIS:
        - Required Skills: ${jobAnalysis.requiredSkills.join(', ')}
        - Preferred Skills: ${jobAnalysis.preferredSkills.join(', ')}
        - Key Responsibilities: ${jobAnalysis.keyResponsibilities.join('; ')}
        - Qualifications: ${jobAnalysis.qualifications.join('; ')}
        - Industry Keywords: ${jobAnalysis.industryKeywords.join(', ')}

        USER BACKGROUND:
        ${userBackground}

        ${existingData ? `EXISTING RESUME DATA TO ENHANCE:
        - Current Summary: ${existingData.summary || ''}
        - Current Experience: ${JSON.stringify(existingData.experience?.items || [])}
        - Current Skills: ${JSON.stringify(existingData.skills?.items || [])}
        ` : ''}

        Please generate a complete resume in JSON format with the following structure:
        {
          "personalInfo": {
            "name": "Professional Name",
            "email": "email@example.com",
            "phone": "+1-XXX-XXX-XXXX",
            "location": "City, State",
            "linkedin": "linkedin.com/in/username",
            "website": "portfolio-website.com",
            "title": "Professional Title matching the job"
          },
          "professionalSummary": "3-4 sentence compelling summary tailored to the job",
          "experience": [
            {
              "company": "Company Name",
              "position": "Job Title",
              "startDate": "MM/YYYY",
              "endDate": "MM/YYYY or Present",
              "location": "City, State",
              "description": "Brief role description",
              "achievements": ["Quantified achievement 1", "Quantified achievement 2"]
            }
          ],
          "education": [
            {
              "institution": "University Name",
              "degree": "Degree Type",
              "field": "Field of Study",
              "startDate": "MM/YYYY",
              "endDate": "MM/YYYY",
              "gpa": "3.X/4.0",
              "honors": "Cum Laude, Dean's List, etc."
            }
          ],
          "skills": [
            {
              "category": "Technical Skills",
              "items": ["skill1", "skill2"],
              "proficiency": "Advanced"
            }
          ],
          "projects": [
            {
              "name": "Project Name",
              "description": "Project description with impact",
              "technologies": ["tech1", "tech2"],
              "link": "github.com/project",
              "duration": "MM/YYYY - MM/YYYY"
            }
          ],
          "certifications": [
            {
              "name": "Certification Name",
              "issuer": "Issuing Organization",
              "date": "MM/YYYY",
              "expiryDate": "MM/YYYY"
            }
          ],
          "achievements": ["Professional achievement 1", "Professional achievement 2"]
        }

        IMPORTANT REQUIREMENTS:
        1. Tailor all content specifically to the ${jobTitle} position
        2. Include relevant keywords from the job analysis naturally
        3. Quantify achievements with metrics where possible
        4. Match the experience level (${experienceLevel})
        5. Ensure ATS compatibility
        6. Make it compelling and professional
        7. If enhancing existing resume, improve and expand the content
        8. Generate realistic but impressive content that aligns with the user background
        9. Ensure all dates are realistic and consistent
        10. Include industry-specific terminology and skills

        Return ONLY the JSON object, no additional text or formatting.
      `;

      const aiResponse = await geminiService.generateResumeContent('resume', prompt);
      
      // Parse the AI response
      let parsedResume;
      try {
        // Clean the response to extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResume = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      } catch (parseError) {
        // Fallback: create a structured resume from the AI response
        parsedResume = createFallbackResume(aiResponse);
      }

      // Add IDs to all items
      const resumeWithIds: GeneratedResume = {
        ...parsedResume,
        experience: parsedResume.experience?.map((exp: any, index: number) => ({
          ...exp,
          id: `exp-${index + 1}`
        })) || [],
        education: parsedResume.education?.map((edu: any, index: number) => ({
          ...edu,
          id: `edu-${index + 1}`
        })) || [],
        skills: parsedResume.skills?.map((skill: any, index: number) => ({
          ...skill,
          id: `skill-${index + 1}`
        })) || [],
        projects: parsedResume.projects?.map((project: any, index: number) => ({
          ...project,
          id: `project-${index + 1}`
        })) || [],
        certifications: parsedResume.certifications?.map((cert: any, index: number) => ({
          ...cert,
          id: `cert-${index + 1}`
        })) || []
      };

      setGeneratedResume(resumeWithIds);
      setActiveStep('preview');
    } catch (error: any) {
      setError(error.message || 'Failed to generate resume');
    } finally {
      setIsGenerating(false);
    }
  };

  const createFallbackResume = (aiResponse: string): GeneratedResume => {
    // Create a basic resume structure if JSON parsing fails
    return {
      personalInfo: {
        name: 'Your Name',
        email: 'your.email@example.com',
        phone: '+1-XXX-XXX-XXXX',
        location: 'City, State',
        linkedin: 'linkedin.com/in/yourname',
        website: 'yourwebsite.com',
        title: jobTitle
      },
      professionalSummary: aiResponse.substring(0, 300) + '...',
      experience: [{
        id: 'exp-1',
        company: companyName || 'Previous Company',
        position: 'Relevant Position',
        startDate: '01/2020',
        endDate: 'Present',
        location: 'City, State',
        description: 'Relevant experience description',
        achievements: ['Achievement 1', 'Achievement 2']
      }],
      education: [{
        id: 'edu-1',
        institution: 'University Name',
        degree: 'Bachelor of Science',
        field: 'Relevant Field',
        startDate: '09/2016',
        endDate: '05/2020',
        gpa: '3.5/4.0'
      }],
      skills: [{
        id: 'skill-1',
        category: 'Technical Skills',
        items: jobAnalysis?.requiredSkills.slice(0, 8) || [],
        proficiency: 'Advanced' as const
      }],
      projects: [],
      certifications: [],
      achievements: []
    };
  };

  const saveGeneratedResume = async () => {
    if (!generatedResume || !user) {
      setError('Please sign in to save your resume');
      return;
    }

    setIsSaving(true);
    try {
      const resumeData = {
        user_id: user.id,
        title: `${jobTitle} Resume - ${companyName}`,
        personal_info: generatedResume.personalInfo,
        summary: generatedResume.professionalSummary,
        experience: { items: generatedResume.experience },
        education: { items: generatedResume.education },
        skills: { items: generatedResume.skills },
        projects: { items: generatedResume.projects },
        custom_sections: {
          certifications: generatedResume.certifications,
          achievements: generatedResume.achievements
        },
        is_published: true
      };

      const { error } = await supabase
        .from('resumes')
        .insert(resumeData);

      if (error) throw error;

      alert('Resume saved successfully to your dashboard!');
      onNavigate('dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to save resume');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadResume = async () => {
    if (!generatedResume) return;

    try {
      // Create a temporary element to render the resume for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      tempDiv.style.minHeight = '297mm';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      
      // Generate resume HTML content
      const resumeHTML = generateResumeHTML(generatedResume);
      tempDiv.innerHTML = resumeHTML;
      
      document.body.appendChild(tempDiv);
      
      // Generate PDF
      await PDFGenerator.generateResumePDF(tempDiv, `${jobTitle}_Resume_${companyName}.pdf`);
      
      // Clean up
      document.body.removeChild(tempDiv);
    } catch (error) {
      setError('Failed to download resume. Please try again.');
    }
  };

  const generateResumeHTML = (resume: GeneratedResume): string => {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <header style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${resume.personalInfo.name}</h1>
          <h2 style="margin: 5px 0; font-size: 18px; color: #666;">${resume.personalInfo.title}</h2>
          <div style="margin-top: 10px; font-size: 14px;">
            <span>${resume.personalInfo.email}</span> | 
            <span>${resume.personalInfo.phone}</span> | 
            <span>${resume.personalInfo.location}</span>
          </div>
          <div style="margin-top: 5px; font-size: 14px;">
            <span>${resume.personalInfo.linkedin}</span> | 
            <span>${resume.personalInfo.website}</span>
          </div>
        </header>

        <section style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Professional Summary</h3>
          <p style="margin: 0; text-align: justify;">${resume.professionalSummary}</p>
        </section>

        <section style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Professional Experience</h3>
          ${resume.experience.map(exp => `
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                <div>
                  <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${exp.position}</h4>
                  <p style="margin: 0; font-size: 14px; font-weight: 600; color: #666;">${exp.company}</p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #666;">${exp.startDate} - ${exp.endDate}</p>
                  <p style="margin: 0; font-size: 12px; color: #666;">${exp.location}</p>
                </div>
              </div>
              <div style="font-size: 13px; margin-top: 8px;">${exp.description}</div>
              <ul style="margin: 8px 0 0 20px; font-size: 13px;">
                ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </section>

        <section style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Education</h3>
          ${resume.education.map(edu => `
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${edu.degree} in ${edu.field}</h4>
                  <p style="margin: 0; font-size: 14px; color: #666;">${edu.institution}</p>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 12px; color: #666;">${edu.startDate} - ${edu.endDate}</p>
                  ${edu.gpa ? `<p style="margin: 0; font-size: 12px; color: #666;">GPA: ${edu.gpa}</p>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </section>

        <section style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Skills</h3>
          ${resume.skills.map(skillGroup => `
            <div style="margin-bottom: 10px;">
              <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">${skillGroup.category}</h4>
              <p style="margin: 0; font-size: 13px;">${skillGroup.items.join(', ')}</p>
            </div>
          `).join('')}
        </section>

        ${resume.projects.length > 0 ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Projects</h3>
            ${resume.projects.map(project => `
              <div style="margin-bottom: 15px;">
                <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${project.name}</h4>
                <p style="margin: 5px 0; font-size: 13px;">${project.description}</p>
                <p style="margin: 0; font-size: 12px; color: #666;">Technologies: ${project.technologies.join(', ')}</p>
              </div>
            `).join('')}
          </section>
        ` : ''}

        ${resume.certifications.length > 0 ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Certifications</h3>
            ${resume.certifications.map(cert => `
              <div style="margin-bottom: 10px;">
                <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${cert.name}</h4>
                <p style="margin: 0; font-size: 13px; color: #666;">${cert.issuer} - ${cert.date}</p>
              </div>
            `).join('')}
          </section>
        ` : ''}
      </div>
    `;
  };

  const resetGenerator = () => {
    setActiveStep('input');
    setJobTitle('');
    setJobDescription('');
    setCompanyName('');
    setCompanyIndustry('');
    setExperienceLevel('mid');
    setUserBackground('');
    setExistingResumeId('');
    setJobAnalysis(null);
    setGeneratedResume(null);
    setError(null);
    setAnalysisProgress(0);
  };

  const steps = [
    { id: 'input', title: 'Job Input', icon: FileText },
    { id: 'analysis', title: 'NLP Analysis', icon: Brain },
    { id: 'generation', title: 'AI Generation', icon: Sparkles },
    { id: 'preview', title: 'Preview & Save', icon: CheckCircle }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          NLP Resume Generator
        </h1>
        <p className="text-gray-600 dark:text-dark-text-tertiary">
          Generate a complete, tailored resume using advanced NLP analysis of job descriptions
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                activeStep === step.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : steps.findIndex(s => s.id === activeStep) > index
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                activeStep === step.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  steps.findIndex(s => s.id === activeStep) > index ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-gray-200 dark:border-dark-border-primary p-8">
        {/* Step 1: Job Input */}
        {activeStep === 'input' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
                Job Information & Requirements
              </h2>
              <p className="text-gray-600 dark:text-dark-text-tertiary mb-6">
                Provide detailed job information for NLP analysis and resume generation
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer, Marketing Manager"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Google, Microsoft"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={companyIndustry}
                      onChange={(e) => setCompanyIndustry(e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  >
                    <option value="entry">Entry Level (0-2 years)</option>
                    <option value="mid">Mid Level (2-5 years)</option>
                    <option value="senior">Senior Level (5+ years)</option>
                    <option value="executive">Executive Level (10+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Existing Resume to Enhance (Optional)
                  </label>
                  <select
                    value={existingResumeId}
                    onChange={(e) => setExistingResumeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  >
                    <option value="">Create from scratch</option>
                    {existingResumes.map(resume => (
                      <option key={resume.id} value={resume.id}>
                        {resume.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Job Description *
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the complete job description here. Include requirements, responsibilities, qualifications, and any other relevant information..."
                    className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Your Background & Experience
                  </label>
                  <textarea
                    value={userBackground}
                    onChange={(e) => setUserBackground(e.target.value)}
                    placeholder="Describe your professional background, key experiences, skills, education, and any specific achievements you'd like to highlight..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={analyzeJobDescription}
                disabled={isAnalyzing || !jobTitle.trim() || !jobDescription.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>Analyze Job Description</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: NLP Analysis Results */}
        {activeStep === 'analysis' && jobAnalysis && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                  NLP Analysis Results
                </h2>
                <p className="text-gray-600 dark:text-dark-text-tertiary">
                  Advanced analysis of job requirements and keywords
                </p>
              </div>
              <button
                onClick={() => setActiveStep('input')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                ← Edit Input
              </button>
            </div>

            {isAnalyzing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Analyzing job description...</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Required Skills */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-4 flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Required Skills ({jobAnalysis.requiredSkills.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {jobAnalysis.requiredSkills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Preferred Skills ({jobAnalysis.preferredSkills.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {jobAnalysis.preferredSkills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Responsibilities */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4 flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>Key Responsibilities</span>
                </h3>
                <ul className="space-y-2">
                  {jobAnalysis.keyResponsibilities.map((responsibility, index) => (
                    <li key={index} className="text-purple-700 dark:text-purple-200 text-sm flex items-start space-x-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Industry Keywords */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-4 flex items-center space-x-2">
                  <Award className="w-5 h-5" />
                  <span>Industry Keywords</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {jobAnalysis.industryKeywords.slice(0, 15).map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 rounded-full text-sm font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border-primary rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Analysis Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Experience Level:</span>
                  <p className="text-gray-600 dark:text-dark-text-tertiary">{jobAnalysis.experienceLevel}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Company Type:</span>
                  <p className="text-gray-600 dark:text-dark-text-tertiary">{jobAnalysis.companyType}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Total Keywords:</span>
                  <p className="text-gray-600 dark:text-dark-text-tertiary">{jobAnalysis.industryKeywords.length}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep('input')}
                className="px-6 py-3 border border-gray-300 dark:border-dark-border-primary text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover-bg transition-colors"
              >
                ← Back to Input
              </button>
              <button
                onClick={generateResumeWithAI}
                disabled={isGenerating}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Resume...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Resume Preview */}
        {activeStep === 'preview' && generatedResume && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                  Generated Resume Preview
                </h2>
                <p className="text-gray-600 dark:text-dark-text-tertiary">
                  Review and save your AI-generated resume
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveStep('analysis')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  ← Back to Analysis
                </button>
                <button
                  onClick={resetGenerator}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-border-primary text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover-bg transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* Resume Preview */}
            <div className="bg-white dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border-primary rounded-lg p-8 shadow-lg">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-300 dark:border-dark-border-primary">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                  {generatedResume.personalInfo.name}
                </h1>
                <h2 className="text-xl text-gray-600 dark:text-dark-text-tertiary mb-4">
                  {generatedResume.personalInfo.title}
                </h2>
                <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 dark:text-dark-text-tertiary">
                  <span>{generatedResume.personalInfo.email}</span>
                  <span>•</span>
                  <span>{generatedResume.personalInfo.phone}</span>
                  <span>•</span>
                  <span>{generatedResume.personalInfo.location}</span>
                </div>
                <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 dark:text-dark-text-tertiary mt-2">
                  <span>{generatedResume.personalInfo.linkedin}</span>
                  <span>•</span>
                  <span>{generatedResume.personalInfo.website}</span>
                </div>
              </div>

              {/* Professional Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-3 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                  Professional Summary
                </h3>
                <p className="text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                  {generatedResume.professionalSummary}
                </p>
              </div>

              {/* Experience */}
              {generatedResume.experience.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Professional Experience
                  </h3>
                  <div className="space-y-6">
                    {generatedResume.experience.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-dark-text-primary">{exp.position}</h4>
                            <p className="font-semibold text-gray-700 dark:text-dark-text-secondary">{exp.company}</p>
                          </div>
                          <div className="text-right text-sm text-gray-600 dark:text-dark-text-tertiary">
                            <p>{exp.startDate} - {exp.endDate}</p>
                            <p>{exp.location}</p>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text-secondary mb-2">{exp.description}</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-dark-text-secondary">
                          {exp.achievements.map((achievement, index) => (
                            <li key={index}>{achievement}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {generatedResume.education.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Education
                  </h3>
                  <div className="space-y-4">
                    {generatedResume.education.map((edu) => (
                      <div key={edu.id} className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-dark-text-primary">
                            {edu.degree} in {edu.field}
                          </h4>
                          <p className="text-gray-700 dark:text-dark-text-secondary">{edu.institution}</p>
                          {edu.honors && (
                            <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">{edu.honors}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600 dark:text-dark-text-tertiary">
                          <p>{edu.startDate} - {edu.endDate}</p>
                          {edu.gpa && <p>GPA: {edu.gpa}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {generatedResume.skills.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Skills
                  </h3>
                  <div className="space-y-3">
                    {generatedResume.skills.map((skillGroup) => (
                      <div key={skillGroup.id}>
                        <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                          {skillGroup.category} ({skillGroup.proficiency})
                        </h4>
                        <p className="text-gray-700 dark:text-dark-text-secondary">
                          {skillGroup.items.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {generatedResume.projects.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Projects
                  </h3>
                  <div className="space-y-4">
                    {generatedResume.projects.map((project) => (
                      <div key={project.id}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-dark-text-primary">{project.name}</h4>
                          <span className="text-sm text-gray-600 dark:text-dark-text-tertiary">{project.duration}</span>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text-secondary mb-2">{project.description}</p>
                        <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
                          Technologies: {project.technologies.join(', ')}
                        </p>
                        {project.link && (
                          <p className="text-sm text-blue-600 dark:text-blue-400">{project.link}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {generatedResume.certifications.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Certifications
                  </h3>
                  <div className="space-y-2">
                    {generatedResume.certifications.map((cert) => (
                      <div key={cert.id} className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary">{cert.name}</h4>
                          <p className="text-gray-700 dark:text-dark-text-secondary">{cert.issuer}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600 dark:text-dark-text-tertiary">
                          <p>{cert.date}</p>
                          {cert.expiryDate && <p>Expires: {cert.expiryDate}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {generatedResume.achievements.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 uppercase tracking-wide border-b border-gray-300 dark:border-dark-border-primary pb-2">
                    Achievements
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-dark-text-secondary">
                    {generatedResume.achievements.map((achievement, index) => (
                      <li key={index}>{achievement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={saveGeneratedResume}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save to Dashboard</span>
                  </>
                )}
              </button>
              
              <button
                onClick={downloadResume}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download PDF</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NLPResumeGenerator;