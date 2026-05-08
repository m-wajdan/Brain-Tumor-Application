"use client";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid credentials");
      }

      const user = await response.json();
      toast.success("Welcome back, Doctor!");
      onLogin(user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "doctor" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Signup failed");
      }

      toast.success("Account created! Please log in.");
      setIsLogin(true);
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans flex items-center justify-center p-4 overflow-hidden relative">
      {/* Subtle Background 3D Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[120px]" />
      </div>

    <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20 z-10">
        
        {/* Left Section: 3D Graphic & Title */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
            {/* Neon Brain Icon SVG */}
            <div className="relative group flex-shrink-0">
              <svg 
                className="w-24 h-24 lg:w-40 lg:h-40 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
                <path d="M10 21v-1M14 21v-1" />
                <path d="M9 10h.01M15 10h.01" />
                <path d="M12 2v5" />
                <path d="M8 6l1.5 2M16 6l-1.5 2" />
                <path d="M7 10c0-3 2-5 5-5s5 2 5 5" />
                <path d="M12 11v3" />
              </svg>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-tight">
                NEURO ONCOLOGY<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                  TRACKING EDUCATION
                </span><br />
                SYSTEM
              </h1>
              <p className="text-gray-400 text-lg lg:text-xl font-medium max-w-xl">
                Advanced AI-driven diagnostics and monitoring for neuro-oncology specialists.
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Auth Card */}
        <div className="w-full max-w-[480px]">
          {/* Toggle Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                isLogin 
                ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] border border-cyan-500/30" 
                : "text-gray-500 hover:text-gray-300"
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                !isLogin 
                ? "bg-fuchsia-500/10 text-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.2)] border border-fuchsia-500/30" 
                : "text-gray-500 hover:text-gray-300"
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group">
            {/* Animated border glow */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all duration-500 ${isLogin ? "from-cyan-500/0 via-cyan-500 to-cyan-500/0" : "from-fuchsia-500/0 via-fuchsia-500 to-fuchsia-500/0"}`} />

            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isLogin ? "text-cyan-500/50" : "text-fuchsia-500/50"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                  </div>
                  <input 
                    type="email" 
                    placeholder="doctor@hospital.org"
                    className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all ${isLogin ? "focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5" : "focus:border-fuchsia-500/50 focus:ring-4 focus:ring-fuchsia-500/5"}`}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                  {isLogin && (
                    <button type="button" className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">Forgot Password?</button>
                  )}
                </div>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isLogin ? "text-cyan-500/50" : "text-fuchsia-500/50"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all ${isLogin ? "focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5" : "focus:border-fuchsia-500/50 focus:ring-4 focus:ring-fuchsia-500/5"}`}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Confirm Password (Signup only) */}
              {!isLogin && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fuchsia-500/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-fuchsia-500/50 focus:ring-4 focus:ring-fuchsia-500/5 transition-all"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className={`w-full py-4.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-xl group mt-4 ${
                  isLogin 
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20" 
                  : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-fuchsia-500/20"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>{isLoading ? "Processing..." : (isLogin ? "LOG IN" : "CREATE ACCOUNT")}</span>
                {!isLoading && <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
              </button>
            </form>

            <div className="text-center pt-6">
              <p className="text-[11px] text-gray-500 font-bold">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className={`ml-2 transition-colors ${isLogin ? "text-cyan-400 hover:text-cyan-300" : "text-fuchsia-400 hover:text-fuchsia-300"}`}
                >
                  {isLogin ? "Sign Up" : "Log In"}
                </button>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}
