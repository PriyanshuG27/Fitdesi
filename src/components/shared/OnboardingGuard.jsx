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
//  - If the profile was pre-hydrated from the SWR localStorage cache
//    (cacheHydrated === true), we skip the full-screen spinner entirely
//    and render the dashboard shell immediately. Firestore data arrives
//    and overwrites the cached state in the background.
//  - Shows spinner ONLY when auth is still resolving AND no cached profile exists.
//  - onboardingComplete === false + not on /onboarding/* → redirect /onboarding/type
//  - onboardingComplete === true  + on /onboarding/*    → redirect /home
//  - Otherwise: render children
export const OnboardingGuard = ({ children }) => {
  const { uid, profile, loading, cacheHydrated } = useAuthStore();
  const location = useLocation();

  const onOnboardingPath = location.pathname.startsWith('/onboarding');

  // Only block rendering with a spinner if we have NO cached data at all.
  // If cacheHydrated is true, we have a profile from localStorage and can
  // render immediately while the live Firestore data loads in the background.
  if (loading && !cacheHydrated) {
    return <AuthSpinner label="Loading Profile..." />;
  }

  // Edge case: auth resolved (loading=false) but profile is genuinely null
  // (e.g. a brand-new user whose Firestore doc hasn't been created yet).
  // Show spinner briefly while the doc is being written.
  if (!loading && uid && profile === null && !cacheHydrated) {
    return <AuthSpinner label="Setting up your profile..." />;
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
