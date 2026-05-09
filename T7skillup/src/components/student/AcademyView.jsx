import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut } from 'lucide-react';

const AcademyView = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  // You can change this port to match your T7 Academy dev server port
  const ACADEMY_URL = "http://localhost:3001"; 

  return (
    <div className="flex flex-col h-screen bg-zinc-50 overflow-hidden">
      {/* Shared Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-zinc-100 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center cursor-pointer" onClick={() => navigate('/dashboard')}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-zinc-900 text-lg">T7skillup</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* App Mode Switcher */}
            <div className="hidden md:flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-zinc-500 hover:text-zinc-700"
              >
                T7 skillup
              </button>
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-zinc-900 shadow-sm"
              >
                T7 Academy
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-zinc-900">{userProfile?.name}</p>
              <p className="text-xs text-zinc-500">{userProfile?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Academy Content (Iframe) */}
      <div className="flex-1 w-full relative">
        <iframe
          src={ACADEMY_URL}
          className="absolute inset-0 w-full h-full border-0"
          title="T7 Academy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default AcademyView;
