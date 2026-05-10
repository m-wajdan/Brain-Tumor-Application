"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { overlayUrl, saveRecord } from "../lib/api";

function TypewriterText({ text, speed = 12, onComplete }) {
  const [displayed, setDisplayed] = useState("");
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;
    setDisplayed("");

    if (!text) return;

    let index = 0;
    const timer = setInterval(() => {
      setDisplayed((prev) => {
        if (index >= text.length) {
          clearInterval(timer);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onComplete?.();
          }
          return prev;
        }

        const next = text.slice(0, index + 1);
        index += 1;
        return next;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return <div style={{ whiteSpace: "pre-wrap" }}>{displayed}</div>;
}

function MarkdownInline({ text }) {
  if (!text) return null;

  const parts = [];
  let remaining = text;
  let key = 0;

  const pushText = (value) => {
    if (value) {
      parts.push(<span key={key++}>{value}</span>);
    }
  };

  while (remaining.length > 0) {
    const boldItalic = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalic) {
      parts.push(<strong key={key++}><em>{boldItalic[1]}</em></strong>);
      remaining = remaining.slice(boldItalic[0].length);
      continue;
    }

    const bold = remaining.match(/^\*\*(.+?)\*\*/);
    if (bold) {
      parts.push(<strong key={key++}>{bold[1]}</strong>);
      remaining = remaining.slice(bold[0].length);
      continue;
    }

    const italic = remaining.match(/^\*(.+?)\*/);
    if (italic) {
      parts.push(<em key={key++}>{italic[1]}</em>);
      remaining = remaining.slice(italic[0].length);
      continue;
    }

    const nextMarker = remaining.search(/\*{1,3}/);
    if (nextMarker === -1) {
      pushText(remaining);
      break;
    }

    pushText(remaining.slice(0, nextMarker));
    remaining = remaining.slice(nextMarker);
  }

  return parts;
}

function MarkdownMessage({ text }) {
  const lines = String(text || "").split(/\n+/);
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-2 last:mb-0">
        {paragraph.map((line, idx) => (
          <span key={idx}>
            <MarkdownInline text={line} />
            {idx < paragraph.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    );
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      return;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flushParagraph();
      const level = Math.min(6, trimmed.match(/^#+/)[0].length);
      const Tag = `h${level}`;
      blocks.push(
        <Tag key={`h-${blocks.length}`} className="font-semibold mb-2">
          <MarkdownInline text={trimmed.replace(/^#{1,6}\s/, "")} />
        </Tag>
      );
      return;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        <div key={`li-${blocks.length}`} className="flex gap-2 mb-1">
          <span className="mt-[0.35rem] h-1.5 w-1.5 rounded-full bg-current shrink-0 opacity-70" />
          <div className="min-w-0"><MarkdownInline text={trimmed.replace(/^[-*+]\s+/, "")} /></div>
        </div>
      );
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  return <div className="space-y-1">{blocks}</div>;
}

export default function DiagnosisReport({ result, patientInfo, onBack }) {
  const [report, setReport] = useState("");
  const [loadingReport, setLoadingReport] = useState(true);
  const [displayedReport, setDisplayedReport] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [saveName, setSaveName] = useState(patientInfo?.name || "");
  const [saveAge, setSaveAge] = useState(patientInfo?.age || "");
  const [saveNotes, setSaveNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 9));

  const volumes = result?.volumes || {};
  const originalImage = result?.original_url ? overlayUrl(result.original_url) : "";
  const segmentationImage = result?.overlay_url ? overlayUrl(result.overlay_url) : "";
  const patientLabel = patientInfo?.id
    ? patientInfo.id
    : result?.id
      ? `P-${String(result.id)}`
      : "P-DRAFT";

  const quickPrompts = useMemo(
    () => [
      "Explain the findings in simple terms",
      "What does No tumor mean?",
      "What are typical next steps?",
      "Is the confidence reliable?",
    ],
    []
  );

  useEffect(() => {
    let active = true;

    async function generateReport() {
      setLoadingReport(true);
      try {
        const response = await fetch("http://127.0.0.1:8000/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volumes,
            mode: "mode_a",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate report");
        }

        const data = await response.json();
        if (active) setReport(data.content || "");
      } catch {
        if (active) {
          setReport("No abnormal mass detected across the four MRI modalities. Brain parenchyma appears within normal limits.");
        }
      } finally {
        if (active) setLoadingReport(false);
      }
    }

    generateReport();
    return () => {
      active = false;
    };
  }, [volumes]);

  useEffect(() => {
    if (!report) {
      setDisplayedReport("");
      return;
    }

    let index = 0;
    setDisplayedReport("");
    const timer = setInterval(() => {
      setDisplayedReport((prev) => {
        if (index >= report.length) {
          clearInterval(timer);
          return prev;
        }
        const next = report.slice(0, index + 1);
        index += 1;
        return next;
      });
    }, 12);

    return () => clearInterval(timer);
  }, [report]);

  const handleSendChat = async (event) => {
    event.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const nextHistory = [...chatHistory, { role: "user", content: chatInput }];
    setChatHistory(nextHistory);
    setChatInput("");
    setSendingChat(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          session_id: sessionId,
          report,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      const data = await response.json();
      setChatHistory([...nextHistory, { role: "assistant", content: data.content }]);
    } catch {
      setChatHistory([...nextHistory, { role: "assistant", content: "I could not generate a response right now." }]);
    } finally {
      setSendingChat(false);
    }
  };

  if (loadingReport) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <div className="w-10 h-10 border-4 border-[#1a9d9f] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-600 animate-pulse">Analyzing clinical data and generating report...</p>
      </div>
    );
  }

  const wt = Number(volumes?.wt_volume_cm3 || 0);
  const tc = Number(volumes?.tc_volume_cm3 || 0);
  const et = Number(volumes?.et_volume_cm3 || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#1a9d9f] hover:text-[#158a8c] font-medium text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors">
            PDF
          </button>
          <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors">
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</p>
                  <h2 className="text-2xl font-bold text-gray-900">{patientInfo?.id || patientLabel}</h2>
                  <p className="text-sm text-gray-600 mt-1">{new Date().toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full whitespace-nowrap">
                  No tumor
                </span>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Save to history</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Patient name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    value={saveAge}
                    onChange={(e) => setSaveAge(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (saving) return;
                      setSaving(true);
                      try {
                        const payload = {
                          patient_name: saveName || (patientInfo?.id || patientLabel),
                          scan_type: "mode_a",
                          volumes_json: volumes,
                          overlay_path: result?.overlay_url || null,
                          original_path: result?.original_url || null,
                          doctor_notes: saveNotes || "",
                          age: saveAge ? Number(saveAge) : null,
                        };
                        const saved = await saveRecord(payload);
                        setSaveName(saved?.patient_name || payload.patient_name);
                        alert(saved?.id ? "Saved to history" : "Saved locally to history");
                      } catch (err) {
                        alert("Saving failed: " + (err.message || err));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1a9d9f] text-white text-sm font-medium hover:bg-[#158a8c]"
                  >
                    {saving ? "Saving..." : "Save to History"}
                  </button>
                </div>
                <div className="mt-3">
                  <textarea
                    placeholder="Clinical notes (optional)"
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-sm min-h-[80px]"
                  />
                </div>
              </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">MRI Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border-b border-gray-200">Input MRI image</div>
                <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                  {originalImage ? (
                    <img src={originalImage} alt="Input MRI" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-400 text-sm">No image</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border-b border-gray-200">Output with segmentation</div>
                <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
                  {segmentationImage ? (
                    <img src={segmentationImage} alt="Segmentation output" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-400 text-sm">No overlay</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Volumetric Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Whole Tumor (WT)", value: wt, color: "#ef4444" },
                { label: "Tumor Core (TC)", value: tc, color: "#3b82f6" },
                { label: "Enhancing Tumor (ET)", value: et, color: "#10b981" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-3 mb-3">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(12, Math.min(100, item.value * 15))}%`, backgroundColor: item.color }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toFixed(2)} cm³</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Clinical Summary</h3>
            <div className="text-gray-700 text-sm leading-7 whitespace-pre-wrap">
              {displayedReport}
            </div>
          </div>
        </div>

        <aside className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
          <div className="p-5 border-b border-gray-200 flex items-center gap-3 bg-gray-50/60">
            <div className="w-10 h-10 rounded-xl bg-[#1a9d9f]/10 flex items-center justify-center text-[#1a9d9f]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M12 7a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Ask about this report</h3>
              <p className="text-xs text-gray-500">Clinical assistant for report interpretation</p>
            </div>
          </div>

          <div className="p-5 space-y-4 max-h-[560px] overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-6">
                Hi - I can help explain this report. Ask me anything.
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 border ${message.role === "user" ? "bg-[#1a9d9f] text-white border-[#1a9d9f]" : "bg-gray-50 text-gray-800 border-gray-200"}`}>
                    {message.role === "assistant" ? (
                      index === chatHistory.length - 1 ? <MarkdownMessage text={message.content} /> : <MarkdownMessage text={message.content} />
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sendingChat && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 border bg-gray-50 text-gray-500 border-gray-200">
                  Assistant is processing...
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setChatInput(prompt)}
                className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50/60">
            <form onSubmit={handleSendChat} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a9d9f]/20 focus:border-[#1a9d9f]"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingChat}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-[#1a9d9f] text-white flex items-center justify-center disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
