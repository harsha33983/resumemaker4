import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Eye, Edit3, Plus, Trash2, Camera, Upload, Sparkles, User, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase, GraduationCap, Award, Code, FileText, Loader2, X } from 'lucide-react';
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
  photo?: string;
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

interface SkillCategory {
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
  type: 'text' | 'list' | 'achievements';
  content: string;
  items: string[];
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: { items: ExperienceItem[] };
  education: { items: EducationItem[] };
  skills: { items: SkillCategory[] };
  projects: { items: ProjectItem[] };
  customSections: CustomSection[];
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('minimal-clean');
  const [isSaving, setSaving] = useState(false);
  const [isDownloading, setDownloading] = useState(false);
  const [isGenerating, setGenerating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState('My Resume');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
      photo: ''
    },
    summary: '',
    experience: { items: [] },
    education: { items: [] },
    skills: { items: [] },
    projects: { items: [] },
    customSections: []
  });

  const geminiService = new GeminiService();

  useEffect(() => {
    // Check for selected template from localStorage
    const templateId = localStorage.getItem('selectedTemplateId');
    if (templateId) {
      setSelectedTemplate(templateId);
      localStorage.removeItem('selectedTemplateId'); // Clean up
    }

    // Check for editing resume
    const editingResumeId = localStorage.getItem('editingResumeId');
    if (editingResumeId && user) {
      loadResume(editingResumeId);
      localStorage.removeItem('editingResumeId'); // Clean up
    }
  }, [user]);

  const loadResume = async (resumeId: string) => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (error) throw error;

      if (data) {
        setResumeTitle(data.title);
        setResumeData({
          personalInfo: data.personal_info || resumeData.personalInfo,
          summary: data.summary || '',
          experience: data.experience || { items: [] },
          education: data.education || { items: [] },
          skills: data.skills || { items: [] },
          projects: data.projects || { items: [] },
          customSections: data.custom_sections || []
        });
      }
    } catch (error) {
      console.error('Error loading resume:', error);
      setError('Failed to load resume');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      // Delete old photo if it exists
      if (resumeData.personalInfo.photo) {
        const oldPath = resumeData.personalInfo.photo.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('resume-photos')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resume-photos')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('resume-photos')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        setResumeData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, photo: data.publicUrl }
        }));
      } else {
        throw new Error('Failed to get public URL for uploaded image');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      
      if (error.message?.includes('Bucket not found')) {
        setError('Photo storage not configured. Please contact support.');
      } else if (error.message?.includes('not allowed')) {
        setError('You do not have permission to upload photos. Please try again or contact support.');
      } else {
        setError('Failed to upload photo. Please try again.');
      }
    } finally {
      setUploadingPhoto(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!resumeData.personalInfo.photo || !user?.id) return;

    try {
      // Extract file path from URL
      const urlParts = resumeData.personalInfo.photo.split('/');
      const fileName = urlParts.pop();
      if (fileName) {
        const filePath = `${user.id}/${fileName}`;
        
        const { error } = await supabase.storage
          .from('resume-photos')
          .remove([filePath]);

        if (error) {
          console.error('Error removing photo:', error);
        }
      }

      setResumeData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photo: '' }
      }));
    } catch (error) {
      console.error('Error removing photo:', error);
      setError('Failed to remove photo. Please try again.');
    }
  };

  const addCustomSection = () => {
    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      title: 'New Section',
      type: 'text',
      content: '',
      items: []
    };
    setResumeData(prev => ({
      ...prev,
      customSections: [...prev.customSections, newSection]
    }));
  };

  const updateCustomSection = (id: string, updates: Partial<CustomSection>) => {
    setResumeData(prev => ({
      ...prev,
      customSections: prev.customSections.map(section =>
        section.id === id ? { ...section, ...updates } : section
      )
    }));
  };

  const removeCustomSection = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      customSections: prev.customSections.filter(section => section.id !== id)
    }));
  };

  const addCustomSectionItem = (sectionId: string) => {
    setResumeData(prev => ({
      ...prev,
      customSections: prev.customSections.map(section =>
        section.id === sectionId 
          ? { ...section, items: [...section.items, ''] }
          : section
      )
    }));
  };

  const updateCustomSectionItem = (sectionId: string, itemIndex: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      customSections: prev.customSections.map(section =>
        section.id === sectionId 
          ? { 
              ...section, 
              items: section.items.map((item, index) => 
                index === itemIndex ? value : item
              )
            }
          : section
      )
    }));
  };

  const removeCustomSectionItem = (sectionId: string, itemIndex: number) => {
    setResumeData(prev => ({
      ...prev,
      customSections: prev.customSections.map(section =>
        section.id === sectionId 
          ? { 
              ...section, 
              items: section.items.filter((_, index) => index !== itemIndex)
            }
          : section
      )
    }));
  };

  const addExperience = () => {
    const newExp: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: ''
    };
    setResumeData(prev => ({
      ...prev,
      experience: { items: [...prev.experience.items, newExp] }
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
      id: `edu-${Date.now()}`,
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
      education: { items: [...prev.education.items, newEdu] }
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

  const addSkillCategory = () => {
    const newSkill: SkillCategory = {
      id: `skill-${Date.now()}`,
      category: '',
      skills: []
    };
    setResumeData(prev => ({
      ...prev,
      skills: { items: [...prev.skills.items, newSkill] }
    }));
  };

  const updateSkillCategory = (id: string, category: string, skillsText: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: {
        items: prev.skills.items.map(item =>
          item.id === id ? { 
            ...item, 
            category, 
            skills: skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
          } : item
        )
      }
    }));
  };

  const removeSkillCategory = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: {
        items: prev.skills.items.filter(item => item.id !== id)
      }
    }));
  };

  const addProject = () => {
    const newProject: ProjectItem = {
      id: `project-${Date.now()}`,
      name: '',
      description: '',
      technologies: '',
      link: '',
      startDate: '',
      endDate: ''
    };
    setResumeData(prev => ({
      ...prev,
      projects: { items: [...prev.projects.items, newProject] }
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

  const generateAIContent = async (section: string, context: string) => {
    setGenerating(true);
    setError(null);
    
    try {
      const content = await geminiService.generateResumeContent(section, context);
      
      if (section === 'summary') {
        setResumeData(prev => ({ ...prev, summary: content }));
      }
      // Add more AI generation for other sections as needed
      
    } catch (error: any) {
      setError(error.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in to save your resume');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const resumeDataToSave = {
        user_id: user.id,
        title: resumeTitle,
        personal_info: resumeData.personalInfo,
        summary: resumeData.summary,
        experience: resumeData.experience,
        education: resumeData.education,
        skills: resumeData.skills,
        projects: resumeData.projects,
        custom_sections: resumeData.customSections,
        is_published: true
      };

      const { error } = await supabase
        .from('resumes')
        .insert(resumeDataToSave);

      if (error) throw error;

      alert('Resume saved successfully!');
      onNavigate('dashboard');
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
      await PDFGenerator.generateResumePDF(previewRef.current, `${resumeTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      setError('Failed to download resume. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const renderTemplatePreview = () => {
    const { personalInfo, summary, experience, education, skills, projects, customSections } = resumeData;

    // Minimal Clean Template
    if (selectedTemplate === 'minimal-clean') {
      return (
        <div className="w-full bg-white p-8 text-sm leading-relaxed font-sans min-h-[297mm]">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            {personalInfo.photo && (
              <div className="mb-4">
                <img 
                  src={personalInfo.photo} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-gray-200"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{personalInfo.name || 'Your Name'}</h1>
            <p className="text-xl text-gray-600 mb-4">{personalInfo.title || 'Professional Title'}</p>
            <div className="flex justify-center items-center space-x-6 text-gray-600 flex-wrap">
              {personalInfo.phone && <span className="flex items-center"><Phone className="w-4 h-4 mr-2" />{personalInfo.phone}</span>}
              {personalInfo.email && <span className="flex items-center"><Mail className="w-4 h-4 mr-2" />{personalInfo.email}</span>}
              {personalInfo.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-2" />{personalInfo.location}</span>}
            </div>
            {(personalInfo.linkedin || personalInfo.github || personalInfo.website) && (
              <div className="flex justify-center items-center space-x-6 text-gray-600 mt-2 flex-wrap">
                {personalInfo.linkedin && <span className="flex items-center"><Linkedin className="w-4 h-4 mr-2" />{personalInfo.linkedin}</span>}
                {personalInfo.github && <span className="flex items-center"><Github className="w-4 h-4 mr-2" />{personalInfo.github}</span>}
                {personalInfo.website && <span className="flex items-center"><Globe className="w-4 h-4 mr-2" />{personalInfo.website}</span>}
              </div>
            )}
          </div>

          {/* About */}
          {summary && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">About</h2>
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Experience */}
          {experience.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Experience</h2>
              {experience.items.map((exp) => (
                <div key={exp.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-gray-600">{exp.company}</p>
                      {exp.location && <p className="text-gray-500 text-sm">{exp.location}</p>}
                    </div>
                    <span className="text-gray-500 text-sm">{exp.startDate} - {exp.endDate || 'Present'}</span>
                  </div>
                  {exp.description && <p className="text-gray-700 leading-relaxed">{exp.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {projects.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Projects</h2>
              {projects.items.map((project) => (
                <div key={project.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {project.technologies && <p className="text-gray-600 text-sm">{project.technologies}</p>}
                    </div>
                    {(project.startDate || project.endDate) && (
                      <span className="text-gray-500 text-sm">{project.startDate} - {project.endDate || 'Present'}</span>
                    )}
                  </div>
                  {project.description && <p className="text-gray-700 leading-relaxed">{project.description}</p>}
                  {project.link && (
                    <p className="text-blue-600 text-sm mt-1">
                      <Globe className="w-3 h-3 inline mr-1" />
                      {project.link}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {education.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Education</h2>
              {education.items.map((edu) => (
                <div key={edu.id} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                      <p className="text-gray-600">{edu.institution}</p>
                      {edu.location && <p className="text-gray-500 text-sm">{edu.location}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-sm">{edu.startDate} - {edu.endDate || 'Present'}</span>
                      {edu.gpa && <p className="text-gray-600 text-sm">GPA: {edu.gpa}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {skills.items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Skills</h2>
              {skills.items.map((skillGroup) => (
                <div key={skillGroup.id} className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{skillGroup.category}:</h3>
                  <p className="text-gray-700">{skillGroup.skills.join(', ')}</p>
                </div>
              ))}
            </div>
          )}

          {/* Custom Sections */}
          {customSections.map((section) => (
            <div key={section.id} className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">{section.title}</h2>
              {section.type === 'text' && section.content && (
                <p className="text-gray-700 leading-relaxed">{section.content}</p>
              )}
              {(section.type === 'list' || section.type === 'achievements') && section.items.length > 0 && (
                <ul className="space-y-2">
                  {section.items.map((item, index) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Add other template renderings here...
    return (
      <div className="w-full bg-white p-8 text-sm leading-relaxed font-sans min-h-[297mm]">
        <div className="text-center text-gray-500">
          <p>Template preview will be rendered here</p>
          <p className="text-xs mt-2">Selected template: {selectedTemplate}</p>
        </div>
      </div>
    );
  };

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'projects', label: 'Projects', icon: Award },
    { id: 'custom', label: 'Custom Sections', icon: Plus }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Resume Builder</h1>
            <p className="text-gray-600 dark:text-dark-text-tertiary">Create your professional resume with our intuitive builder</p>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={resumeTitle}
              onChange={(e) => setResumeTitle(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
              placeholder="Resume Title"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center space-x-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
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
            <span>Edit</span>
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

        {/* Content */}
        <div className="p-8">
          {activeTab === 'edit' && (
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
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
                </nav>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Personal Information */}
                {activeSection === 'personal' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Personal Information</h2>
                    
                    {/* Photo Upload */}
                    <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">Profile Photo</h3>
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          {resumeData.personalInfo.photo ? (
                            <img 
                              src={resumeData.personalInfo.photo} 
                              alt="Profile" 
                              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-600">
                              <User className="w-12 h-12 text-gray-400 dark:text-gray-300" />
                            </div>
                          )}
                          <label className={`absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors cursor-pointer ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {uploadingPhoto ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handlePhotoUpload}
                              disabled={uploadingPhoto}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">Profile Photo</h4>
                          <p className="text-sm text-gray-600 dark:text-dark-text-tertiary mb-2">JPG, PNG, WebP, or GIF up to 5MB</p>
                          {resumeData.personalInfo.photo && (
                            <button 
                              onClick={handleRemovePhoto}
                              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                            >
                              Remove photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Full Name *</label>
                        <input
                          type="text"
                          value={resumeData.personalInfo.name}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, name: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Professional Title *</label>
                        <input
                          type="text"
                          value={resumeData.personalInfo.title}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, title: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Email *</label>
                        <input
                          type="email"
                          value={resumeData.personalInfo.email}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, email: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Phone</label>
                        <input
                          type="tel"
                          value={resumeData.personalInfo.phone}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, phone: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Location</label>
                        <input
                          type="text"
                          value={resumeData.personalInfo.location}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, location: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="New York, NY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">LinkedIn</label>
                        <input
                          type="url"
                          value={resumeData.personalInfo.linkedin}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, linkedin: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="linkedin.com/in/johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">GitHub</label>
                        <input
                          type="url"
                          value={resumeData.personalInfo.github}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, github: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                          placeholder="github.com/johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Website</label>
                        <input
                          type="url"
                          value={resumeData.personalInfo.website}
                          onChange={(e) => setResumeData(prev => ({
                            ...prev,
                            personalInfo: { ...prev.personalInfo, website: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
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
                        onClick={() => generateAIContent('summary', `Name: ${resumeData.personalInfo.name}, Title: ${resumeData.personalInfo.title}, Experience: ${resumeData.experience.items.length} positions`)}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
                      </button>
                    </div>
                    <textarea
                      value={resumeData.summary}
                      onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Write a compelling professional summary that highlights your key achievements, skills, and career objectives..."
                      className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    />
                  </div>
                )}

                {/* Work Experience */}
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
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                              placeholder="Start Date"
                              value={edu.startDate}
                              onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="End Date"
                              value={edu.endDate}
                              onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Location"
                              value={edu.location}
                              onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary md:col-span-2"
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
                        onClick={addSkillCategory}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Category</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {resumeData.skills.items.map((skill) => (
                        <div key={skill.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Skill Category</h3>
                            <button
                              onClick={() => removeSkillCategory(skill.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                              type="text"
                              placeholder="Category (e.g., Programming Languages)"
                              value={skill.category}
                              onChange={(e) => updateSkillCategory(skill.id, e.target.value, skill.skills.join(', '))}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Skills (comma-separated)"
                              value={skill.skills.join(', ')}
                              onChange={(e) => updateSkillCategory(skill.id, skill.category, e.target.value)}
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
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                              type="text"
                              placeholder="Technologies Used"
                              value={project.technologies}
                              onChange={(e) => updateProject(project.id, 'technologies', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="Start Date"
                              value={project.startDate}
                              onChange={(e) => updateProject(project.id, 'startDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="text"
                              placeholder="End Date"
                              value={project.endDate}
                              onChange={(e) => updateProject(project.id, 'endDate', e.target.value)}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <input
                              type="url"
                              placeholder="Project Link (optional)"
                              value={project.link}
                              onChange={(e) => updateProject(project.id, 'link', e.target.value)}
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

                {/* Custom Sections */}
                {activeSection === 'custom' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Custom Sections</h2>
                      <button
                        onClick={addCustomSection}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Section</span>
                      </button>
                    </div>
                    <div className="space-y-6">
                      {resumeData.customSections.map((section) => (
                        <div key={section.id} className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 border border-gray-200 dark:border-dark-border-primary">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">Custom Section</h3>
                            <button
                              onClick={() => removeCustomSection(section.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                              type="text"
                              placeholder="Section Title"
                              value={section.title}
                              onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                            <select
                              value={section.type}
                              onChange={(e) => updateCustomSection(section.id, { type: e.target.value as 'text' | 'list' | 'achievements' })}
                              className="px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            >
                              <option value="text">Text Content</option>
                              <option value="list">Bullet List</option>
                              <option value="achievements">Achievements</option>
                            </select>
                          </div>

                          {section.type === 'text' && (
                            <textarea
                              placeholder="Enter your content here..."
                              value={section.content}
                              onChange={(e) => updateCustomSection(section.id, { content: e.target.value })}
                              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                            />
                          )}

                          {(section.type === 'list' || section.type === 'achievements') && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Items</label>
                                <button
                                  onClick={() => addCustomSectionItem(section.id)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Item</span>
                                </button>
                              </div>
                              {section.items.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    placeholder={`${section.type === 'achievements' ? 'Achievement' : 'List item'} ${index + 1}`}
                                    value={item}
                                    onChange={(e) => updateCustomSectionItem(section.id, index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border-primary rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                                  />
                                  <button
                                    onClick={() => removeCustomSectionItem(section.id, index)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
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
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
              </div>
              
              <div className="bg-gray-100 dark:bg-dark-bg-tertiary p-8 rounded-lg">
                <div 
                  ref={previewRef}
                  className="max-w-4xl mx-auto bg-white shadow-lg"
                  style={{ aspectRatio: '8.5/11' }}
                >
                  {renderTemplatePreview()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;