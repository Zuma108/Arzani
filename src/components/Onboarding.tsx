"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ThumbsUp, ThumbsDown, Camera, Smartphone, ScanFace, Activity, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0); // 0 = Landing, 1-12 = Onboarding Questions
  
  // Expanded State for user answers
  const [answers, setAnswers] = useState({
    gender: '',
    goal: '',
    split: '',
    experience: '',
    frequency: '',
    focusAreas: [] as string[],
    injuries: [] as string[],
    feedbackStyle: '',
    setupPref: '',
    triedApps: null as boolean | null,
    source: '',
    email: ''
  });

  const TOTAL_STEPS = 12;

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else onComplete();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const toggleArrayItem = (key: 'focusAreas' | 'injuries', value: string) => {
    setAnswers(prev => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [key]: [...current, value] };
      }
    });
  };

  // --- Header & Footer Templates ---

  const renderHeader = (title: string, subtitle: string) => (
    <div className="px-6 pt-14 pb-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={prevStep}
          className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-800" />
        </button>
        {/* Progress Bar (dynamically scaled) */}
        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            className="h-full bg-zinc-800"
          />
        </div>
      </div>
      <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-zinc-500 text-base leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );

  const renderFooter = (disabled: boolean, customText = "Continue") => (
    <div className="px-6 pb-10 pt-4 mt-auto">
      <button 
        onClick={nextStep}
        disabled={disabled}
        className={`w-full py-4 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 ${
          disabled ? 'bg-zinc-200 text-zinc-400' : 'btn-primary'
        }`}
      >
        {customText}
        {!disabled && customText === "Continue" && <ArrowLeft className="w-5 h-5 rotate-180" />}
      </button>
    </div>
  );

  // --- Screens ---

  const renderLanding = () => (
    <motion.div 
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white"
    >
      {/* Top half: Mockup style hero image placeholder */}
      <div className="flex-1 bg-[#f8f9fa] relative overflow-hidden flex flex-col pt-12">
         {/* Simple visualization of form tracking */}
         <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path fill="#000" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.5,-46.3C91.2,-33.5,97.6,-18,97,-2.8C96.4,12.4,88.8,27.3,77.7,39.1C66.6,50.9,52,59.6,37.3,66.8C22.6,74,-24.5,74.5,-40.5,68.2C-56.5,61.9,-70.5,48.8,-79.8,33C-89.1,17.2,-93.7,-1.3,-90.6,-18.4C-87.5,-35.5,-76.7,-51.2,-62.4,-58.8C-48.1,-66.4,-30.3,-65.9,-14.9,-65.7C0.5,-65.5,15.9,-65.7,30.6,-73.6L44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
         </div>
         <div className="mt-auto px-6 pb-8 relative z-10 flex gap-4 overflow-x-hidden">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 flex-1 min-w-[140px]">
               <span className="text-2xl font-bold">95<span className="text-sm">%</span></span>
               <p className="text-zinc-500 text-xs mt-1">Form Match</p>
               <div className="mt-3 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                 <ScanFace className="w-5 h-5 text-blue-500" />
               </div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 flex-1 min-w-[140px]">
               <span className="text-2xl font-bold">12<span className="text-sm font-medium ml-1">reps</span></span>
               <p className="text-zinc-500 text-xs mt-1">Consistent Pace</p>
               <div className="mt-3 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                 <Activity className="w-5 h-5 text-emerald-500" />
               </div>
            </div>
         </div>
      </div>

      <div className="px-8 pt-10 pb-12 flex flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 mb-8 leading-tight">
          Perfect form<br/>made easy
        </h1>
        <button 
          onClick={nextStep}
          className="w-full py-4 rounded-full btn-primary text-lg"
        >
          Get Started
        </button>
        <p className="mt-6 text-zinc-500 text-sm">
          Already have an account? <span className="text-black font-semibold underline underline-offset-4 decoration-2">Sign in</span>
        </p>
      </div>
    </motion.div>
  );

  const renderStep1 = () => (
    <motion.div 
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white"
    >
      {renderHeader("Choose your Gender", "This will be used to calibrate your biomechanics model.")}
      <div className="px-6 flex flex-col gap-4">
        {['Female', 'Male', 'Other'].map((option) => (
          <button
            key={option}
            onClick={() => setAnswers({ ...answers, gender: option })}
            className={`py-5 rounded-2xl w-full text-lg ${
              answers.gender === option 
                ? 'border-2 border-zinc-900 font-bold bg-white shadow-sm' 
                : 'btn-secondary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {renderFooter(!answers.gender)}
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      key="step2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Primary Fitness Goal", "What are you trying to achieve?")}
      <div className="px-6 flex flex-col gap-3">
        {[
          { id: 'Hypertrophy', desc: 'Building Muscle Mass' },
          { id: 'Strength', desc: 'Powerlifting / Heavy Lifts' },
          { id: 'Wellness', desc: 'General Fitness & Injury Prevention' },
          { id: 'Olympic', desc: 'Explosive Olympic Weightlifting' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAnswers({ ...answers, goal: item.id })}
            className={`py-5 px-6 rounded-2xl w-full text-left flex flex-col gap-1 ${
               answers.goal === item.id 
                 ? 'border-2 border-zinc-900 bg-white shadow-sm' 
                 : 'btn-secondary text-zinc-800'
             }`}
          >
            <span className="font-bold text-lg">{item.id}</span>
            <span className={`text-sm ${answers.goal === item.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{item.desc}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">{renderFooter(!answers.goal)}</div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      key="step3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Current Training Split", "How do you organize your workouts?")}
      <div className="px-6 flex flex-col gap-3">
        {['Push / Pull / Legs (PPL)', 'Bro Split (Body part per day)', 'Upper / Lower', 'Full Body', 'Unstructured'].map((option) => (
          <button
            key={option}
            onClick={() => setAnswers({ ...answers, split: option })}
            className={`py-5 px-6 rounded-2xl w-full text-left font-semibold ${
               answers.split === option 
                 ? 'border-2 border-zinc-900 bg-white shadow-sm' 
                 : 'btn-secondary text-zinc-800'
             }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-4">{renderFooter(!answers.split)}</div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div 
      key="step4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white"
    >
      {renderHeader("Experience Level", "How long have you been lifting consistently?")}
      <div className="px-6 flex flex-col gap-4">
        {[
          { id: 'Beginner', desc: '< 1 year' },
          { id: 'Intermediate', desc: '1 - 3 years' },
          { id: 'Advanced', desc: '3+ years' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAnswers({ ...answers, experience: item.id })}
            className={`py-5 px-6 rounded-2xl w-full flex justify-between items-center ${
              answers.experience === item.id 
                ? 'border-2 border-zinc-900 font-bold bg-white shadow-sm' 
                : 'btn-secondary'
            }`}
          >
            <span className="text-lg font-semibold">{item.id}</span>
            <span className="text-zinc-500">{item.desc}</span>
          </button>
        ))}
      </div>
      {renderFooter(!answers.experience)}
    </motion.div>
  );

  const renderStep5 = () => ( // Old Step 3
    <motion.div 
      key="step5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Workout Frequency", "How many days per week are you lifting?")}
      <div className="px-6 flex flex-col gap-4">
        {[
          { icon: '●', title: '0 - 2', desc: 'Workouts now and then' },
          { icon: 'ஃ', title: '3 - 5', desc: 'A few workouts per week' },
          { icon: '∷', title: '6+', desc: 'Dedicated athlete' }
        ].map((option) => (
          <button
            key={option.title}
            onClick={() => setAnswers({ ...answers, frequency: option.title })}
            className={`p-6 rounded-3xl w-full flex items-center gap-6 text-left ${
              answers.frequency === option.title 
                ? 'border-2 border-zinc-900 bg-white shadow-sm' 
                : 'btn-secondary'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center shrink-0">
               <span className="text-xl leading-none -mt-1 font-bold">{option.icon}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900">{option.title}</h3>
              <p className="text-sm font-medium text-zinc-500 mt-1">{option.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-8">
        {renderFooter(!answers.frequency)}
      </div>
    </motion.div>
  );

  const renderStep6 = () => (
    <motion.div 
      key="step6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Form Focus Areas", "Which lifts do you want to improve most? (Select multiple)")}
      <div className="px-6 grid grid-cols-2 gap-3">
        {['Squats', 'Deadlifts', 'Bench Press', 'Overhead Press', 'Pull-ups', 'Barbell Rows'].map((option) => (
          <button
            key={option}
            onClick={() => toggleArrayItem('focusAreas', option)}
            className={`py-4 px-4 rounded-2xl w-full text-center font-semibold text-sm transition-all ${
               answers.focusAreas.includes(option)
                 ? 'bg-zinc-900 text-white shadow-md' 
                 : 'btn-secondary text-zinc-800'
             }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-8">{renderFooter(answers.focusAreas.length === 0)}</div>
    </motion.div>
  );

  const renderStep7 = () => (
    <motion.div 
      key="step7"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Any Pain Points?", "Knowing your injury history helps the AI tailor form corrections. (Select multiple)")}
      <div className="px-6 grid grid-cols-2 gap-3">
        {['Lower Back', 'Knees', 'Shoulders', 'Elbows', 'Wrists', 'Hips', 'None'].map((option) => (
          <button
            key={option}
            onClick={() => {
              if (option === 'None') {
                setAnswers({...answers, injuries: ['None']});
              } else {
                let newArr = answers.injuries.filter(i => i !== 'None');
                if (newArr.includes(option)) newArr = newArr.filter(i => i !== option);
                else newArr.push(option);
                setAnswers({...answers, injuries: newArr});
              }
            }}
            className={`py-4 px-4 rounded-2xl w-full flex items-center justify-between font-semibold text-sm transition-all ${
               answers.injuries.includes(option)
                 ? 'bg-zinc-900 text-white shadow-md' 
                 : 'btn-secondary text-zinc-800'
             }`}
          >
            {option}
            {answers.injuries.includes(option) && <CheckCircle2 className="w-4 h-4" />}
          </button>
        ))}
      </div>
      <div className="mt-8">{renderFooter(answers.injuries.length === 0)}</div>
    </motion.div>
  );

  const renderStep8 = () => (
    <motion.div 
      key="step8"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("AI Coaching Style", "How do you want your feedback?")}
      <div className="px-6 flex flex-col gap-3">
        {[
          { id: 'Strict', title: 'The Strict Coach', desc: 'Direct, unforgiving form critique and safety first.' },
          { id: 'Encouraging', title: 'The Hype Man', desc: 'Positive reinforcement, focusing on what you did right.' },
          { id: 'Data', title: 'Data Driven', desc: 'Just give me the raw joint angle deviations and physics.' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAnswers({ ...answers, feedbackStyle: item.id })}
            className={`py-5 px-6 rounded-2xl w-full text-left flex flex-col gap-1 ${
               answers.feedbackStyle === item.id 
                 ? 'border-2 border-zinc-900 bg-white shadow-sm' 
                 : 'btn-secondary text-zinc-800'
             }`}
          >
            <span className="font-bold text-lg">{item.title}</span>
            <span className={`text-sm ${answers.feedbackStyle === item.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{item.desc}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">{renderFooter(!answers.feedbackStyle)}</div>
    </motion.div>
  );

  const renderStep9 = () => (
    <motion.div 
      key="step9"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Recording Setup", "How do you usually film your sets?")}
      <div className="px-6 flex flex-col gap-4">
        <button
          onClick={() => setAnswers({ ...answers, setupPref: 'Tripod' })}
          className={`py-6 px-6 rounded-3xl w-full flex items-center gap-5 ${
            answers.setupPref === 'Tripod' 
              ? 'btn-secondary selected-dark' 
              : 'btn-secondary'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
             <Smartphone className={`w-6 h-6 ${answers.setupPref === 'Tripod' ? 'text-white' : 'text-zinc-800'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Tripod / Prop</h3>
            <p className="text-sm opacity-70 mt-1">Stationary background</p>
          </div>
        </button>
        <button
          onClick={() => setAnswers({ ...answers, setupPref: 'Gym Buddy' })}
         className={`py-6 px-6 rounded-3xl w-full flex items-center gap-5 ${
            answers.setupPref === 'Gym Buddy' 
              ? 'btn-secondary selected-dark' 
              : 'btn-secondary'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
             <Camera className={`w-6 h-6 ${answers.setupPref === 'Gym Buddy' ? 'text-white' : 'text-zinc-800'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Gym Buddy</h3>
            <p className="text-sm opacity-70 mt-1">Moving camera, chaotic</p>
          </div>
        </button>
      </div>
      <div className="mt-8">{renderFooter(!answers.setupPref)}</div>
    </motion.div>
  );

  const renderStep10 = () => ( // Old step 2
    <motion.div 
      key="step10"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white"
    >
      {renderHeader("Have you used other form tracking apps?", "")}
      <div className="px-6 flex flex-col gap-4">
        <button
          onClick={() => setAnswers({ ...answers, triedApps: true })}
          className={`py-5 px-6 rounded-3xl w-full text-lg flex items-center gap-4 ${
            answers.triedApps === true 
              ? 'btn-secondary selected-dark' 
              : 'btn-secondary'
          }`}
        >
          <ThumbsUp className={`w-6 h-6 ${answers.triedApps === true ? 'text-white' : 'text-zinc-800'}`} />
          Yes
        </button>
        <button
          onClick={() => setAnswers({ ...answers, triedApps: false })}
         className={`py-5 px-6 rounded-3xl w-full text-lg flex items-center gap-4 ${
            answers.triedApps === false 
              ? 'btn-secondary selected-dark' 
              : 'btn-secondary'
          }`}
        >
          <ThumbsDown className={`w-6 h-6 ${answers.triedApps === false ? 'text-white' : 'text-zinc-800'}`} />
          No
        </button>
      </div>
      {renderFooter(answers.triedApps === null)}
    </motion.div>
  );

  const renderStep11 = () => ( // Old step 4
    <motion.div 
      key="step11"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Where did you hear about us?", "")}
      <div className="px-6 flex flex-col gap-3">
        {[
          { icon: '🎵', name: 'Tik Tok' },
          { icon: '▶️', name: 'YouTube' },
          { icon: '📷', name: 'Instagram FitTok' },
          { icon: '📱', name: 'App Store' },
          { icon: '🤝', name: 'Gym Bro / Friend' },
        ].map((option) => (
          <button
            key={option.name}
            onClick={() => setAnswers({ ...answers, source: option.name })}
            className={`py-4 px-6 rounded-3xl w-full flex items-center gap-4 text-left ${
              answers.source === option.name 
                ? 'border-2 border-zinc-900 font-bold bg-white shadow-sm' 
                : 'btn-secondary text-zinc-800'
            }`}
          >
             <div className="w-8 h-8 flex items-center justify-center text-xl shrink-0">
               {option.icon}
             </div>
             <span className="font-semibold">{option.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">
         {renderFooter(!answers.source)}
      </div>
    </motion.div>
  );

  const renderStep12 = () => (
    <motion.div 
      key="step12"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 flex flex-col bg-white overflow-y-auto pb-24"
    >
      {renderHeader("Last step!", "Let's secure your progress.")}
      <div className="px-6 flex flex-col gap-4">
         <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 mb-4">
            <h3 className="font-bold text-center text-zinc-900 mb-2">Build your AuraProfile</h3>
            <p className="text-sm text-center text-zinc-500 mb-6">Create an account to save your historical form scores and connect with the community.</p>
            
            <input 
              type="email" 
              placeholder="Email address"
              value={answers.email}
              onChange={(e) => setAnswers({...answers, email: e.target.value})}
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 mb-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <input 
              type="password" 
              placeholder="Password"
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 mb-4 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
         </div>
         <p className="text-xs text-center text-zinc-400">By continuing you agree to our Terms of Service and Privacy Policy for handling your biometric data.</p>
      </div>
      <div className="mt-4">
         {renderFooter(!answers.email.includes('@'), "Create Account")}
      </div>
    </motion.div>
  );

  return (
    <div className="relative w-full h-[100dvh] bg-white overflow-hidden text-zinc-900 user-select-none">
      <AnimatePresence mode="wait">
        {step === 0 && renderLanding()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
        {step === 8 && renderStep8()}
        {step === 9 && renderStep9()}
        {step === 10 && renderStep10()}
        {step === 11 && renderStep11()}
        {step === 12 && renderStep12()}
      </AnimatePresence>
    </div>
  );
}
