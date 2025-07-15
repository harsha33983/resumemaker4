import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import ResumeBuilder from './components/ResumeBuilder';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import Templates from './components/Templates';
import Pricing from './components/Pricing';
import Settings from './components/Settings';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import ProtectedRoute from './components/ProtectedRoute';
import AuthModal from './components/Auth/AuthModal';
import NLPResumeGenerator from './components/NLPResumeGenerator';

type View = 'home' | 'dashboard' | 'builder' | 'analyzer' | 'templates' | 'pricing' | 'settings' | 'cover-letters' | 'nlp-generator';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, isAuthenticated, loading } = useAuth();

  // All hooks must be called before any conditional returns
  // Redirect authenticated users away from home
  React.useEffect(() => {
    if (isAuthenticated && currentView === 'home') {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, currentView]);

  const handleNavigation = (view: View) => {
    // Redirect to dashboard if user tries to access home while authenticated
    if (view === 'home' && isAuthenticated) {
      setCurrentView('dashboard');
    } else {
      setCurrentView(view);
    }
  };

  const handleAuthRequest = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setCurrentView('dashboard');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-bg-primary dark:via-dark-bg-secondary dark:to-dark-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 dark:text-dark-text-tertiary">Loading ResuMaster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-bg-primary dark:via-dark-bg-secondary dark:to-dark-bg-primary flex flex-col">
      <Header 
        onNavigate={handleNavigation} 
        currentView={currentView}
      />
      
      <main className="pt-16 flex-1">
        {currentView === 'home' && !isAuthenticated && (
          <Hero onNavigate={handleNavigation} onAuthRequest={handleAuthRequest} />
        )}
        {currentView === 'dashboard' && (
          <ProtectedRoute>
            <Dashboard onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
        {currentView === 'builder' && (
          <ProtectedRoute>
            <ResumeBuilder onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
        {currentView === 'analyzer' && (
          <ResumeAnalyzer onNavigate={handleNavigation} />
        )}
        {currentView === 'templates' && (
          <Templates onNavigate={handleNavigation} />
        )}
        {currentView === 'pricing' && (
          <Pricing onNavigate={handleNavigation} />
        )}
        {currentView === 'settings' && (
          <ProtectedRoute>
            <Settings onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
        {currentView === 'cover-letters' && (
          <ProtectedRoute>
            <CoverLetterGenerator onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
        {currentView === 'nlp-generator' && (
          <ProtectedRoute>
            <NLPResumeGenerator onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
        
        {/* Show dashboard for authenticated users who somehow end up on home */}
        {currentView === 'home' && isAuthenticated && (
          <ProtectedRoute>
            <Dashboard onNavigate={handleNavigation} />
          </ProtectedRoute>
        )}
      </main>

      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
}

export default App;