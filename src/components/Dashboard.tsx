import React, { useState, useEffect } from 'react';
import { Plus, FileText, BarChart3, Download, Clock, Star, ArrowRight, Loader2, Edit3, Trash2, Eye, Copy, Layout } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PDFGenerator } from '../lib/pdfGenerator';
import { Brain } from 'lucide-react';

type View = 'home' | 'dashboard' | 'builder' | 'analyzer' | 'templates' | 'pricing' | 'cover-letters' | 'nlp-generator';

interface DashboardProps {
  onNavigate: (view: View) => void;
}

interface Resume {
  id: string;
  title: string;
  updated_at: string;
  is_published: boolean;
  personal_info?: any;
  summary?: string;
  experience?: any;
  education?: any;
  skills?: any;
  projects?: any;
  custom_sections?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [stats, setStats] = useState({
    totalResumes: 0,
    avgAtsScore: 85, // Fixed ATS score
    totalDownloads: 0
  });

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setResumes(data || []);
      
      // Calculate stats
      const totalResumes = data?.length || 0;
      const avgAtsScore = totalResumes > 0 ? 85 : 0;
      
      setStats({
        totalResumes,
        avgAtsScore,
        totalDownloads: totalResumes * 3 // Mock data
      });
    } catch (error) {
      console.error('Error fetching resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditResume = (resumeId: string) => {
    // Store the resume ID for editing
    localStorage.setItem('editingResumeId', resumeId);
    onNavigate('builder');
  };

  const handleDownloadResume = async (resume: Resume) => {
    setActionLoading(prev => ({ ...prev, [`download-${resume.id}`]: true }));
    
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
      const resumeHTML = generateResumeHTML(resume);
      tempDiv.innerHTML = resumeHTML;
      
      document.body.appendChild(tempDiv);
      
      // Generate PDF
      await PDFGenerator.generateResumePDF(tempDiv, `${resume.title.replace(/\s+/g, '_')}.pdf`);
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      // Update download count (mock)
      setStats(prev => ({ ...prev, totalDownloads: prev.totalDownloads + 1 }));
      
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [`download-${resume.id}`]: false }));
    }
  };

  const handleDuplicateResume = async (resume: Resume) => {
    setActionLoading(prev => ({ ...prev, [`duplicate-${resume.id}`]: true }));
    
    try {
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user?.id,
          title: `${resume.title} (Copy)`,
          personal_info: resume.personal_info,
          summary: resume.summary,
          experience: resume.experience,
          education: resume.education,
          skills: resume.skills,
          projects: resume.projects,
          custom_sections: resume.custom_sections,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the resumes list
      await fetchResumes();
      
      alert('Resume duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating resume:', error);
      alert('Failed to duplicate resume. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [`duplicate-${resume.id}`]: false }));
    }
  };

  const handleDeleteResume = async (resume: Resume) => {
    if (!confirm(`Are you sure you want to delete "${resume.title}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [`delete-${resume.id}`]: true }));
    
    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resume.id);

      if (error) throw error;

      // Refresh the resumes list
      await fetchResumes();
      
      alert('Resume deleted successfully!');
    } catch (error) {
      console.error('Error deleting resume:', error);
      alert('Failed to delete resume. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${resume.id}`]: false }));
    }
  };

  const handleAnalyzeResume = (resume: Resume) => {
    // Store resume data for analysis
    const resumeText = generateResumeText(resume);
    localStorage.setItem('resumeForAnalysis', resumeText);
    onNavigate('analyzer');
  };

  const generateResumeHTML = (resume: Resume): string => {
    const personalInfo = resume.personal_info || {};
    const experience = resume.experience?.items || [];
    const education = resume.education?.items || [];
    const skills = resume.skills?.items || [];

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <header style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${personalInfo.name || 'Your Name'}</h1>
          <h2 style="margin: 5px 0; font-size: 18px; color: #666;">${personalInfo.title || 'Professional Title'}</h2>
          <div style="margin-top: 10px; font-size: 14px;">
            ${personalInfo.email ? `<span>${personalInfo.email}</span> | ` : ''}
            ${personalInfo.phone ? `<span>${personalInfo.phone}</span> | ` : ''}
            ${personalInfo.location ? `<span>${personalInfo.location}</span>` : ''}
          </div>
          ${personalInfo.linkedin || personalInfo.website ? `
            <div style="margin-top: 5px; font-size: 14px;">
              ${personalInfo.linkedin ? `<span>${personalInfo.linkedin}</span>` : ''}
              ${personalInfo.linkedin && personalInfo.website ? ' | ' : ''}
              ${personalInfo.website ? `<span>${personalInfo.website}</span>` : ''}
            </div>
          ` : ''}
        </header>

        ${resume.summary ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Professional Summary</h3>
            <p style="margin: 0; text-align: justify;">${resume.summary}</p>
          </section>
        ` : ''}

        ${experience.length > 0 ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Professional Experience</h3>
            ${experience.map((exp: any) => `
              <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                  <div>
                    <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${exp.position || 'Position'}</h4>
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #666;">${exp.company || 'Company'}</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; font-size: 12px; color: #666;">${exp.startDate || ''} - ${exp.endDate || 'Present'}</p>
                    ${exp.location ? `<p style="margin: 0; font-size: 12px; color: #666;">${exp.location}</p>` : ''}
                  </div>
                </div>
                ${exp.description ? `<div style="font-size: 13px; margin-top: 8px;">${exp.description.replace(/\n/g, '<br>')}</div>` : ''}
              </div>
            `).join('')}
          </section>
        ` : ''}

        ${education.length > 0 ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Education</h3>
            ${education.map((edu: any) => `
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h4 style="margin: 0; font-size: 14px; font-weight: bold;">${edu.degree || 'Degree'} ${edu.field ? `in ${edu.field}` : ''}</h4>
                    <p style="margin: 0; font-size: 14px; color: #666;">${edu.institution || 'Institution'}</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; font-size: 12px; color: #666;">${edu.startDate || ''} - ${edu.endDate || 'Present'}</p>
                    ${edu.gpa ? `<p style="margin: 0; font-size: 12px; color: #666;">GPA: ${edu.gpa}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </section>
        ` : ''}

        ${skills.length > 0 ? `
          <section style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Skills</h3>
            ${skills.map((skillGroup: any) => `
              <div style="margin-bottom: 10px;">
                <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold;">${skillGroup.category || 'Skills'}</h4>
                <p style="margin: 0; font-size: 13px;">${(skillGroup.skills || []).join(', ')}</p>
              </div>
            `).join('')}
          </section>
        ` : ''}
      </div>
    `;
  };

  const generateResumeText = (resume: Resume): string => {
    const personalInfo = resume.personal_info || {};
    const experience = resume.experience?.items || [];
    const education = resume.education?.items || [];
    const skills = resume.skills?.items || [];

    let text = `${personalInfo.name || 'Your Name'}\n`;
    text += `${personalInfo.title || 'Professional Title'}\n`;
    text += `${personalInfo.email || ''} | ${personalInfo.phone || ''} | ${personalInfo.location || ''}\n\n`;

    if (resume.summary) {
      text += `PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
    }

    if (experience.length > 0) {
      text += `PROFESSIONAL EXPERIENCE\n`;
      experience.forEach((exp: any) => {
        text += `${exp.position || 'Position'} at ${exp.company || 'Company'}\n`;
        text += `${exp.startDate || ''} - ${exp.endDate || 'Present'}\n`;
        if (exp.description) {
          text += `${exp.description}\n`;
        }
        text += '\n';
      });
    }

    if (education.length > 0) {
      text += `EDUCATION\n`;
      education.forEach((edu: any) => {
        text += `${edu.degree || 'Degree'} ${edu.field ? `in ${edu.field}` : ''}\n`;
        text += `${edu.institution || 'Institution'}\n`;
        text += `${edu.startDate || ''} - ${edu.endDate || 'Present'}\n\n`;
      });
    }

    if (skills.length > 0) {
      text += `SKILLS\n`;
      skills.forEach((skillGroup: any) => {
        text += `${skillGroup.category || 'Skills'}: ${(skillGroup.skills || []).join(', ')}\n`;
      });
    }

    return text;
  };

  const quickActions = [
    {
      title: 'Create New Resume',
      description: 'Start with a template or from scratch',
      icon: Plus,
      action: () => onNavigate('builder'),
      color: 'from-blue-600 to-purple-600'
    },
    {
      title: 'NLP Resume Generator',
      description: 'Generate resume from job description using AI',
      icon: Brain,
      action: () => onNavigate('nlp-generator'),
      color: 'from-purple-600 to-pink-600'
    },
    {
      title: 'Generate Cover Letter',
      description: 'AI-powered cover letter generation',
      icon: FileText,
      action: () => onNavigate('cover-letters'),
      color: 'from-pink-600 to-red-600'
    },
    {
      title: 'Analyze Resume',
      description: 'Get ATS score and optimization tips',
      icon: BarChart3,
      action: () => onNavigate('analyzer'),
      color: 'from-green-600 to-emerald-600'
    },
    {
      title: 'Browse Templates',
      description: 'Explore our professional templates',
      icon: Layout,
      action: () => onNavigate('templates'),
      color: 'from-indigo-600 to-blue-600'
    }
  ];

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} weeks ago`;
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.user_metadata?.first_name) return user.user_metadata.first_name;
    return user.email?.split('@')[0] || 'User';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-dark-text-tertiary">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Welcome back, {getDisplayName()}!
        </h1>
        <p className="text-gray-600 dark:text-dark-text-tertiary">
          Continue building your professional presence with our tools
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-border-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-tertiary">Total Resumes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalResumes}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-border-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-tertiary">Avg ATS Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {stats.avgAtsScore > 0 ? `${stats.avgAtsScore}%` : 'N/A'}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-border-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-tertiary">Downloads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalDownloads}</p>
            </div>
            <Download className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-border-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-tertiary">Plan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Pro</p>
            </div>
            <Star className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group bg-white dark:bg-dark-bg-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-border-primary hover:shadow-xl transition-all transform hover:scale-105 text-left"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg mb-4 group-hover:shadow-lg transition-shadow`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                {action.title}
              </h3>
              <p className="text-gray-600 dark:text-dark-text-tertiary mb-4">
                {action.description}
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                <span className="text-sm font-medium">Get started</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Resumes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Your Resumes</h2>
          <button 
            onClick={() => onNavigate('builder')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Resume</span>
          </button>
        </div>
        
        {resumes.length === 0 ? (
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-gray-200 dark:border-dark-border-primary p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-dark-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No resumes yet</h3>
            <p className="text-gray-600 dark:text-dark-text-tertiary mb-6">Create your first resume to get started</p>
            <button 
              onClick={() => onNavigate('builder')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              Create Your First Resume
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-gray-200 dark:border-dark-border-primary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Resume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Last Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-bg-secondary divide-y divide-gray-200 dark:divide-dark-border-primary">
                  {resumes.map((resume) => (
                    <tr key={resume.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover-bg">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 dark:text-dark-text-muted mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                              {resume.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          resume.is_published 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {resume.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-dark-text-muted">
                          <Clock className="w-4 h-4 mr-1" />
                          {getTimeAgo(resume.updated_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditResume(resume.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Edit Resume"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleDownloadResume(resume)}
                            disabled={actionLoading[`download-${resume.id}`]}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {actionLoading[`download-${resume.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          
                          <button 
                            onClick={() => handleAnalyzeResume(resume)}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title="Analyze Resume"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleDuplicateResume(resume)}
                            disabled={actionLoading[`duplicate-${resume.id}`]}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                            title="Duplicate Resume"
                          >
                            {actionLoading[`duplicate-${resume.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteResume(resume)}
                            disabled={actionLoading[`delete-${resume.id}`]}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="Delete Resume"
                          >
                            {actionLoading[`delete-${resume.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;