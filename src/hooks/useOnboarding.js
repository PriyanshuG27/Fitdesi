import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';

const VALID_USER_TYPES = ['Comeback', 'Beginner', 'Consistent', 'Challenger'];
const VALID_GOALS = ['Fat Loss', 'Muscle Gain', 'Strength', 'Endurance', 'General Fitness'];
const VALID_DIET_TYPES = ['Non-veg', 'Eggetarian', 'Vegetarian', 'Vegan'];

const VALID_EQUIPMENT = [
  'Flat Bench', 'Incline Bench', 'Decline Bench', 'Chest Press Machine', 'Pec Deck', 'Dip Bars',
  'Pull-up Bar', 'Lat Pulldown', 'Seated Row', 'Assisted Pull-up Machine', 'Cable Machine',
  'Squat Rack', 'Leg Press', 'Hack Squat', 'Leg Extension', 'Leg Curl', 'Smith Machine',
  'Shoulder Press Machine', 'Preacher Curl Bench', 'EZ Bar',
  'Barbell', 'Dumbbells', 'Kettlebell', 'Trap Bar', 'Medicine Ball', 'Weight Plates',
  'Ab Wheel', 'Resistance Bands', 'TRX / Suspension', 'Battle Ropes', 'Parallettes', 'Gymnastic Rings', 'Power Rack',
  'Treadmill', 'Stationary Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Jump Rope',
  'Foam Roller'
];

export const useOnboarding = () => {
  const { uid, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);

  const syncProfile = async () => {
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        setProfile(snap.data());
      }
    } catch (err) {
      console.error('[Onboarding] Error syncing profile:', err);
    }
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [state, setState] = useState({
    userType: null,
    age: '',
    gender: null,
    heightCm: '',
    weightKg: '',
    goal: null,
    equipmentList: [],
    workoutFrequency: null,
    sessionDuration: null,
    dietType: null,
    currentSupplements: [],
    medicalFlags: [],
  });

  const updateState = (key, val) => {
    setState(s => ({ ...s, [key]: val }));
  };

  const setUserType = async (type) => {
    if (!VALID_USER_TYPES.includes(type)) return;
    updateState('userType', type);
    setError(null);
    if (!uid) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { userType: type });
      setCurrentStep(1);
    } catch (err) {
      console.error('[Onboarding] Error saving userType:', err);
      setError('Failed to save user type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEquipment = (item) => {
    if (!VALID_EQUIPMENT.includes(item)) return;
    setState(s => {
      const list = s.equipmentList.includes(item)
        ? s.equipmentList.filter(x => x !== item)
        : [...s.equipmentList, item];
      return { ...s, equipmentList: list };
    });
  };

  const selectAllEquipment = () => {
    setState(s => ({ ...s, equipmentList: [...VALID_EQUIPMENT] }));
  };

  const toggleMedicalFlag = (flag) => {
    setState(s => {
      const list = s.medicalFlags.includes(flag)
        ? s.medicalFlags.filter(x => x !== flag)
        : [...s.medicalFlags, flag];
      return { ...s, medicalFlags: list };
    });
  };

  const toggleSupplement = (supplement) => {
    setState(s => {
      const list = s.currentSupplements.includes(supplement)
        ? s.currentSupplements.filter(x => x !== supplement)
        : [...s.currentSupplements, supplement];
      return { ...s, currentSupplements: list };
    });
  };

  // Helper validation for saving steps
  const validateStepData = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return state.userType && VALID_USER_TYPES.includes(state.userType);
      case 1:
        return state.gender && state.age && state.heightCm && state.weightKg;
      case 2:
        return state.goal && VALID_GOALS.includes(state.goal);
      case 3:
        return state.workoutFrequency && state.sessionDuration;
      case 4:
        return state.dietType && VALID_DIET_TYPES.includes(state.dietType);
      default:
        return true;
    }
  };

  const advance = async () => {
    if (!uid) return;
    setError(null);

    if (!validateStepData(currentStep)) {
      setError('Please fill out all required fields for this step.');
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', uid);
      let payload = {};

      if (currentStep === 0) {
        payload = { userType: state.userType };
      } else if (currentStep === 1) {
        payload = {
          gender: state.gender,
          age: Number(state.age),
          heightCm: Number(state.heightCm),
          weightKg: Number(state.weightKg),
        };
      } else if (currentStep === 2) {
        payload = { goal: state.goal };
      } else if (currentStep === 3) {
        // Filter out any invalid equipment items before write
        const filteredEquipment = state.equipmentList.filter(item => VALID_EQUIPMENT.includes(item));
        payload = {
          workoutFrequency: state.workoutFrequency,
          sessionDuration: state.sessionDuration,
          equipmentList: filteredEquipment,
        };
      } else if (currentStep === 4) {
        payload = {
          dietType: state.dietType,
          currentSupplements: state.currentSupplements,
        };
      } else if (currentStep === 5) {
        payload = {
          medicalFlags: state.medicalFlags,
          onboardingComplete: true,
        };
      }

      await updateDoc(userRef, payload);

      if (currentStep < 5) {
        setCurrentStep(s => s + 1);
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      console.error(`[Onboarding] Error saving step ${currentStep}:`, err);
      setError('Failed to save data. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (!uid) return;
    setError(null);
    setSaving(true);
    try {
      const filteredEquipment = state.equipmentList.filter(item => VALID_EQUIPMENT.includes(item));
      await updateDoc(doc(db, 'users', uid), {
        userType: state.userType,
        gender: state.gender,
        age: state.age ? Number(state.age) : null,
        heightCm: state.heightCm ? Number(state.heightCm) : null,
        weightKg: state.weightKg ? Number(state.weightKg) : null,
        goal: state.goal,
        workoutFrequency: state.workoutFrequency,
        sessionDuration: state.sessionDuration,
        equipmentList: filteredEquipment,
        dietType: state.dietType,
        currentSupplements: state.currentSupplements,
        medicalFlags: state.medicalFlags,
        onboardingComplete: true,
      });
      await syncProfile();
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('[Onboarding] Error in skip:', err);
      setError('Failed to skip onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    if (!uid) return;
    setError(null);
    setSaving(true);
    try {
      const filteredEquipment = state.equipmentList.filter(item => VALID_EQUIPMENT.includes(item));
      await updateDoc(doc(db, 'users', uid), {
        userType: state.userType,
        gender: state.gender,
        age: Number(state.age),
        heightCm: Number(state.heightCm),
        weightKg: Number(state.weightKg),
        goal: state.goal,
        workoutFrequency: state.workoutFrequency,
        sessionDuration: state.sessionDuration,
        equipmentList: filteredEquipment,
        dietType: state.dietType,
        currentSupplements: state.currentSupplements,
        medicalFlags: state.medicalFlags,
        onboardingComplete: true,
      });
      await syncProfile();
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('[Onboarding] Error completing onboarding:', err);
      setError('Failed to save onboarding selections. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return {
    state,
    currentStep,
    setCurrentStep,
    saving,
    error,
    setError,
    updateState,
    setUserType,
    toggleEquipment,
    selectAllEquipment,
    toggleMedicalFlag,
    toggleSupplement,
    advance,
    skip,
    complete,
  };
};
