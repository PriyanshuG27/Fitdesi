import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OnboardingLayout = ({ step, totalSteps, onBack, onSkip, children }) => {
  return (
    <div className="relative min-h-screen bg-bg-base text-text-primary flex flex-col items-center justify-between font-body selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      
      {/* Top Header Navigation Bar */}
      <header className="w-full max-w-lg mx-auto px-6 pt-8 pb-4 flex items-center justify-between z-10 shrink-0">
        {/* Back Button */}
        <div className="w-12 h-12 flex items-center justify-start">
          {step > 0 && (
            <button
              onClick={onBack}
              className="w-10 h-10 -ml-2 rounded-full border border-border bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-bright transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Go Back"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step 
                  ? 'w-6 bg-primary shadow-[0_0_8px_rgba(255,92,0,0.5)]' 
                  : i < step 
                    ? 'w-2 bg-primary/40' 
                    : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Skip Link */}
        <div className="w-20 flex items-center justify-end">
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition duration-150 uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/40 py-2 px-1"
            style={{ minHeight: '44px' }}
          >
            Skip
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-lg mx-auto px-6 py-4 flex-1 flex flex-col justify-start z-10 overflow-y-auto">
        <div className="w-full bg-bg-surface/40 border border-border/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-2xl flex flex-col justify-between flex-1 md:flex-initial">
          {children}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-lg mx-auto px-6 py-6 text-center text-[10px] text-text-muted font-mono uppercase tracking-widest z-10 shrink-0">
        FitDesi Baseline Config
      </footer>
    </div>
  );
};
