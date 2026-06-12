import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { AuthSpinner } from './ProtectedRoute';

// ─── OnboardingGuard ──────────────────────────────────────────────────────────
// Must be placed INSIDE ProtectedRoute (user is guaranteed non-null here).
//
// Logic:
//  - Reads onboardingComplete from profile already in useAuthStore
//    (hydrated by App.jsx's onSnapshot — zero extra Firestore reads).
//  - Shows spinner while profile is loading (null).
//  - onboardingComplete === false + not on /onboarding/* → redirect /onboarding/type
//  - onboardingComplete === true  + on /onboarding/*    → redirect /home
//  - Otherwise: render children
export const OnboardingGuard = ({ children }) => {
  const { uid, profile, loading } = useAuthStore();
  const location = useLocation();

  const onOnboardingPath = location.pathname.startsWith('/onboarding');

  // Show spinner while auth or profile is still loading
  if (loading || (uid && profile === null)) {
    return <AuthSpinner label="Loading Profile..." />;
  }

  const onboardingComplete = profile?.onboardingComplete === true;
  const onboardingSkipped = profile?.onboardingSkipped === true;

  // Onboarding incomplete → force to onboarding (unless already there)
  if (!onboardingComplete && !onOnboardingPath) {
    return <Navigate to="/onboarding/type" replace />;
  }

  // Onboarding complete (and NOT skipped) → don't let them re-enter onboarding flow
  if (onboardingComplete && !onboardingSkipped && onOnboardingPath) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default OnboardingGuard;
