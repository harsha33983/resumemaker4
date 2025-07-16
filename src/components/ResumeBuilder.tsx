import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Eye, Plus, Trash2, Upload, FileText, Loader2, Sparkles, ArrowLeft, Copy, Edit3, User, Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar, GraduationCap, Briefcase, Award, Code, Star, ChevronDown, ChevronUp, Palette, Layout, Type, Image, Settings, Zap, Target, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { GeminiService } from '../lib/gemini';
import { PDFGenerator } from '../lib/pdfGenerator';

type View = 'home' | 'dashboard' | 'builder' | 'analyzer' | 'templates' | 'pricing' | 'settings';

interface ResumeBuilderProps {
  onNavigate: (view: View) => void;
}

interface ResumeSection {
  id: string;
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'custom';
  title: string;
  content: any;
  isVisible: boolean;
  order: number;
}

interface ResumeData {
  id?: string;
  title: string;
  template: string;
  sections: ResumeSection[];
  styling: {
    primaryColor: string;
    fontFamily: string;
    fontSize: string;
    spacing: string;
    layout: 'single' | 'two-column';
  };
}

interface TemplateStyle {
  id: string;
  name: string;
  primaryColor: string;
  layout: 'single' | 'two-column';
  fontFamily: string;
  preview: string;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'build' | 'preview' | 'settings'>('build');
  const [resumeData, setResumeData] = useState<ResumeData>({
    title: 'My Resume',
    template: 'modern-blue',
    sections: [],
    styling: {
      primaryColor: '#3B82F6',
      fontFamily: 'Inter',
      fontSize: 'medium',
      spacing: 'normal',
      layout: 'single'
    }
  });
  const [selectedSection, setSelectedSection] = useState<string>('header');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['header']));
  const previewRef = useRef<HTMLDivElement>(null);
  const geminiService = new GeminiService();

  const templates: TemplateStyle[] = [
    { id: 'modern-blue', name: 'Modern Blue', primaryColor: '#3B82F6', layout: 'single', fontFamily: 'Inter', preview: 'modern' },
    { id: 'classic-navy', name: 'Classic Navy', primaryColor: '#1E3A8A', layout: 'single', fontFamily: 'Georgia', preview: 'classic' },
    { id: 'creative-purple', name: 'Creative Purple', primaryColor: '#7C3AED', layout: 'two-column', fontFamily: 'Poppins', preview: 'creative' },
    { id: 'minimal-gray', name: 'Minimal Gray', primaryColor: '#6B7280', layout: 'single', fontFamily: 'Inter', preview: 'minimal' },
    { id: 'professional-green', name: 'Professional Green', primaryColor: '#059669', layout: 'single', fontFamily: 'Inter', preview: 'professional' },
    { id: 'elegant-burgundy', name: 'Elegant Burgundy', primaryColor: '#991B1B', layout: 'single', fontFamily: 'Playfair Display', preview: 'elegant' }
  ];

  useEffect(() => {
    initializeResume();
  }, []);

  const initializeResume = async () => {
    setIsLoading(true);
    try {
      // Check if we're editing an existing resume
      const editingResumeId = localStorage.getItem('editingResumeId');
      if (editingResumeId && user) {
        await loadExistingResume(editingResumeId);
      } else {
        // Check for selected template
        const selectedTemplateId = localStorage.getItem('selectedTemplateId');
        if (selectedTemplateId) {
          const template = templates.find(t => t.id === selectedTemplateId);
          if (template) {
            setResumeData(prev => ({
              ...prev,
              template: template.id,
              styling: {
                ...prev.styling,
                primaryColor: template.primaryColor,
                fontFamily: template.fontFamily,
                layout: template.layout
              }
            }));
          }
          localStorage.removeItem('selectedTemplateId');
        }
        
        // Initialize with default sections
        initializeDefaultSections();
      }
    } catch (error) {
      console.error('Error initializing resume:', error);
      setError('Failed to initialize resume');
      initializeDefaultSections();
    } finally {
      setIsLoading(false);
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
        // Convert database format to component format
        const sections: ResumeSection[] = [
          {
            id: 'header',
            type: 'header',
            title: 'Personal Information',
            content: data.personal_info || getDefaultSectionContent('header'),
            isVisible: true,
            order: 0
          },
          {
            id: 'summary',
            type: 'summary',
            title: 'Professional Summary',
            content: { text: data.summary || '' },
            isVisible: !!data.summary,
            order: 1
          },
          {
            id: 'experience',
            type: 'experience',
            title: 'Work Experience',
            content: data.experience || getDefaultSectionContent('experience'),
            isVisible: true,
            order: 2
          },
          {
            id: 'education',
            type: 'education',
            title: 'Education',
            content: data.education || getDefaultSectionContent('education'),
            isVisible: true,
            order: 3
          },
          {
            id: 'skills',
            type: 'skills',
            title: 'Skills',
            content: data.skills || getDefaultSectionContent('skills'),
            isVisible: true,
            order: 4
          },
          {
            id: 'projects',
            type: 'projects',
            title: 'Projects',
            content: data.projects || getDefaultSectionContent('projects'),
            isVisible: !!(data.projects?.items?.length),
            order: 5
          }
        ];

        setResumeData({
          id: data.id,
          title: data.title,
          template: 'modern-blue', // Default template
          sections,
          styling: {
            primaryColor: '#3B82F6',
            fontFamily: 'Inter',
            fontSize: 'medium',
            spacing: 'normal',
            layout: 'single'
          }
        });
      }
      
      localStorage.removeItem('editingResumeId');
    } catch (error) {
      console.error('Error loading resume:', error);
      setError('Failed to load resume');
      initializeDefaultSections();
    }
  };

  const initializeDefaultSections = () => {
    const defaultSections: ResumeSection[] = [
      {
        id: 'header',
        type: 'header',
        title: 'Personal Information',
        content: getDefaultSectionContent('header'),
        isVisible: true,
        order: 0
      },
      {
        id: 'summary',
        type: 'summary',
        title: 'Professional Summary',
        content: { text: '' },
        isVisible: true,
        order: 1
      },
      {
        id: 'experience',
        type: 'experience',
        title: 'Work Experience',
        content: getDefaultSectionContent('experience'),
        isVisible: true,
        order: 2
      },
      {
        id: 'education',
        type: 'education',
        title: 'Education',
        content: getDefaultSectionContent('education'),
        isVisible: true,
        order: 3
      },
      {
        id: 'skills',
        type: 'skills',
        title: 'Skills',
        content: getDefaultSectionContent('skills'),
        isVisible: true,
        order: 4
      },
      {
        id: 'projects',
        type: 'projects',
        title: 'Projects',
        content: getDefaultSectionContent('projects'),
        isVisible: false,
        order: 5
      }
    ];

    setResumeData(prev => ({ ...prev, sections: defaultSections }));
  };

  const getDefaultSectionContent = (type: string) => {
    switch (type) {
      case 'header':
        return {
          name: '',
          title: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          github: '',
          website: ''
        };
      case 'experience':
        return {
          items: []
        };
      case 'education':
        return {
          items: []
        };
      case 'skills':
        return {
          items: []
        };
      case 'projects':
        return {
          items: []
        };
      default:
        return {};
    }
  };

  const updateSectionContent = (sectionId: string, content: any) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      )
    }));
  };

  const addExperienceItem = () => {
    const experienceSection = resumeData.sections.find(s => s.id === 'experience');
    if (experienceSection) {
      const newItem = {
        id: Date.now().toString(),
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      };
      
      const updatedContent = {
        ...experienceSection.content,
        items: [...(experienceSection.content.items || []), newItem]
      };
      
      updateSectionContent('experience', updatedContent);
    }
  };

  const removeExperienceItem = (itemId: string) => {
    const experienceSection = resumeData.sections.find(s => s.id === 'experience');
    if (experienceSection) {
      const updatedContent = {
        ...experienceSection.content,
        items: experienceSection.content.items.filter((item: any) => item.id !== itemId)
      };
      updateSectionContent('experience', updatedContent);
    }
  };

  const updateExperienceItem = (itemId: string, field: string, value: any) => {
    const experienceSection = resumeData.sections.find(s => s.id === 'experience');
    if (experienceSection) {
      const updatedContent = {
        ...experienceSection.content,
        items: experienceSection.content.items.map((item: any) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      };
      updateSectionContent('experience', updatedContent);
    }
  };

  const addEducationItem = () => {
    const educationSection = resumeData.sections.find(s => s.id === 'education');
    if (educationSection) {
      const newItem = {
        id: Date.now().toString(),
        institution: '',
        degree: '',
        field: '',
        location: '',
        startDate: '',
        endDate: '',
        gpa: '',
        honors: ''
      };
      
      const updatedContent = {
        ...educationSection.content,
        items: [...(educationSection.content.items || []), newItem]
      };
      
      updateSectionContent('education', updatedContent);
    }
  };

  const removeEducationItem = (itemId: string) => {
    const educationSection = resumeData.sections.find(s => s.id === 'education');
    if (educationSection) {
      const updatedContent = {
        ...educationSection.content,
        items: educationSection.content.items.filter((item: any) => item.id !== itemId)
      };
      updateSectionContent('education', updatedContent);
    }
  };

  const updateEducationItem = (itemId: string, field: string, value: any) => {
    const educationSection = resumeData.sections.find(s => s.id === 'education');
    if (educationSection) {
      const updatedContent = {
        ...educationSection.content,
        items: educationSection.content.items.map((item: any) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      };
      updateSectionContent('education', updatedContent);
    }
  };

  const addSkillCategory = () => {
    const skillsSection = resumeData.sections.find(s => s.id === 'skills');
    if (skillsSection) {
      const newItem = {
        id: Date.now().toString(),
        category: '',
        skills: []
      };
      
      const updatedContent = {
        ...skillsSection.content,
        items: [...(skillsSection.content.items || []), newItem]
      };
      
      updateSectionContent('skills', updatedContent);
    }
  };

  const removeSkillCategory = (itemId: string) => {
    const skillsSection = resumeData.sections.find(s => s.id === 'skills');
    if (skillsSection) {
      const updatedContent = {
        ...skillsSection.content,
        items: skillsSection.content.items.filter((item: any) => item.id !== itemId)
      };
      updateSectionContent('skills', updatedContent);
    }
  };

  const updateSkillCategory = (itemId: string, field: string, value: any) => {
    const skillsSection = resumeData.sections.find(s => s.id === 'skills');
    if (skillsSection) {
      const updatedContent = {
        ...skillsSection.content,
        items: skillsSection.content.items.map((item: any) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      };
      updateSectionContent('skills', updatedContent);
    }
  };

  const addProjectItem = () => {
    const projectsSection = resumeData.sections.find(s => s.id === 'projects');
    if (projectsSection) {
      const newItem = {
        id: Date.now().toString(),
        name: '',
        description: '',
        technologies: '',
        startDate: '',
        endDate: '',
        link: '',
        github: ''
      };
      
      const updatedContent = {
        ...projectsSection.content,
        items: [...(projectsSection.content.items || []), newItem]
      };
      
      updateSectionContent('projects', updatedContent);
      
      // Make projects section visible when adding first item
      if (!projectsSection.isVisible) {
        toggleSectionVisibility('projects');
      }
    }
  };

  const removeProjectItem = (itemId: string) => {
    const projectsSection = resumeData.sections.find(s => s.id === 'projects');
    if (projectsSection) {
      const updatedContent = {
        ...projectsSection.content,
        items: projectsSection.content.items.filter((item: any) => item.id !== itemId)
      };
      updateSectionContent('projects', updatedContent);
    }
  };

  const updateProjectItem = (itemId: string, field: string, value: any) => {
    const projectsSection = resumeData.sections.find(s => s.id === 'projects');
    if (projectsSection) {
      const updatedContent = {
        ...projectsSection.content,
        items: projectsSection.content.items.map((item: any) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      };
      updateSectionContent('projects', updatedContent);
    }
  };

  const toggleSectionVisibility = (sectionId: string) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, isVisible: !section.isVisible } : section
      )
    }));
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in to save your resume');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Convert sections to database format
      const headerSection = resumeData.sections.find(s => s.id === 'header');
      const summarySection = resumeData.sections.find(s => s.id === 'summary');
      const experienceSection = resumeData.sections.find(s => s.id === 'experience');
      const educationSection = resumeData.sections.find(s => s.id === 'education');
      const skillsSection = resumeData.sections.find(s => s.id === 'skills');
      const projectsSection = resumeData.sections.find(s => s.id === 'projects');

      const resumeDbData = {
        user_id: user.id,
        title: resumeData.title,
        personal_info: headerSection?.content || {},
        summary: summarySection?.content?.text || null,
        experience: experienceSection?.content || { items: [] },
        education: educationSection?.content || { items: [] },
        skills: skillsSection?.content || { items: [] },
        projects: projectsSection?.content || { items: [] },
        is_published: true
      };

      let result;
      if (resumeData.id) {
        // Update existing resume
        result = await supabase
          .from('resumes')
          .update(resumeDbData)
          .eq('id', resumeData.id)
          .select()
          .single();
      } else {
        // Create new resume
        result = await supabase
          .from('resumes')
          .insert(resumeDbData)
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
    if (!previewRef.current) {
      setError('Preview not available for download');
      return;
    }

    try {
      const filename = `${resumeData.title.replace(/\s+/g, '_')}.pdf`;
      await PDFGenerator.generateResumePDF(previewRef.current, filename);
    } catch (error) {
      setError('Failed to download resume. Please try again.');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a prompt for AI generation');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const content = await geminiService.generateResumeContent(selectedSection, aiPrompt);
      
      // Apply the generated content to the selected section
      const section = resumeData.sections.find(s => s.id === selectedSection);
      if (section) {
        let updatedContent;
        
        switch (selectedSection) {
          case 'summary':
            updatedContent = { text: content };
            break;
          case 'experience':
            // Parse AI content for experience
            updatedContent = section.content;
            if (section.content.items.length > 0) {
              const lastItem = section.content.items[section.content.items.length - 1];
              lastItem.description = content;
              updatedContent = { ...section.content };
            }
            break;
          default:
            updatedContent = { ...section.content, aiGenerated: content };
        }
        
        updateSectionContent(selectedSection, updatedContent);
      }
      
      setAiPrompt('');
      setShowAIAssistant(false);
    } catch (error: any) {
      setError(error.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectTemplate = (template: TemplateStyle) => {
    setResumeData(prev => ({
      ...prev,
      template: template.id,
      styling: {
        ...prev.styling,
        primaryColor: template.primaryColor,
        fontFamily: template.fontFamily,
        layout: template.layout
      }
    }));
    setShowTemplateSelector(false);
  };

  const renderSectionEditor = (section: ResumeSection) => {
    const isExpanded = expandedSections.has(section.id);
    
    return (
      <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => toggleSectionExpansion(section.id)}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={section.isVisible}
                onChange={() => toggleSectionVisibility(section.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSection(section.id);
                setShowAIAssistant(true);
              }}
              className="p-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4">
            {renderSectionContent(section)}
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = (section: ResumeSection) => {
    switch (section.type) {
      case 'header':
        return renderHeaderEditor(section);
      case 'summary':
        return renderSummaryEditor(section);
      case 'experience':
        return renderExperienceEditor(section);
      case 'education':
        return renderEducationEditor(section);
      case 'skills':
        return renderSkillsEditor(section);
      case 'projects':
        return renderProjectsEditor(section);
      default:
        return null;
    }
  };

  const renderHeaderEditor = (section: ResumeSection) => {
    const content = section.content;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={content.name || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Professional Title</label>
          <input
            type="text"
            value={content.title || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Software Engineer"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={content.email || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={content.phone || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={content.location || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="New York, NY"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
          <input
            type="url"
            value={content.linkedin || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, linkedin: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
          <input
            type="url"
            value={content.github || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, github: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://github.com/johndoe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url"
            value={content.website || ''}
            onChange={(e) => updateSectionContent(section.id, { ...content, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://johndoe.com"
          />
        </div>
      </div>
    );
  };

  const renderSummaryEditor = (section: ResumeSection) => {
    const content = section.content;
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Professional Summary</label>
        <textarea
          value={content.text || ''}
          onChange={(e) => updateSectionContent(section.id, { ...content, text: e.target.value })}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Write a compelling professional summary that highlights your key achievements, skills, and career objectives..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Tip: Keep it concise (2-3 sentences) and focus on your most relevant qualifications.
        </p>
      </div>
    );
  };

  const renderExperienceEditor = (section: ResumeSection) => {
    const content = section.content;
    const items = content.items || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Work Experience</h4>
          <button
            onClick={addExperienceItem}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Experience</span>
          </button>
        </div>
        
        {items.map((item: any, index: number) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Experience {index + 1}</h5>
              <button
                onClick={() => removeExperienceItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={item.company || ''}
                  onChange={(e) => updateExperienceItem(item.id, 'company', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Company Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={item.position || ''}
                  onChange={(e) => updateExperienceItem(item.id, 'position', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Job Title"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={item.location || ''}
                  onChange={(e) => updateExperienceItem(item.id, 'location', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State"
                />
              </div>
              
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="text"
                    value={item.startDate || ''}
                    onChange={(e) => updateExperienceItem(item.id, 'startDate', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MM/YYYY"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="text"
                    value={item.current ? 'Present' : item.endDate || ''}
                    onChange={(e) => updateExperienceItem(item.id, 'endDate', e.target.value)}
                    disabled={item.current}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="MM/YYYY"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`current-${item.id}`}
                checked={item.current || false}
                onChange={(e) => updateExperienceItem(item.id, 'current', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`current-${item.id}`} className="text-sm text-gray-700">
                I currently work here
              </label>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={item.description || ''}
                onChange={(e) => updateExperienceItem(item.id, 'description', e.target.value)}
                className="w-full h-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe your key responsibilities, achievements, and impact. Use bullet points and quantify results where possible."
              />
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No work experience added yet</p>
            <button
              onClick={addExperienceItem}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Add your first experience
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEducationEditor = (section: ResumeSection) => {
    const content = section.content;
    const items = content.items || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Education</h4>
          <button
            onClick={addEducationItem}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Education</span>
          </button>
        </div>
        
        {items.map((item: any, index: number) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Education {index + 1}</h5>
              <button
                onClick={() => removeEducationItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                <input
                  type="text"
                  value={item.institution || ''}
                  onChange={(e) => updateEducationItem(item.id, 'institution', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="University Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Degree</label>
                <input
                  type="text"
                  value={item.degree || ''}
                  onChange={(e) => updateEducationItem(item.id, 'degree', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bachelor of Science"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={item.field || ''}
                  onChange={(e) => updateEducationItem(item.id, 'field', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Computer Science"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={item.location || ''}
                  onChange={(e) => updateEducationItem(item.id, 'location', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={item.startDate || ''}
                  onChange={(e) => updateEducationItem(item.id, 'startDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/YYYY"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="text"
                  value={item.endDate || ''}
                  onChange={(e) => updateEducationItem(item.id, 'endDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/YYYY"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GPA (Optional)</label>
                <input
                  type="text"
                  value={item.gpa || ''}
                  onChange={(e) => updateEducationItem(item.id, 'gpa', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="3.8/4.0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Honors (Optional)</label>
                <input
                  type="text"
                  value={item.honors || ''}
                  onChange={(e) => updateEducationItem(item.id, 'honors', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Magna Cum Laude"
                />
              </div>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No education added yet</p>
            <button
              onClick={addEducationItem}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Add your education
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSkillsEditor = (section: ResumeSection) => {
    const content = section.content;
    const items = content.items || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Skills</h4>
          <button
            onClick={addSkillCategory}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
        
        {items.map((item: any, index: number) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Category {index + 1}</h5>
              <button
                onClick={() => removeSkillCategory(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={item.category || ''}
                  onChange={(e) => updateSkillCategory(item.id, 'category', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Programming Languages"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={(item.skills || []).join(', ')}
                  onChange={(e) => updateSkillCategory(item.id, 'skills', e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="JavaScript, Python, React, Node.js"
                />
              </div>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Code className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No skills added yet</p>
            <button
              onClick={addSkillCategory}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Add your skills
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderProjectsEditor = (section: ResumeSection) => {
    const content = section.content;
    const items = content.items || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Projects</h4>
          <button
            onClick={addProjectItem}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
        
        {items.map((item: any, index: number) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Project {index + 1}</h5>
              <button
                onClick={() => removeProjectItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={item.name || ''}
                  onChange={(e) => updateProjectItem(item.id, 'name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Project Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Technologies</label>
                <input
                  type="text"
                  value={item.technologies || ''}
                  onChange={(e) => updateProjectItem(item.id, 'technologies', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="React, Node.js, MongoDB"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={item.startDate || ''}
                  onChange={(e) => updateProjectItem(item.id, 'startDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/YYYY"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="text"
                  value={item.endDate || ''}
                  onChange={(e) => updateProjectItem(item.id, 'endDate', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/YYYY or Present"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Link</label>
                <input
                  type="url"
                  value={item.link || ''}
                  onChange={(e) => updateProjectItem(item.id, 'link', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://project-demo.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GitHub Link</label>
                <input
                  type="url"
                  value={item.github || ''}
                  onChange={(e) => updateProjectItem(item.id, 'github', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://github.com/username/project"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={item.description || ''}
                onChange={(e) => updateProjectItem(item.id, 'description', e.target.value)}
                className="w-full h-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the project, your role, key features, and impact..."
              />
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Code className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No projects added yet</p>
            <button
              onClick={addProjectItem}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Add your first project
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTemplatePreview = (template: TemplateStyle) => {
    const headerSection = resumeData.sections.find(s => s.id === 'header');
    const summarySection = resumeData.sections.find(s => s.id === 'summary');
    const experienceSection = resumeData.sections.find(s => s.id === 'experience');
    const educationSection = resumeData.sections.find(s => s.id === 'education');
    const skillsSection = resumeData.sections.find(s => s.id === 'skills');
    const projectsSection = resumeData.sections.find(s => s.id === 'projects');

    const headerContent = headerSection?.content || {};
    const summaryContent = summarySection?.content || {};
    const experienceItems = experienceSection?.content?.items || [];
    const educationItems = educationSection?.content?.items || [];
    const skillsItems = skillsSection?.content?.items || [];
    const projectsItems = projectsSection?.content?.items || [];

    return (
      <div 
        className="w-full bg-white text-gray-900 p-8 min-h-[11in] shadow-lg"
        style={{ 
          fontFamily: template.fontFamily,
          fontSize: resumeData.styling.fontSize === 'small' ? '14px' : resumeData.styling.fontSize === 'large' ? '18px' : '16px'
        }}
      >
        {/* Header */}
        {headerSection?.isVisible && (
          <header className="mb-8 text-center border-b-2 pb-6" style={{ borderColor: template.primaryColor }}>
            <h1 className="text-4xl font-bold mb-2" style={{ color: template.primaryColor }}>
              {headerContent.name || 'Your Name'}
            </h1>
            <h2 className="text-xl text-gray-600 mb-4">
              {headerContent.title || 'Professional Title'}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-600">
              {headerContent.email && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>{headerContent.email}</span>
                </div>
              )}
              {headerContent.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>{headerContent.phone}</span>
                </div>
              )}
              {headerContent.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{headerContent.location}</span>
                </div>
              )}
              {headerContent.linkedin && (
                <div className="flex items-center space-x-1">
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
              )}
              {headerContent.github && (
                <div className="flex items-center space-x-1">
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </div>
              )}
              {headerContent.website && (
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Professional Summary */}
        {summarySection?.isVisible && summaryContent.text && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-3 pb-2 border-b" style={{ color: template.primaryColor, borderColor: template.primaryColor }}>
              Professional Summary
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {summaryContent.text}
            </p>
          </section>
        )}

        {/* Work Experience */}
        {experienceSection?.isVisible && experienceItems.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: template.primaryColor, borderColor: template.primaryColor }}>
              Professional Experience
            </h3>
            <div className="space-y-6">
              {experienceItems.map((item: any) => (
                <div key={item.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{item.position || 'Position Title'}</h4>
                      <p className="text-gray-700 font-medium">{item.company || 'Company Name'}</p>
                      {item.location && <p className="text-gray-600 text-sm">{item.location}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{item.startDate || 'Start'} - {item.current ? 'Present' : item.endDate || 'End'}</p>
                    </div>
                  </div>
                  {item.description && (
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {educationSection?.isVisible && educationItems.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: template.primaryColor, borderColor: template.primaryColor }}>
              Education
            </h3>
            <div className="space-y-4">
              {educationItems.map((item: any) => (
                <div key={item.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {item.degree || 'Degree'} {item.field && `in ${item.field}`}
                      </h4>
                      <p className="text-gray-700 font-medium">{item.institution || 'Institution'}</p>
                      {item.location && <p className="text-gray-600 text-sm">{item.location}</p>}
                      {item.honors && <p className="text-gray-600 text-sm italic">{item.honors}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{item.startDate || 'Start'} - {item.endDate || 'End'}</p>
                      {item.gpa && <p>GPA: {item.gpa}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skillsSection?.isVisible && skillsItems.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: template.primaryColor, borderColor: template.primaryColor }}>
              Skills
            </h3>
            <div className="space-y-3">
              {skillsItems.map((item: any) => (
                <div key={item.id}>
                  <h4 className="font-semibold text-gray-900 mb-1">{item.category || 'Skill Category'}</h4>
                  <p className="text-gray-700">
                    {(item.skills || []).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projectsSection?.isVisible && projectsItems.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: template.primaryColor, borderColor: template.primaryColor }}>
              Projects
            </h3>
            <div className="space-y-6">
              {projectsItems.map((item: any) => (
                <div key={item.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{item.name || 'Project Name'}</h4>
                      {item.technologies && <p className="text-gray-600 text-sm">{item.technologies}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {(item.startDate || item.endDate) && (
                        <p>{item.startDate || 'Start'} - {item.endDate || 'End'}</p>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-gray-700 leading-relaxed mb-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex space-x-4 text-sm">
                    {item.link && (
                      <a href={item.link} className="text-blue-600 hover:underline">
                        Live Demo
                      </a>
                    )}
                    {item.github && (
                      <a href={item.github} className="text-blue-600 hover:underline">
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading resume builder...</p>
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
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resume Builder</h1>
            <p className="text-gray-600">Create and customize your professional resume</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={resumeData.title}
            onChange={(e) => setResumeData(prev => ({ ...prev, title: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Resume Title"
          />
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Template</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'build', label: 'Build', icon: Edit3 },
            { id: 'preview', label: 'Preview', icon: Eye },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Build Tab */}
          {activeTab === 'build' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Editor */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Resume Sections</h2>
                  <button
                    onClick={() => setShowAIAssistant(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Assistant</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {resumeData.sections
                    .sort((a, b) => a.order - b.order)
                    .map(section => renderSectionEditor(section))}
                </div>
              </div>

              {/* Live Preview */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Live Preview</span>
                  </h3>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ aspectRatio: '8.5/11' }}>
                    <div className="transform scale-50 origin-top-left w-[200%] h-[200%]">
                      {renderTemplatePreview(templates.find(t => t.id === resumeData.template) || templates[0])}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Resume Preview</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-100 p-8 rounded-lg">
                <div ref={previewRef} className="bg-white rounded-lg shadow-xl mx-auto" style={{ width: '8.5in', minHeight: '11in' }}>
                  {renderTemplatePreview(templates.find(t => t.id === resumeData.template) || templates[0])}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Resume Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Template Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Template</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {templates.slice(0, 4).map(template => (
                        <button
                          key={template.id}
                          onClick={() => selectTemplate(template)}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            resumeData.template === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <Layout className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="font-medium text-sm">{template.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Styling Options */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                      <div className="flex space-x-2">
                        {['#3B82F6', '#059669', '#7C3AED', '#DC2626', '#F59E0B', '#6B7280'].map(color => (
                          <button
                            key={color}
                            onClick={() => setResumeData(prev => ({
                              ...prev,
                              styling: { ...prev.styling, primaryColor: color }
                            }))}
                            className={`w-8 h-8 rounded-full border-2 ${
                              resumeData.styling.primaryColor === color ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                      <select
                        value={resumeData.styling.fontFamily}
                        onChange={(e) => setResumeData(prev => ({
                          ...prev,
                          styling: { ...prev.styling, fontFamily: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Playfair Display">Playfair Display</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                      <select
                        value={resumeData.styling.fontSize}
                        onChange={(e) => setResumeData(prev => ({
                          ...prev,
                          styling: { ...prev.styling, fontSize: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                      <select
                        value={resumeData.styling.layout}
                        onChange={(e) => setResumeData(prev => ({
                          ...prev,
                          styling: { ...prev.styling, layout: e.target.value as 'single' | 'two-column' }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="single">Single Column</option>
                        <option value="two-column">Two Column</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Choose Template</h3>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      resumeData.template === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-48 bg-gray-100 rounded mb-4 flex items-center justify-center">
                      <Layout className="w-12 h-12 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.layout} layout</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">AI Assistant</h3>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generate content for: {resumeData.sections.find(s => s.id === selectedSection)?.title}
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                >
                  {resumeData.sections.map(section => (
                    <option key={section.id} value={section.id}>{section.title}</option>
                  ))}
                </select>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to generate. For example: 'Write a professional summary for a software engineer with 5 years of experience in React and Node.js'"
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700 text-sm font-medium mt-1"
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