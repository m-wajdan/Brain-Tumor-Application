"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { usePDF } from "react-to-pdf";
import { overlayUrl } from "../lib/api";

function TypewriterText({ text, speed = 10, onComplete }) {
  const [displayed, setDisplayed] = useState("");
  const hasFinished = useRef(false);

  useEffect(() => {
    if (hasFinished.current) return;
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (i < text.length) {
          const next = text.substring(0, i + 1);
          i++;
          return next;
        }
        clearInterval(interval);
        hasFinished.current = true;
        if (onComplete) onComplete();
        return prev;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <div style={{ whiteSpace: "pre-wrap" }}>{displayed}</div>;
}

export default function PatientView({ result, mode = "a" }) {
  const [report, setReport] = useState("");
  const [generatingReport, setGeneratingReport] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  
  // Notes State
  const [notes, setNotes] = useState(result.doctor_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const { volumes, overlay_url, slice_index, id } = result;

  const { toPDF, targetRef } = usePDF({ 
    filename: `patient_report_id_${id || 'new'}.pdf`,
    page: { format: 'a4', margin: 10 },
    canvas: { useCORS: true, scale: 2 }
  });

  const [displayedReport, setDisplayedReport] = useState("");
  const [base64Image, setBase64Image] = useState("");

  useEffect(() => {
    if (overlay_url) {
      const imgUrl = overlayUrl(overlay_url);
      fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => setBase64Image(reader.result);
          reader.readAsDataURL(blob);
        })
        .catch(err => console.error("Base64 fetch error:", err));
    }
  }, [overlay_url]);

  useEffect(() => {
    if (!report) {
      setDisplayedReport("");
      return;
    }
    let i = 0;
    setDisplayedReport("");
    const interval = setInterval(() => {
      setDisplayedReport((prev) => {
        if (i < report.length) {
          const nextStr = report.substring(0, i + 1);
          i++;
          return nextStr;
        }
        clearInterval(interval);
        return prev;
      });
    }, 15);
    return () => clearInterval(interval);
  }, [report]);

  useEffect(() => {
    let isMounted = true;
    
    async function generateReport() {
      setGeneratingReport(true);
      setError("");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volumes: volumes,
            mode: mode === "a" ? "mode_a" : "mode_b"
          })
        });
        if (!res.ok) throw new Error("Failed to generate report");
        const data = await res.json();
        if (isMounted) {
          setReport(data.content);
        }
      } catch (e) {
        if (isMounted) toast.error(e.message || "Failed to generate report");
      } finally {
        if (isMounted) setGeneratingReport(false);
      }
    }

    setReport("");
    setChatHistory([]);
    generateReport();

    return () => { isMounted = false; };
  }, [result, mode, volumes]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    
    const newHistory = [...chatHistory, { role: "user", content: chatInput }];
    setChatHistory(newHistory);
    setChatInput("");
    setSendingChat(true);
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          session_id: sessionId,
          report: report
        })
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setChatHistory([...newHistory, { role: "assistant", content: data.content }]);
    } catch (err) {
      toast.error(err.message || "Chat failed");
    } finally {
      setSendingChat(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) {
      toast.error("Please save the record first before adding notes.");
      return;
    }
    setSavingNotes(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_notes: notes })
      });
      if (!res.ok) throw new Error("Failed to save notes");
      toast.success("Notes saved successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  if (generatingReport) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted animate-pulse">Analyzing clinical data & generating report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Progress Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-12 py-4">
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center text-[10px] text-white">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">1. Upload Files</span>
        </div>
        <div className="h-px w-20 bg-border" />
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]">
            2
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">Summary Report</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch w-full">
        
        {/* ── LEFT: Diagnostic Summary (60%) ───────────────────────────────── */}
        <div ref={targetRef} className="lg:col-span-6 flex flex-col h-[850px] space-y-6 bg-surface/20 rounded-2xl border border-border p-6 shadow-xl backdrop-blur-md overflow-y-auto">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Diagnostic Summary</h2>
              <p className="text-xs text-muted mt-1 font-medium opacity-60">
                Patient ID: {id ? `REC-${id.toString().padStart(4, '0')}` : "UNSAVED_DRAFT"} | Scan Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">AI Analysis Complete</span>
            </div>
          </div>

          {/* Image and Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: MRI Display */}
            <div className="relative aspect-square rounded-xl bg-black border border-white/5 overflow-hidden flex items-center justify-center group shadow-2xl">
              <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white/70 uppercase tracking-widest">
                Axial T2 Flair
              </div>
              {base64Image || overlay_url ? (
                <img 
                  src={base64Image || overlayUrl(overlay_url)} 
                  alt="Brain MRI Scan" 
                  className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.2)]"
                />
              ) : (
                <div className="text-muted text-xs">Awaiting scan overlay...</div>
              )}
            </div>

            {/* Right: Metrics Grid (Vertical) */}
            <div className="flex flex-col gap-4">
              {[
                { label: "PERITUMORAL EDEMA", val: Math.max(0, volumes.wt_volume_cm3 - volumes.tc_volume_cm3), color: "#FBBF24" },
                { label: "NECROTIC CORE", val: Math.max(0, volumes.tc_volume_cm3 - volumes.et_volume_cm3), color: "#94A3B8" },
                { label: "ENHANCING TUMOR", val: volumes.et_volume_cm3, color: "#F87171" },
              ].map((metric) => (
                <div key={metric.label} className="p-4 rounded-xl bg-surface/30 border border-border flex flex-col justify-between h-28 group transition-all hover:border-white/20">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black text-muted tracking-widest leading-tight w-20">{metric.label}</span>
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" style={{ backgroundColor: metric.color, boxShadow: `0 0 10px ${metric.color}80` }} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{metric.val.toFixed(1)}</span>
                    <span className="text-xs text-muted font-bold opacity-40">cm³</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Findings */}
          <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-foreground">AI Findings Summary</h3>
            </div>
            <div className="text-sm text-muted/90 leading-relaxed font-medium max-h-[320px] overflow-y-auto pr-4 scrollbar-thin custom-scrollbar">
              {displayedReport.split("\n").map((line, i) => (
                <p key={i} className="mb-2">{line.replace(/\*\*/g, '')}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 text-[10px] font-bold bg-surface border border-border rounded-md text-muted uppercase tracking-wider">Mass Effect</span>
              <span className="px-3 py-1 text-[10px] font-bold bg-surface border border-border rounded-md text-muted uppercase tracking-wider">Midline Shift</span>
              <span className="px-3 py-1 text-[10px] font-bold bg-destructive/10 border border-destructive/20 rounded-md text-destructive/80 uppercase tracking-widest">High Grade Suspicion</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Clinical Assistant (40%) ───────────────────────────────── */}
        <div className="lg:col-span-4 h-[850px] flex flex-col bg-surface/30 rounded-2xl border border-border shadow-xl overflow-hidden backdrop-blur-sm">
          
          {/* Assistant Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shadow-inner">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M12 7a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Clinical Assistant</h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Online • Model v4.2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-10">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                  <svg className="w-8 h-8 text-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012-2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <p className="text-sm font-bold text-foreground/80">Interactive Diagnostic Chat</p>
                <p className="text-xs text-muted mt-2 leading-relaxed opacity-60">
                  Ask the Clinical Assistant for specific metrics, progression analysis, or clinical interpretations of the AI results.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${
                    msg.role === "user" ? "bg-white/5 border-white/10" : "bg-accent/10 border-accent/20 text-accent"
                  }`}>
                    {msg.role === "user" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-accent text-white font-medium" : "bg-white/5 border border-white/5 text-gray-200"
                  }`}>
                    {msg.role === "assistant" && i === chatHistory.length - 1 ? (
                      <TypewriterText text={msg.content} speed={10} />
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sendingChat && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-muted flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-muted animate-bounce" />
                    <div className="w-1 h-1 rounded-full bg-muted animate-bounce delay-100" />
                    <div className="w-1 h-1 rounded-full bg-muted animate-bounce delay-200" />
                  </div>
                  Assistant is processing...
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setChatInput("Highlight enhancing tumor regions")}
              className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-muted uppercase tracking-wider hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Highlight tumor
            </button>
            <button 
              onClick={() => setChatInput("Summarize volume changes")}
              className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-muted uppercase tracking-wider hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Summarize changes
            </button>
            <button 
              onClick={() => setChatInput("Clinical interpretation of edema")}
              className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-muted uppercase tracking-wider hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Interpret edema
            </button>
          </div>

          {/* Chat Input */}
          <div className="p-6 bg-surface/40 border-t border-border">
            <form onSubmit={handleSendChat} className="relative group">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about scan data, metrics, or clinical findings..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-gray-200 focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || sendingChat}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent hover:bg-accent-hover text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
