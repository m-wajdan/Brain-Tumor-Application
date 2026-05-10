"use client";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    <div className="min-h-screen flex bg-white">
      {/* Left Section: Teal Brand Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#1a9d9f] to-[#17858a] flex-col justify-between p-12">
        {/* Logo and Branding */}
        <div>
          <div className="flex items-center gap-3 mb-16">
            {/* Brain Icon */}
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-[#1a9d9f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="6" />
                <path d="M8 14h8v6H8z" />
                <path d="M10 20v2M14 20v2" />
              </svg>
            </div>
            <span className="text-white text-2xl font-bold">NeuroScan</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-white text-5xl font-bold leading-tight mb-6">
            AI-assisted brain MRI<br />insights
          </h1>

          {/* Description */}
          <p className="text-white text-lg opacity-90 leading-relaxed">
            Upload multi-modal MRI scans and get rapid, structured tumor-detection reports — designed for clinicians.
          </p>
        </div>

        {/* Footer */}
        <div>
          <p className="text-white text-sm opacity-75">
            © NeuroScan — Research preview
          </p>
        </div>
      </div>

      {/* Right Section: Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[#1a9d9f] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="6" />
                <path d="M8 14h8v6H8z" />
                <path d="M10 20v2M14 20v2" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">NeuroScan</span>
          </div>

          {/* Sign In Heading */}
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Sign in</h2>
          <p className="text-gray-600 mb-8">Access your NeuroScan workspace</p>

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a9d9f] transition placeholder-gray-400"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-900">Password</label>
                {isLogin && (
                  <a href="#" className="text-sm text-[#1a9d9f] hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a9d9f] transition"
                required
              />
            </div>

            {/* Confirm Password (Sign Up) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a9d9f] transition"
                  required
                />
              </div>
            )}

            {/* Remember Me Checkbox (Sign In) */}
            {isLogin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-2 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  Remember me
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a9d9f] hover:bg-[#158a8c] text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {isLoading ? "Loading..." : (isLogin ? "Sign in" : "Create account")}
            </button>
          </form>

          {/* Google Sign In */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Continue with Google - coming soon
            </p>
          </div>

          {/* Sign Up / Sign In Toggle */}
          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                New here?{" "}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-[#1a9d9f] font-semibold hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-[#1a9d9f] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
