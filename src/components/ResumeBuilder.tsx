import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Eye, Plus, Trash2, Edit3, Sparkles, FileText, User, Mail, Phone, MapPin, Linkedin, Github, Globe, GraduationCap, Briefcase, Award, Code, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../lib/gemini';
import { PDFGenerator } from '../lib/pdfGenerator';

type View = 'home' | 'dashboard' | 'builder' | 'analyzer' | 'templates' | 'pricing' | 'settings';

interface ResumeBuilderProps {
  onNavigate: (view: View) => void;
}

interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  location: string;
}

interface SkillGroup {
  id: string;
  category: string;
  skills: string[];
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string;
  link: string;
  startDate: string;
  endDate: string;
}

interface CustomSection {
  id: string;
  title: string;
  icon: string;
  items: CustomSectionItem[];
  order: number;
  visible: boolean;
}

interface CustomSectionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  description: string;
  link: string;
}

interface ResumeData {
  id?: string;
  title: string;
  personal_info: PersonalInfo;
  summary: string;
  experience: { items: ExperienceItem[] };
  education: { items: EducationItem[] };
  skills: { items: SkillGroup[] };
  projects: { items: ProjectItem[] };
  custom_sections: CustomSection[];
  template_id: string;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [activeSection, setActiveSection] = useState<'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'custom'>('personal');
  const [resumeData, setResumeData] = useState<ResumeData>({
    title: 'My Resume',
    personal_info: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: ''
    },
    summary: '',
    experience: { items: [] },
    education: { items: [] },
    skills: { items: [] },
    projects: { items: [] },
    custom_sections: [],
    template_id: 'modern-blue'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const geminiService = new GeminiService();

  useEffect(() => {
    initializeResume();
  }, []);

  const initializeResume = async () => {
    try {
      // Check if we're editing an existing resume
      const editingResumeId = localStorage.getItem('editingResumeId');
      if (editingResumeId) {
        await loadExistingResume(editingResumeId);
        localStorage.removeItem('editingResumeId');
        return;
      }

      // Check if a template was selected
      const selectedTemplateId = localStorage.getItem('selectedTemplateId');
      if (selectedTemplateId) {
        setResumeData(prev => ({
          ...prev,
          template_id: selectedTemplateId
        }));
        localStorage.removeItem('selectedTemplateId');
      }

      // Load sample data based on template
      loadSampleData(selectedTemplateId || 'modern-blue');
    } catch (error) {
      console.error('Error initializing resume:', error);
      setError('Failed to initialize resume builder');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResume = async (resumeId: string) => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setResumeData({
          id: data.id,
          title: data.title,
          personal_info: data.personal_info || resumeData.personal_info,
          summary: data.summary || '',
          experience: data.experience || { items: [] },
          education: data.education || { items: [] },
          skills: data.skills || { items: [] },
          projects: data.projects || { items: [] },
          custom_sections: data.custom_sections || [],
          template_id: data.template_id || 'modern-blue'
        });
      }
    } catch (error) {
      console.error('Error loading resume:', error);
      setError('Failed to load resume');
    }
  };

