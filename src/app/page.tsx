"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Zap, Image as ImageIcon, HelpCircle, 
  Activity, CheckCircle2, ChevronRight, 
  Video, History, User, Heart, Mic, Camera,
  Home, BarChart3, Users, Plus, Flame,
  Bell, UserPlus, Settings, Globe, Palette,
  Target, TrendingUp, Award, Shield, Edit
} from 'lucide-react';
import Webcam from 'react-webcam';

const MOCK_GRAPH_DATA = [
  { subject: 'Power', Aura: 88, GoldStandard: 95, fullMark: 100 },
  { subject: 'Grace', Aura: 76, GoldStandard: 90, fullMark: 100 },
  { subject: 'Consistency', Aura: 92, GoldStandard: 98, fullMark: 100 },
];

import Onboarding from '@/components/Onboarding';

export default function MobileApp() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [view, setView] = useState<'HOME' | 'CAMERA' | 'PROCESSING' | 'RESULT'>('HOME');
  const [activeTab, setActiveTab] = useState<'Home' | 'Progress' | 'Community' | 'Profile'>('Home');
  const [processingStep, setProcessingStep] = useState(0);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRange, setSelectedRange] = useState('90 Days');
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);
  const MAX_RECORDING_SECONDS = 60;

  // --- Handlers ---

  const handleStartCapture = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingStartRef.current = Date.now();
    if (webcamRef.current && webcamRef.current.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: "video/webm"
      });
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - recordingStartRef.current) / 1000;
        setMediaBlobUrl(url);
        processMedia(blob, duration);
      };
      mediaRecorderRef.current.start();

      // Countdown timer (updates every 100ms)
      recordingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartRef.current) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
      }, 100);
    }
  }, [webcamRef]);

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setMediaBlobUrl(url);
      processMedia(file);
    }
  };

  const processMedia = async (blob: Blob, duration?: number) => {
    setView('PROCESSING');
    setProcessingStep(1);

    setTimeout(() => setProcessingStep(2), 2000);
    setTimeout(() => setProcessingStep(3), 4000);
    
    try {
      const formData = new FormData();
      formData.append('video', blob, 'workout.webm');
      formData.append('pro_reference_id', 'default_pro');
      if (duration) formData.append('duration', String(duration.toFixed(1)));
      
      const response = await fetch('/api/compare_workout', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      
      setResult(data);
      setTimeout(() => setView('RESULT'), 1000);
      
    } catch (e) {
      console.error(e);
      setResult({
        similarity_score: 0.85,
        critique: {
          power: "Good explosive drive.",
          grace: "Smooth transitions.",
          consistency: "Solid rhythm throughout the set."
        }
      });
      setTimeout(() => setView('RESULT'), 1000);
    }
  };

  // --- Screens ---

  // --- Helper: color from score ---
  const scoreColor = (score: number) => {
    if (score >= 70) return { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', ring: '#059669' };
    if (score >= 40) return { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', ring: '#d97706' };
    return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', ring: '#dc2626' };
  };

  // Mock data — would come from user's history
  const auraScore = 87;
  const jointData = [
    { name: 'Knees', score: 72, icon: '🦵' },
    { name: 'Shoulders', score: 45, icon: '💪' },
    { name: 'Lower Back', score: 28, icon: '🔻' },
  ];
  const weekDays = useMemo(() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    return days.map((d, i) => {
      const diff = i - today.getDay();
      const date = new Date(today);
      date.setDate(today.getDate() + diff);
      return { day: d, date: date.getDate(), isToday: diff === 0 };
    });
  }, []);
  const [activeDay, setActiveDay] = useState(() => new Date().getDay());

  // SVG ring helper
  const Ring = ({ score, size = 56, stroke = 5 }: { score: number; size?: number; stroke?: number }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = scoreColor(score).ring;
    return (
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
    );
  };

  const renderHome = () => (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-[#fafafa] flex flex-col overflow-y-auto pb-28"
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">AuraFit</h1>
        <div className="flex items-center gap-1 bg-zinc-100 rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="font-bold text-sm text-zinc-700">7</span>
        </div>
      </div>

      {/* Week Day Selector */}
      <div className="px-4 py-3 flex justify-between">
        {weekDays.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(i)}
            className={`flex flex-col items-center gap-1 py-2 px-2.5 rounded-2xl transition-all ${
              activeDay === i
                ? 'bg-zinc-900 text-white shadow-md'
                : 'text-zinc-500'
            }`}
          >
            <span className="text-[11px] font-semibold">{d.day}</span>
            <span className={`text-sm font-bold ${activeDay === i ? '' : 'text-zinc-800'}`}>{String(d.date).padStart(2, '0')}</span>
          </button>
        ))}
      </div>

      {/* Hero AuraScore Card */}
      <div className="mx-6 mt-2 bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-zinc-100">
        <div className="flex items-center justify-between">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl font-black text-zinc-900 leading-none"
            >
              {auraScore}
            </motion.span>
            <p className="text-zinc-500 font-semibold mt-1">AuraScore</p>
          </div>
          <Ring score={auraScore} size={72} stroke={6} />
        </div>
      </div>

      {/* Joint Health Cards */}
      <div className="flex gap-3 px-6 mt-4 overflow-x-auto">
        {jointData.map((joint) => {
          const c = scoreColor(joint.score);
          return (
            <div key={joint.name} className={`flex-1 min-w-[100px] ${c.bg} rounded-2xl p-4 border ${c.border}`}>
              <span className={`text-2xl font-black ${c.text}`}>{joint.score}</span>
              <p className="text-zinc-500 text-xs font-semibold mt-0.5">{joint.name}</p>
              <div className="mt-3">
                <Ring score={joint.score} size={40} stroke={4} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sessions */}
      <div className="px-6 mt-6">
        <h2 className="font-bold text-lg text-zinc-900 mb-3">Recent sessions</h2>
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-5 flex flex-col items-center">
          <div className="w-full flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Camera className="w-6 h-6 text-zinc-400" />
            </div>
            <div className="flex-1">
              <div className="h-3 bg-zinc-100 rounded-full w-3/4 mb-2" />
              <div className="h-2 bg-zinc-50 rounded-full w-1/2" />
            </div>
          </div>
          <p className="text-zinc-400 text-sm italic">Tap + to record your first set of the day</p>
        </div>
      </div>

      {renderBottomNav()}
    </motion.div>
  );

  // --- Shared Bottom Nav ---
  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-zinc-100 px-4 pb-6 pt-2 flex items-center">
      <div className="flex-1 flex justify-around">
        {([
          { icon: Home, label: 'Home' as const },
          { icon: BarChart3, label: 'Progress' as const },
          { icon: Users, label: 'Community' as const },
          { icon: User, label: 'Profile' as const },
        ] as const).map((item) => (
          <button key={item.label} className="flex flex-col items-center gap-0.5"
            onClick={() => { setActiveTab(item.label); setView('HOME'); }}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.label ? 'text-zinc-900' : 'text-zinc-400'}`} />
            <span className={`text-[10px] font-semibold ${activeTab === item.label ? 'text-zinc-900' : 'text-zinc-400'}`}>{item.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setView('CAMERA')}
        className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg -mt-4 ml-2"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>
    </div>
  );

  // --- Progress Page ---
  const renderProgress = () => {
    const streakDays = ['S','M','T','W','T','F','S'];
    const filledDays = [true, true, false, true, true, false, false];
    const timeRanges = ['90 Days', '6 Months', '1 Year', 'All time'];
    const chartData = [65, 68, 72, 70, 75, 80, 87];
    const chartLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    return (
      <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 bg-[#fafafa] flex flex-col overflow-y-auto pb-28"
      >
        <div className="px-6 pt-14 pb-4">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Progress</h1>
        </div>

        {/* Top Cards */}
        <div className="px-6 flex gap-3 mb-4">
          <div className="flex-1 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
            <p className="text-zinc-500 text-xs font-semibold mb-1">My AuraScore</p>
            <span className="text-3xl font-black text-zinc-900">87</span>
            <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '87%' }} />
            </div>
            <p className="text-zinc-400 text-xs mt-2">Goal <b className="text-zinc-700">95</b></p>
          </div>
          <div className="flex-1 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col items-center">
            <div className="text-4xl mb-1">🔥</div>
            <span className="text-2xl font-black text-orange-500">4</span>
            <p className="text-zinc-500 text-xs font-semibold">Day streak</p>
            <div className="flex gap-1.5 mt-3">
              {streakDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-zinc-400 font-semibold">{d}</span>
                  <div className={`w-4 h-4 rounded-full ${filledDays[i] ? 'bg-orange-400' : 'bg-zinc-200'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="px-6 flex gap-2 mb-4">
          {timeRanges.map(r => (
            <button key={r} onClick={() => setSelectedRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedRange === r ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}
            >{r}</button>
          ))}
        </div>

        {/* AuraScore Trend Chart */}
        <div className="mx-6 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-zinc-900">AuraScore Trend</h2>
            <div className="flex items-center gap-1 bg-emerald-50 rounded-full px-2 py-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-600">+12%</span>
            </div>
          </div>
          {/* Simple SVG Chart */}
          <svg viewBox="0 0 300 120" className="w-full h-28">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0,30,60,90].map(y => (
              <line key={y} x1="30" y1={y+10} x2="290" y2={y+10} stroke="#f4f4f5" strokeDasharray="4 4" />
            ))}
            {/* Area */}
            <path d={`M30,${110 - chartData[0]} ${chartData.map((v,i) => `L${30 + i*43},${110-v}`).join(' ')} L${30 + 6*43},110 L30,110 Z`}
              fill="url(#chartGrad)" />
            {/* Line */}
            <polyline fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              points={chartData.map((v,i) => `${30+i*43},${110-v}`).join(' ')} />
            {/* Dots */}
            {chartData.map((v,i) => (
              <circle key={i} cx={30+i*43} cy={110-v} r="4" fill="white" stroke="#059669" strokeWidth="2" />
            ))}
            {/* Labels */}
            {chartLabels.map((l,i) => (
              <text key={i} x={30+i*43} y="108" textAnchor="middle" className="text-[8px] fill-zinc-400 font-semibold">{l}</text>
            ))}
          </svg>
        </div>

        {/* Joint Health Breakdown */}
        <div className="mx-6 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 mb-4">
          <h2 className="font-bold text-lg text-zinc-900 mb-4">Joint Health Breakdown</h2>
          {jointData.map((joint) => {
            const c = scoreColor(joint.score);
            return (
              <div key={joint.name} className="flex items-center gap-4 mb-4 last:mb-0">
                <Ring score={joint.score} size={36} stroke={3.5} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-800">{joint.name}</span>
                    <span className={`font-bold ${c.text}`}>{joint.score}/100</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${joint.score}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: c.ring }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Motivational Banner */}
        <div className="mx-6 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 mb-4">
          <p className="text-emerald-700 text-sm font-semibold text-center">
            🏋️ Getting started is the hardest part. You&apos;re ready for this!
          </p>
        </div>

        {renderBottomNav()}
      </motion.div>
    );
  };

  // --- Community Page ---
  const renderCommunity = () => (
    <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-[#fafafa] flex flex-col overflow-y-auto pb-28"
    >
      <div className="px-6 pt-14 pb-2 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Community</h1>
        <button className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-zinc-600" />
        </button>
      </div>

      <div className="px-6 flex items-center justify-between mb-4 mt-2">
        <h2 className="font-bold text-lg text-zinc-900">Discover Groups</h2>
        <button className="flex items-center gap-1 text-sm font-semibold text-zinc-500">
          <Plus className="w-4 h-4" /> Private Group
        </button>
      </div>

      {/* Challenge Cards */}
      <div className="px-6 space-y-3 mb-6">
        {[
          { title: 'Squat Form Challenge', members: 128, emoji: '🏋️', color: 'bg-amber-50 border-amber-100' },
          { title: 'Deadlift Academy', members: 87, emoji: '💪', color: 'bg-red-50 border-red-100' },
          { title: 'Perfect Press Club', members: 54, emoji: '⬆️', color: 'bg-blue-50 border-blue-100' },
        ].map((group) => (
          <div key={group.title} className={`${group.color} border rounded-3xl p-5 flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl">{group.emoji}</div>
            <div className="flex-1">
              <h3 className="font-bold text-zinc-900">{group.title}</h3>
              <p className="text-xs text-zinc-500 font-medium">{group.members} members • Active</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </div>
        ))}
      </div>

      {/* Leaderboard Preview */}
      <div className="mx-6 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-zinc-900">Leaderboard</h2>
          <Award className="w-5 h-5 text-amber-500" />
        </div>
        {[
          { name: 'Alex K.', score: 96, rank: 1 },
          { name: 'Jordan M.', score: 94, rank: 2 },
          { name: 'You', score: 87, rank: 5 },
        ].map((entry) => (
          <div key={entry.name} className={`flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0 ${entry.name === 'You' ? 'bg-emerald-50/50 -mx-2 px-2 rounded-xl' : ''}`}>
            <span className="w-6 text-center font-black text-zinc-400 text-sm">#{entry.rank}</span>
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-500" />
            </div>
            <span className={`flex-1 font-semibold ${entry.name === 'You' ? 'text-emerald-700' : 'text-zinc-800'}`}>{entry.name}</span>
            <span className="font-bold text-zinc-600">{entry.score}</span>
          </div>
        ))}
      </div>

      {/* Invite Friends */}
      <div className="mx-6 bg-zinc-900 rounded-3xl p-5 flex items-center gap-4 mb-4">
        <UserPlus className="w-8 h-8 text-white shrink-0" />
        <div>
          <h3 className="font-bold text-white">Invite Gym Bros</h3>
          <p className="text-zinc-400 text-xs">Challenge friends to beat your AuraScore</p>
        </div>
      </div>

      {renderBottomNav()}
    </motion.div>
  );

  // --- Profile Page ---
  const renderProfile = () => (
    <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-[#fafafa] flex flex-col overflow-y-auto pb-28"
    >
      {/* User Card */}
      <div className="mx-6 mt-14 bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center">
          <User className="w-7 h-7 text-zinc-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-zinc-900">Enter your name</h2>
            <Edit className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-zinc-500 text-sm">AuraFit Member</p>
        </div>
      </div>

      {/* Invite Banner */}
      <div className="mx-6 mb-4">
        <p className="text-zinc-500 text-xs font-semibold flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4" /> Invite friends
        </p>
        <div className="relative rounded-3xl overflow-hidden h-36">
          <img src="/assets/invite_banner.png" alt="Invite friends" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-end p-5">
            <p className="text-white font-bold text-lg leading-tight mb-2">The journey<br/>is easier together.</p>
            <button className="bg-white text-zinc-900 font-bold text-sm px-4 py-2 rounded-full w-fit">
              Refer a friend to earn rewards
            </button>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="mx-6 bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden mb-4">
        {[
          { icon: User, label: 'Personal details' },
          { icon: Target, label: 'Adjust form goals' },
          { icon: Activity, label: 'Joint health targets' },
          { icon: History, label: 'Session history' },
          { icon: Globe, label: 'Language' },
          { icon: Palette, label: 'Ring Colors Explained' },
        ].map((item, i) => (
          <button key={item.label} className="w-full px-5 py-4 flex items-center gap-4 border-b border-zinc-50 last:border-0 active:bg-zinc-50 transition-colors">
            <item.icon className="w-5 h-5 text-zinc-500" />
            <span className="font-semibold text-zinc-800 flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-zinc-300" />
          </button>
        ))}
      </div>

      {renderBottomNav()}
    </motion.div>
  );

  const renderCamera = () => (
    <motion.div 
      key="camera"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black flex flex-col"
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <Webcam 
          audio={true} 
          ref={webcamRef} 
          videoConstraints={{ facingMode: 'environment' }}
          className="w-full h-full object-cover" 
        />
        
        {/* Overlay Scanner Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="w-[70vw] h-[70vw] max-w-sm max-h-sm relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-3xl" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-3xl" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-3xl" />
            {/* Scanning Line Animation */}
            {isRecording && (
               <motion.div 
                 initial={{ top: '10%' }}
                 animate={{ top: '90%' }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear", repeatType: "reverse" }}
                 className="absolute left-[5%] right-[5%] h-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               />
            )}
          </div>
        </div>
      </div>

      <header className="relative z-30 w-full pt-14 pb-4 px-6 flex items-center justify-between text-white bg-gradient-to-b from-black/60 to-transparent">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer"
             onClick={() => setView('HOME')}
        >
          <X className="w-6 h-6" />
        </div>
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-lg tabular-nums">
              {Math.floor(recordingTime / 60)}:{String(Math.floor(recordingTime % 60)).padStart(2, '0')}
              <span className="text-white/50 text-sm"> / 1:00</span>
            </span>
          </div>
        ) : (
          <h1 className="font-bold text-lg tracking-wide">Record Your Form</h1>
        )}
         <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
      </header>

      <div className="mt-auto mb-10 relative z-30 px-10 flex items-center justify-between w-full">
        <div className="w-12 h-12 flex items-center justify-center">
          <HelpCircle className="w-8 h-8 text-white drop-shadow-md" />
        </div>
        
        {/* Big Capture Button */}
        <div 
          onClick={isRecording ? handleStopCaptureClick : handleStartCapture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
        >
          <AnimatePresence>
            {isRecording && (
              <motion.svg 
                initial={{ rotate: -90, strokeDasharray: "0 250" }}
                animate={{ strokeDasharray: "250 250" }}
                transition={{ duration: MAX_RECORDING_SECONDS, ease: "linear" }}
                className="absolute inset-0 w-full h-full text-red-500 z-10 scale-110" 
                viewBox="0 0 100 100"
              >
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" />
              </motion.svg>
            )}
          </AnimatePresence>
          <motion.div 
             animate={isRecording ? { scale: 0.6, borderRadius: '8px', backgroundColor: '#ef4444' } : { scale: 1, borderRadius: '99px', backgroundColor: 'white' }}
             className="w-[66px] h-[66px]"
          />
        </div>
        
        <div 
          className="w-12 h-12 flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-8 h-8 text-white drop-shadow-md" />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="video/*"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </motion.div>
  );

  const renderProcessing = () => (
    <motion.div 
      key="processing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 bg-zinc-900 text-white flex flex-col pt-14 px-6 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-40 z-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
      </div>

      <header className="relative z-10 flex items-center justify-between mb-8">
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer"
             onClick={() => setView('HOME')}
        >
          <X className="w-6 h-6" />
        </div>
      </header>
      
      <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-sm mx-auto">
        <motion.div 
           initial={{ scale: 0.9, y: 20 }}
           animate={{ scale: 1, y: 0 }}
           transition={{ delay: 0.2, type: "spring" }}
           className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden relative shadow-2xl mb-10 border border-white/20"
        >
          {mediaBlobUrl && (
            <video src={mediaBlobUrl} autoPlay loop muted className="w-full h-full object-cover" />
          )}
          {/* Faint scanner UI overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[60%] h-[60%] border-t-2 border-l-2 border-white/40 absolute top-[20%] left-[20%] rounded-tl-2xl" />
            <div className="w-[60%] h-[60%] border-b-2 border-r-2 border-white/40 absolute bottom-[20%] right-[20%] rounded-br-2xl" />
          </div>
        </motion.div>

        <div className="w-full space-y-5 px-2">
          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center">
              {processingStep >= 1 ? <CheckCircle2 className="w-6 h-6 text-white" /> : <div className="w-4 h-4 rounded-full border-2 border-white/30" />}
            </div>
            <span className={`font-semibold text-lg ${processingStep >= 1 ? 'text-white' : 'text-white/50'}`}>Media Processed</span>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-6 flex justify-center mt-1">
              {processingStep >= 2 ? <CheckCircle2 className="w-6 h-6 text-white" /> : (processingStep === 1 ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-white/30" />)}
            </div>
            <div className="flex flex-col">
               <span className={`font-semibold text-lg ${processingStep >= 2 ? 'text-white' : (processingStep === 1 ? 'text-white' : 'text-white/50')}`}>Extracting Vectors</span>
               <span className="text-white/50 text-sm font-medium">Matching with Pro Reference Database</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center">
              {processingStep >= 3 ? <CheckCircle2 className="w-6 h-6 text-white" /> : (processingStep === 2 ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-white/30" />)}
            </div>
            <span className={`font-semibold text-lg ${processingStep >= 3 ? 'text-white' : (processingStep === 2 ? 'text-white' : 'text-white/50')}`}>Estimating Form Score</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center">
              {processingStep >= 4 ? <CheckCircle2 className="w-6 h-6 text-white" /> : (processingStep === 3 ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-white/30" />)}
            </div>
            <span className={`font-semibold text-lg ${processingStep >= 4 ? 'text-white' : (processingStep === 3 ? 'text-white' : 'text-white/50')}`}>Building Form Summary</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderResult = () => (
    <motion.div 
      key="result"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      className="absolute inset-0 z-50 bg-[#fafafa] flex flex-col pt-14 pb-8 px-6 text-zinc-900 overflow-y-auto"
    >
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-black text-2xl tracking-tight">AuraScore</h1>
        <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center cursor-pointer"
             onClick={() => setView('HOME')}
        >
          <X className="w-6 h-6" />
        </div>
      </header>

      {result && (
        <div className="flex flex-col items-center mb-8 bg-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-black/5">
          <span className="text-5xl font-black text-zinc-800 drop-shadow-sm mb-2">
            {(result.similarity_score * 100).toFixed(1)}<span className="text-2xl text-zinc-400">%</span>
          </span>
          <span className="font-semibold text-zinc-400 text-sm tracking-widest uppercase">Form Match Score</span>
          
          <div className="w-full mt-6 flex justify-between gap-3">
             <div className="flex-1 bg-red-50 rounded-2xl p-3 border border-red-100 flex flex-col items-center">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Power</span>
                <span className="font-bold text-red-600 text-lg">{(result.similarity_score * 100).toFixed(0)}</span>
             </div>
             <div className="flex-1 bg-amber-50 rounded-2xl p-3 border border-amber-100 flex flex-col items-center">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Grace</span>
                <span className="font-bold text-amber-600 text-lg">{(result.similarity_score * 98).toFixed(0)}</span>
             </div>
             <div className="flex-1 bg-blue-50 rounded-2xl p-3 border border-blue-100 flex flex-col items-center">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Cons</span>
                <span className="font-bold text-blue-600 text-lg">{(result.similarity_score * 102).toFixed(0)}</span>
             </div>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-[2rem] space-y-4">
         <h2 className="font-bold text-xl ml-2">Critique</h2>
         {result?.critique && (
           <div className="space-y-3">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100">
                <span className="text-red-500 font-bold block mb-1">Power</span>
                <p className="text-zinc-600 font-medium text-sm leading-relaxed">{result.critique.power}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100">
                <span className="text-amber-500 font-bold block mb-1">Grace</span>
                <p className="text-zinc-600 font-medium text-sm leading-relaxed">{result.critique.grace}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100">
                <span className="text-blue-500 font-bold block mb-1">Consistency</span>
                <p className="text-zinc-600 font-medium text-sm leading-relaxed">{result.critique.consistency}</p>
              </div>
           </div>
         )}
      </div>

      <button 
        className="w-full mt-6 py-4 rounded-2xl bg-black text-white font-bold text-lg active:scale-95 transition-transform"
        onClick={() => setView('HOME')}
      >
        Done
      </button>

    </motion.div>
  );

  if (!hasOnboarded) {
    return <Onboarding onComplete={() => setHasOnboarded(true)} />;
  }

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#fafafa] font-sans antialiased text-black">

      <AnimatePresence mode="wait">
        {view === 'HOME' && activeTab === 'Home' && renderHome()}
        {view === 'HOME' && activeTab === 'Progress' && renderProgress()}
        {view === 'HOME' && activeTab === 'Community' && renderCommunity()}
        {view === 'HOME' && activeTab === 'Profile' && renderProfile()}
        {view === 'CAMERA' && renderCamera()}
        {view === 'PROCESSING' && renderProcessing()}
        {view === 'RESULT' && renderResult()}
      </AnimatePresence>
    </main>
  );
}