  const loadSampleData = (templateId: string) => {
    const sampleData: Partial<ResumeData> = {
      personal_info: {
        name: 'Harshavardhan Bodapati',
        title: 'Full Stack Developer',
        email: 'harshavardhan80956@gmail.com',
        phone: '+91-9704257475',
        location: 'Vijayawada, India',
        linkedin: 'linkedin.com/in/harsha',
        github: 'github.com/harsha33983',
        website: 'harsha.dev'
      },
      summary: 'Versatile and detail-oriented Full Stack Developer with a strong foundation in both frontend and backend technologies. Passionate about building scalable web applications with clean, efficient code and user-friendly interfaces.',
      experience: {
        items: [
          {
            id: '1',
            company: 'Tech Solutions Inc',
            position: 'Senior Full Stack Developer',
            startDate: '2022-01',
            endDate: 'Present',
            location: 'Remote',
            description: '• Led development of enterprise web applications using React, Node.js, and cloud technologies\n• Improved application performance by 40% through code optimization and database tuning\n• Mentored junior developers and established coding standards for the team'
          },
          {
            id: '2',
            company: 'Digital Innovations',
            position: 'Frontend Developer',
            startDate: '2020-06',
            endDate: '2021-12',
            location: 'Hyderabad, India',
            description: '• Developed responsive web applications using React.js and modern CSS frameworks\n• Collaborated with UX/UI designers to implement pixel-perfect designs\n• Reduced page load times by 30% through performance optimization techniques'
          }
        ]
      },
      education: {
        items: [
          {
            id: '1',
            institution: 'Dhanalakshmi Srinivasan University',
            degree: 'Bachelor of Technology',
            field: 'Computer Science and Engineering',
            startDate: '2022',
            endDate: '2026',
            gpa: '8.40',
            location: 'Trichy, Tamil Nadu'
          }
        ]
      },
      skills: {
        items: [
          {
            id: '1',
            category: 'Programming Languages',
            skills: ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++']
          },
          {
            id: '2',
            category: 'Frontend Technologies',
            skills: ['React.js', 'Next.js', 'HTML5', 'CSS3', 'Tailwind CSS', 'Material-UI']
          },
          {
            id: '3',
            category: 'Backend Technologies',
            skills: ['Node.js', 'Express.js', 'FastAPI', 'Django', 'MongoDB', 'PostgreSQL']
          },
          {
            id: '4',
            category: 'Tools & Technologies',
            skills: ['Git', 'Docker', 'AWS', 'Firebase', 'Supabase', 'Vercel']
          }
        ]
      },
      projects: {
        items: [
          {
            id: '1',
            name: 'Streamflix',
            description: 'A fully responsive movie streaming platform inspired by Netflix with secure authentication, real-time movie data from TMDB API, and embedded YouTube player for streaming content.',
            technologies: 'React.js, Firebase, TMDB API, YouTube API, Tailwind CSS',
            link: 'https://streamflix-demo.vercel.app',
            startDate: '2023-08',
            endDate: '2023-10'
          },
          {
            id: '2',
            name: 'ResuMaster',
            description: 'AI-powered resume builder and analyzer with intelligent content generation, ATS optimization, and comprehensive resume analysis using advanced AI algorithms.',
            technologies: 'React.js, TypeScript, Supabase, Gemini AI, Tailwind CSS',
            link: 'https://resumaster.vercel.app',
            startDate: '2024-01',
            endDate: '2024-03'
          }
        ]
      },
      template_id: templateId
    };

    setResumeData(prev => ({
      ...prev,
      ...sampleData
    }));
  };

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in to save your resume');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const resumePayload = {
        user_id: user.id,
        title: resumeData.title,
        personal_info: resumeData.personal_info,
        summary: resumeData.summary,
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        projects: resumeData.projects,
        custom_sections: resumeData.custom_sections,
        template_id: resumeData.template_id,
        is_published: true
      };

      let result;
      if (resumeData.id) {
        // Update existing resume
        result = await supabase
          .from('resumes')
          .update(resumePayload)
          .eq('id', resumeData.id)
          .select()
          .single();
      } else {
        // Create new resume
        result = await supabase
          .from('resumes')
          .insert(resumePayload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setResumeData(prev => ({ ...prev, id: result.data.id }));
      alert('Resume saved successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;

    setDownloading(true);
    try {
      const filename = `${resumeData.title.replace(/\s+/g, '_')}.pdf`;
      await PDFGenerator.generateResumePDF(previewRef.current, filename);
    } catch (error) {
      setError('Failed to download resume');
    } finally {
      setDownloading(false);
    }
  };

  const generateAIContent = async (section: string, context: string) => {
    setAiGenerating(true);
    try {
      const content = await geminiService.generateResumeContent(section, context);
      return content;
    } catch (error: any) {
      setError(error.message || 'Failed to generate AI content');
      return '';
    } finally {
      setAiGenerating(false);
    }
  };

  const addExperience = () => {
    const newExp: ExperienceItem = {
      id: Date.now().toString(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: ''
    };
    setResumeData(prev => ({
      ...prev,
      experience: {
        items: [...prev.experience.items, newExp]
      }
    }));
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: {
        items: prev.experience.items.map(item =>
          item.id === id ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: {
        items: prev.experience.items.filter(item => item.id !== id)
      }
    }));
  };

  const addEducation = () => {
    const newEdu: EducationItem = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      location: ''
    };
    setResumeData(prev => ({
      ...prev,
      education: {
        items: [...prev.education.items, newEdu]
      }
    }));
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: {
        items: prev.education.items.map(item =>
          item.id === id ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: {
        items: prev.education.items.filter(item => item.id !== id)
      }
    }));
  };

  const addSkillGroup = () => {
    const newSkill: SkillGroup = {
      id: Date.now().toString(),
      category: '',
      skills: []
    };
    setResumeData(prev => ({
      ...prev,
      skills: {
        items: [...prev.skills.items, newSkill]
      }
    }));
  };

  const updateSkillGroup = (id: string, category: string, skills: string[]) => {
    setResumeData(prev => ({
      ...prev,
      skills: {
        items: prev.skills.items.map(item =>
          item.id === id ? { ...item, category, skills } : item
        )
      }
    }));
  };

  const removeSkillGroup = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: {
        items: prev.skills.items.filter(item => item.id !== id)
      }
    }));
  };

  const addProject = () => {
    const newProject: ProjectItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      technologies: '',
      link: '',
      startDate: '',
      endDate: ''
    };
    setResumeData(prev => ({
      ...prev,
      projects: {
        items: [...prev.projects.items, newProject]
      }
    }));
  };

  const updateProject = (id: string, field: keyof ProjectItem, value: string) => {
    setResumeData(prev => ({
      ...prev,
      projects: {
        items: prev.projects.items.map(item =>
          item.id === id ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const removeProject = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      projects: {
        items: prev.projects.items.filter(item => item.id !== id)
      }
    }));
  };

  const renderResumePreview = () => {
    const templateId = resumeData.template_id;
    
    // Minimal White Templates
    if (templateId === 'minimal-clean') {
      return (
        <div className="w-full h-full bg-white p-8 text-sm leading-relaxed font-sans" style={{ minHeight: '297mm' }}>
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{resumeData.personal_info.name || 'Your Name'}</h1>
            <p className="text-xl text-gray-600 mb-4">{resumeData.personal_info.title || 'Professional Title'}</p>
            <div className="flex justify-center items-center space-x-6 text-gray-600">
              {resumeData.personal_info.phone && (
                <span className="flex items-center"><Phone className="w-4 h-4 mr-2" />{resumeData.personal_info.phone}</span>
              )}
              {resumeData.personal_info.email && (
                <span className="flex items-center"><Mail className="w-4 h-4 mr-2" />{resumeData.personal_info.email}</span>
              )}
              {resumeData.personal_info.location && (
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{resumeData.personal_info.location}</span>
              )}
            </div>
            {(resumeData.personal_info.linkedin || resumeData.personal_info.github || resumeData.personal_info.website) && (
              <div className="flex justify-center items-center space-x-6 text-gray-600 mt-2">
                {resumeData.personal_info.linkedin && (
                  <span className="flex items-center"><Linkedin className="w-4 h-4 mr-2" />{resumeData.personal_info.linkedin}</span>
                )}
                {resumeData.personal_info.github && (
                  <span className="flex items-center"><Github className="w-4 h-4 mr-2" />{resumeData.personal_info.github}</span>
                )}
                {resumeData.personal_info.website && (
                  <span className="flex items-center"><Globe className="w-4 h-4 mr-2" />{resumeData.personal_info.website}</span>
                )}
              </div>
            )}
          </div>

          {/* About */}
          {resumeData.summary && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide">About</h2>
              <p className="text-gray-700 leading-relaxed">{resumeData.summary}</p>
            </div>
          )}

          {/* Experience */}
          {resumeData.experience.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Experience</h2>
              {resumeData.experience.items.map((exp) => (
                <div key={exp.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-gray-600">{exp.company}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-sm">{exp.startDate} - {exp.endDate}</span>
                      {exp.location && <p className="text-gray-500 text-sm">{exp.location}</p>}
                    </div>
                  </div>
                  {exp.description && (
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Projects</h2>
              {resumeData.projects.items.map((project) => (
                <div key={project.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {project.technologies && <p className="text-gray-600 text-sm">{project.technologies}</p>}
                    </div>
                    <div className="text-right">
                      {project.startDate && project.endDate && (
                        <span className="text-gray-500 text-sm">{project.startDate} - {project.endDate}</span>
                      )}
                      {project.link && (
                        <p className="text-blue-600 text-sm">{project.link}</p>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-gray-700 text-sm leading-relaxed">{project.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resumeData.education.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Education</h2>
              {resumeData.education.items.map((edu) => (
                <div key={edu.id} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                      <p className="text-gray-600">{edu.institution}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-sm">{edu.startDate} - {edu.endDate}</span>
                      {edu.gpa && <p className="text-gray-600 text-sm">CGPA: {edu.gpa}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {resumeData.skills.items.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Skills</h2>
              {resumeData.skills.items.map((skillGroup) => (
                <div key={skillGroup.id} className="mb-3">
                  <span className="font-semibold text-gray-900">{skillGroup.category}: </span>
                  <span className="text-gray-700">{skillGroup.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (templateId === 'minimal-professional') {
      return (
        <div className="w-full h-full bg-white p-8 text-sm leading-relaxed font-sans" style={{ minHeight: '297mm' }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{resumeData.personal_info.name || 'Your Name'}</h1>
            <p className="text-xl text-gray-600 mb-6">{resumeData.personal_info.title || 'Professional Title'}</p>
            <div className="grid grid-cols-2 gap-4 text-gray-600">
              {resumeData.personal_info.phone && (
                <span className="flex items-center"><Phone className="w-4 h-4 mr-2" />{resumeData.personal_info.phone}</span>
              )}
              {resumeData.personal_info.email && (
                <span className="flex items-center"><Mail className="w-4 h-4 mr-2" />{resumeData.personal_info.email}</span>
              )}
              {resumeData.personal_info.location && (
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{resumeData.personal_info.location}</span>
              )}
              {resumeData.personal_info.linkedin && (
                <span className="flex items-center"><Linkedin className="w-4 h-4 mr-2" />{resumeData.personal_info.linkedin}</span>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {resumeData.summary && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-300">PROFESSIONAL SUMMARY</h2>
              <p className="text-gray-700 leading-relaxed">{resumeData.summary}</p>
            </div>
          )}

          {/* Professional Experience */}
          {resumeData.experience.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">PROFESSIONAL EXPERIENCE</h2>
              {resumeData.experience.items.map((exp) => (
                <div key={exp.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{exp.position}</h3>
                      <p className="font-semibold text-gray-700">{exp.company}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600 font-medium">{exp.startDate} - {exp.endDate}</span>
                      {exp.location && <p className="text-gray-600 text-sm">{exp.location}</p>}
                    </div>
                  </div>
                  {exp.description && (
                    <div className="text-gray-700 leading-relaxed mt-2 whitespace-pre-line">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">PROJECTS</h2>
              {resumeData.projects.items.map((project) => (
                <div key={project.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{project.name}</h3>
                      {project.technologies && <p className="text-gray-600">{project.technologies}</p>}
                    </div>
                    <div className="text-right">
                      {project.startDate && project.endDate && (
                        <span className="text-gray-600 text-sm">{project.startDate} - {project.endDate}</span>
                      )}
                      {project.link && (
                        <p className="text-blue-600 text-sm">{project.link}</p>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-gray-700 leading-relaxed">{project.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resumeData.education.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">EDUCATION</h2>
              {resumeData.education.items.map((edu) => (
                <div key={edu.id} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                      <p className="text-gray-700">{edu.institution}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">{edu.startDate} - {edu.endDate}</span>
                      {edu.gpa && <p className="text-gray-600 text-sm">CGPA: {edu.gpa}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {resumeData.skills.items.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">SKILLS</h2>
              {resumeData.skills.items.map((skillGroup) => (
                <div key={skillGroup.id} className="mb-3">
                  <span className="font-bold text-gray-900">{skillGroup.category}: </span>
                  <span className="text-gray-700">{skillGroup.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (templateId === 'minimal-elegant') {
      return (
        <div className="w-full h-full bg-white p-8 text-sm leading-relaxed font-serif" style={{ minHeight: '297mm' }}>
          {/* Header */}
          <div className="text-center mb-10 pb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-wide">{resumeData.personal_info.name || 'Your Name'}</h1>
            <p className="text-xl text-gray-600 mb-6 italic">{resumeData.personal_info.title || 'Professional Title'}</p>
            <div className="flex justify-center items-center space-x-8 text-gray-600">
              {resumeData.personal_info.phone && <span>{resumeData.personal_info.phone}</span>}
              {resumeData.personal_info.email && <span>{resumeData.personal_info.email}</span>}
              {resumeData.personal_info.location && <span>{resumeData.personal_info.location}</span>}
            </div>
            {(resumeData.personal_info.linkedin || resumeData.personal_info.github || resumeData.personal_info.website) && (
              <div className="flex justify-center items-center space-x-8 text-gray-600 mt-3">
                {resumeData.personal_info.linkedin && <span>{resumeData.personal_info.linkedin}</span>}
                {resumeData.personal_info.github && <span>{resumeData.personal_info.github}</span>}
                {resumeData.personal_info.website && <span>{resumeData.personal_info.website}</span>}
              </div>
            )}
          </div>

          {/* About */}
          {resumeData.summary && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-widest">ABOUT</h2>
              <p className="text-gray-700 leading-relaxed text-justify">{resumeData.summary}</p>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-widest">PROJECTS</h2>
              {resumeData.projects.items.map((project) => (
                <div key={project.id} className="mb-6">
                  <h3 className="font-bold text-gray-900">{project.name} | <span className="italic font-normal">{project.technologies}</span></h3>
                  {project.description && (
                    <p className="text-gray-700 mt-2 leading-relaxed">{project.description}</p>
                  )}
                  {project.link && (
                    <p className="text-blue-600 text-sm mt-1">{project.link}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Experience */}
          {resumeData.experience.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-widest">EXPERIENCE</h2>
              {resumeData.experience.items.map((exp) => (
                <div key={exp.id} className="mb-6">
                  <div className="text-center mb-2">
                    <h3 className="font-bold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-700 italic">{exp.company}</p>
                    <div className="flex justify-center space-x-4 text-gray-600 text-sm mt-1">
                      <span>{exp.startDate} - {exp.endDate}</span>
                      {exp.location && (
                        <>
                          <span>•</span>
                          <span>{exp.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {exp.description && (
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {exp.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resumeData.education.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-widest">EDUCATION</h2>
              {resumeData.education.items.map((edu) => (
                <div key={edu.id} className="text-center mb-4">
                  <h3 className="font-bold text-gray-900">{edu.institution}</h3>
                  <p className="text-gray-700 italic">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                  <div className="flex justify-center space-x-4 text-gray-600 text-sm mt-1">
                    <span>{edu.startDate} - {edu.endDate}</span>
                    {edu.gpa && (
                      <>
                        <span>•</span>
                        <span>CGPA: {edu.gpa}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {resumeData.skills.items.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center tracking-widest">SKILLS</h2>
              {resumeData.skills.items.map((skillGroup) => (
                <div key={skillGroup.id} className="mb-3 text-center">
                  <span className="font-bold text-gray-900">{skillGroup.category}: </span>
                  <span className="text-gray-700">{skillGroup.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default modern template
    return (
      <div className={`w-full h-full p-6 text-sm ${
        templateId.includes('blue') ? 'bg-gradient-to-br from-blue-50 to-blue-100' :
        templateId.includes('green') ? 'bg-gradient-to-br from-green-50 to-green-100' :
        templateId.includes('purple') ? 'bg-gradient-to-br from-purple-50 to-purple-100' :
        templateId.includes('orange') ? 'bg-gradient-to-br from-orange-50 to-orange-100' :
        'bg-white'
      }`} style={{ minHeight: '297mm' }}>
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Left Sidebar */}
          <div className="col-span-1 space-y-6">
            {/* Profile */}
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                templateId.includes('blue') ? 'bg-blue-600' :
                templateId.includes('green') ? 'bg-green-600' :
                templateId.includes('purple') ? 'bg-purple-600' :
                templateId.includes('orange') ? 'bg-orange-600' :
                'bg-gray-600'
              }`}>
                <User className="w-12 h-12 text-white" />
              </div>
              <h1 className={`text-xl font-bold mb-1 ${
                templateId.includes('blue') ? 'text-blue-900' :
                templateId.includes('green') ? 'text-green-900' :
                templateId.includes('purple') ? 'text-purple-900' :
                templateId.includes('orange') ? 'text-orange-900' :
                'text-gray-900'
              }`}>
                {resumeData.personal_info.name || 'Your Name'}
              </h1>
              <p className="text-gray-600 text-sm">{resumeData.personal_info.title || 'Professional Title'}</p>
            </div>

            {/* Contact */}
            <div>
              <h3 className={`font-semibold mb-3 ${
                templateId.includes('blue') ? 'text-blue-800' :
                templateId.includes('green') ? 'text-green-800' :
                templateId.includes('purple') ? 'text-purple-800' :
                templateId.includes('orange') ? 'text-orange-800' :
                'text-gray-800'
              }`}>
                Contact
              </h3>
              <div className="space-y-2 text-xs">
                {resumeData.personal_info.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-700">{resumeData.personal_info.email}</span>
                  </div>
                )}
                {resumeData.personal_info.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-700">{resumeData.personal_info.phone}</span>
                  </div>
                )}
                {resumeData.personal_info.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-700">{resumeData.personal_info.location}</span>
                  </div>
                )}
                {resumeData.personal_info.linkedin && (
                  <div className="flex items-center space-x-2">
                    <Linkedin className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-700">{resumeData.personal_info.linkedin}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            {resumeData.skills.items.length > 0 && (
              <div>
                <h3 className={`font-semibold mb-3 ${
                  templateId.includes('blue') ? 'text-blue-800' :
                  templateId.includes('green') ? 'text-green-800' :
                  templateId.includes('purple') ? 'text-purple-800' :
                  templateId.includes('orange') ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  Skills
                </h3>
                <div className="space-y-3">
                  {resumeData.skills.items.map((skillGroup) => (
                    <div key={skillGroup.id}>
                      <p className="text-xs font-medium text-gray-700 mb-1">{skillGroup.category}</p>
                      <p className="text-xs text-gray-600">{skillGroup.skills.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Summary */}
            {resumeData.summary && (
              <div>
                <h3 className={`font-semibold text-sm mb-2 ${
                  templateId.includes('blue') ? 'text-blue-800' :
                  templateId.includes('green') ? 'text-green-800' :
                  templateId.includes('purple') ? 'text-purple-800' :
                  templateId.includes('orange') ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  Professional Summary
                </h3>
                <p className="text-xs text-gray-700 leading-relaxed">{resumeData.summary}</p>
              </div>
            )}

            {/* Experience */}
            {resumeData.experience.items.length > 0 && (
              <div>
                <h3 className={`font-semibold text-sm mb-3 ${
                  templateId.includes('blue') ? 'text-blue-800' :
                  templateId.includes('green') ? 'text-green-800' :
                  templateId.includes('purple') ? 'text-purple-800' :
                  templateId.includes('orange') ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  Professional Experience
                </h3>
                {resumeData.experience.items.map((exp) => (
                  <div key={exp.id} className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-medium text-xs text-gray-900">{exp.position}</p>
                        <p className="text-xs text-gray-600">{exp.company}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate}</span>
                        {exp.location && <p className="text-xs text-gray-500">{exp.location}</p>}
                      </div>
                    </div>
                    {exp.description && (
                      <div className="text-xs text-gray-700 mt-1 leading-relaxed whitespace-pre-line">
                        {exp.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {resumeData.projects.items.length > 0 && (
              <div>
                <h3 className={`font-semibold text-sm mb-3 ${
                  templateId.includes('blue') ? 'text-blue-800' :
                  templateId.includes('green') ? 'text-green-800' :
                  templateId.includes('purple') ? 'text-purple-800' :
                  templateId.includes('orange') ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  Projects
                </h3>
                {resumeData.projects.items.map((project) => (
                  <div key={project.id} className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-medium text-xs text-gray-900">{project.name}</p>
                        {project.technologies && <p className="text-xs text-gray-600">{project.technologies}</p>}
                      </div>
                      {project.link && (
                        <span className="text-xs text-blue-600">{project.link}</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">{project.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {resumeData.education.items.length > 0 && (
              <div>
                <h3 className={`font-semibold text-sm mb-3 ${
                  templateId.includes('blue') ? 'text-blue-800' :
                  templateId.includes('green') ? 'text-green-800' :
                  templateId.includes('purple') ? 'text-purple-800' :
                  templateId.includes('orange') ? 'text-orange-800' :
                  'text-gray-800'
                }`}>
                  Education
                </h3>
                {resumeData.education.items.map((edu) => (
                  <div key={edu.id} className="mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-xs text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</p>
                        <p className="text-xs text-gray-600">{edu.institution}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</span>
                        {edu.gpa && <p className="text-xs text-gray-500">CGPA: {edu.gpa}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-dark-text-tertiary">Loading resume builder...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2 text-gray-600 dark:text-dark-text-tertiary hover:text-gray-900 dark:hover:text-dark-text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Resume Builder</h1>
            <p className="text-gray-600 dark:text-dark-text-tertiary">Create and customize your professional resume</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={resumeData.title}
            onChange={(e) => setResumeData(prev => ({ ...prev, title: e.target.value }))}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
            placeholder="Resume Title"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center space-x-2"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-gray-200 dark:border-dark-border-primary mb-8">
        <div className="flex border-b border-gray-200 dark:border-dark-border-primary">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'edit'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-dark-text-tertiary hover:text-gray-900 dark:hover:text-dark-text-primary'
            }`}
          >
            <Edit3 className="w-5 h-5" />
            <span>Edit Resume</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'preview'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-dark-text-tertiary hover:text-gray-900 dark:hover:text-dark-text-primary'
            }`}
          >
            <Eye className="w-5 h-5" />
            <span>Preview</span>
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'edit' && (
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Section Navigation */}
              <div className="lg:col-span-1">
                <div className="space-y-2">
                  {[
                    { id: 'personal', label: 'Personal Info', icon: User },
                    { id: 'summary', label: 'Summary', icon: FileText },
                    { id: 'experience', label: 'Experience', icon: Briefcase },
                    { id: 'education', label: 'Education', icon: GraduationCap },
                    { id: 'skills', label: 'Skills', icon: Code },
                    { id: 'projects', label: 'Projects', icon: Award }
                  ].map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                          : 'text-gray-600 dark:text-dark-text-tertiary hover:bg-gray-50 dark:hover:bg-dark-hover-bg hover:text-gray-900 dark:hover:text-dark-text-primary'
                      }`}
                    >
                      <section.icon className="w-5 h-5" />
                      <span className="font-medium">{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Content */}
              <div className="lg:col-span-3">
                {/* Personal Information */}
                {activeSection === 'personal' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Full Name</label>
                        <input
                          type="text"
                          value={resumeData.personal_info.name}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, name: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Professional Title</label>
                        <input
                          type="text"
                          value={resumeData.personal_info.title}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, title: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Email</label>
                        <input
                          type="email"
                          value={resumeData.personal_info.email}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, email: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Phone</label>
                        <input
                          type="tel"
                          value={resumeData.personal_info.phone}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, phone: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Location</label>
                        <input
                          type="text"
                          value={resumeData.personal_info.location}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, location: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="City, State"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">LinkedIn</label>
                        <input
                          type="url"
                          value={resumeData.personal_info.linkedin}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, linkedin: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="linkedin.com/in/johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">GitHub</label>
                        <input
                          type="url"
                          value={resumeData.personal_info.github}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, github: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="github.com/johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Website</label>
                        <input
                          type="url"
                          value={resumeData.personal_info.website}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personal_info: { ...prev.personal_info, website: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="johndoe.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Professional Summary */}
                {activeSection === 'summary' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Professional Summary</h2>
                      <button
                        onClick={async () => {
                          const context = `Professional with experience in ${resumeData.skills.items.map(s => s.category).join(', ')}`;
                          const content = await generateAIContent('summary', context);
                          if (content) {
                            setResumeData(prev => ({ ...prev, summary: content }));
                          }
                        }}
                        disabled={aiGenerating}
                        className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
                      >
                        {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Generate with AI</span>
                      </button>
                    </div>
                    <textarea
                      value={resumeData.summary}
                      onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Write a compelling professional summary that highlights your key achievements, skills, and career objectives..."
                      className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    />
                  </div>
                )}

                {/* Experience */}
                {activeSection === 'experience' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Work Experience</h2>
                      <button
                        onClick={addExperience}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Experience</span>
                      </button>
                    </div>
                    <div className="space-y-6">
                      {resumeData.experience.items.map((exp) => (
                        <div key={exp.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Experience Entry</h3>
                            <button
                              onClick={() => removeExperience(exp.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                              type="text"
                              placeholder="Company Name"
                              value={exp.company}
                              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Position Title"
                              value={exp.position}
                              onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Start Date (e.g., Jan 2020)"
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="End Date (e.g., Present)"
                              value={exp.endDate}
                              onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Location"
                              value={exp.location}
                              onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary md:col-span-2"
                            />
                          </div>
                          <textarea
                            placeholder="Job description, key responsibilities, and quantified achievements..."
                            value={exp.description}
                            onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {activeSection === 'education' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Education</h2>
                      <button
                        onClick={addEducation}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Education</span>
                      </button>
                    </div>
                    <div className="space-y-6">
                      {resumeData.education.items.map((edu) => (
                        <div key={edu.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Education Entry</h3>
                            <button
                              onClick={() => removeEducation(edu.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Institution Name"
                              value={edu.institution}
                              onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Degree"
                              value={edu.degree}
                              onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Field of Study"
                              value={edu.field}
                              onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="GPA (optional)"
                              value={edu.gpa}
                              onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Start Year"
                              value={edu.startDate}
                              onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="End Year"
                              value={edu.endDate}
                              onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {activeSection === 'skills' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Skills</h2>
                      <button
                        onClick={addSkillGroup}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Skill Category</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {resumeData.skills.items.map((skillGroup) => (
                        <div key={skillGroup.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Skill Category</h3>
                            <button
                              onClick={() => removeSkillGroup(skillGroup.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                              type="text"
                              placeholder="Category (e.g., Programming Languages)"
                              value={skillGroup.category}
                              onChange={(e) => updateSkillGroup(skillGroup.id, e.target.value, skillGroup.skills)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Skills (comma-separated)"
                              value={skillGroup.skills.join(', ')}
                              onChange={(e) => updateSkillGroup(skillGroup.id, skillGroup.category, e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary md:col-span-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {activeSection === 'projects' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Projects</h2>
                      <button
                        onClick={addProject}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Project</span>
                      </button>
                    </div>
                    <div className="space-y-6">
                      {resumeData.projects.items.map((project) => (
                        <div key={project.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Project Entry</h3>
                            <button
                              onClick={() => removeProject(project.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                              type="text"
                              placeholder="Project Name"
                              value={project.name}
                              onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="url"
                              placeholder="Project Link (optional)"
                              value={project.link}
                              onChange={(e) => updateProject(project.id, 'link', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Technologies Used"
                              value={project.technologies}
                              onChange={(e) => updateProject(project.id, 'technologies', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary md:col-span-2"
                            />
                          </div>
                          <textarea
                            placeholder="Project description, key features, and achievements..."
                            value={project.description}
                            onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Resume Preview</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={resumeData.template_id}
                    onChange={(e) => setResumeData(prev => ({ ...prev, template_id: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  >
                    <option value="modern-blue">Modern Blue</option>
                    <option value="modern-green">Modern Green</option>
                    <option value="modern-purple">Modern Purple</option>
                    <option value="modern-orange">Modern Orange</option>
                    <option value="minimal-clean">Minimal Clean</option>
                    <option value="minimal-professional">Minimal Professional</option>
                    <option value="minimal-elegant">Minimal Elegant</option>
                  </select>
                  <button
                    onClick={() => onNavigate('templates')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Browse Templates
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ aspectRatio: '8.5/11' }}>
                <div ref={previewRef} className="w-full h-full">
                  {renderResumePreview()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 max-w-md">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;