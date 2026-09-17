import React, { useState, useEffect, useCallback } from "react";
import { 
  useGenerateDocument, 
  useConfirmDocument, 
  useListDocuments,
  getListDocumentsQueryKey,
  useGenerateReport, 
  useListReports,
  getListReportsQueryKey
} from "@workspace/api-client-react";
import type { 
  DocumentGenerationInput, 
  DocumentDraft, 
  DocumentConfirmationInput, 
  DocumentSection, 
  GeneratedDocument, 
  GeneratedReport,
  ReportGenerationInput 
} from "@workspace/api-client-react";
import { saveEncrypted, loadEncrypted } from "../lib/careStore";
import { 
  FileText, BarChart2, Plus, Clock, Download, ChevronRight, 
  Check, AlertTriangle, Save, Loader2, ArrowLeft, Trash2
} from "lucide-react";

type Props = {
  role: "carer" | "manager";
  userName: string;
  userEmail: string;
  clients: { id: string; name: string }[];
  cryptoKey?: CryptoKey;
  onBack?: () => void;
};

const C = {
  navy: "#1B2A49", dark: "#0F1D34", teal: "#4FD1C5", teal2: "#38B2AC",
  amber: "#F6B73C", red: "#FF5A5F", green: "#22C55E",
  g0: "#F8FAFC", g1: "#E2E8F0", g2: "#94A3B8", g3: "#475569", g4: "#64748B",
};

// --- PDF Export Helpers ---
function exportToPDF(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #000; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1B2A49; margin-bottom: 5px; }
          h2 { color: #1B2A49; border-bottom: 2px solid #4FD1C5; padding-bottom: 4px; margin-top: 30px; font-size: 18px; }
          .meta { color: #555; font-size: 13px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
          .section { margin-bottom: 20px; }
          .section-content { white-space: pre-wrap; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f9f9f9; color: #333; }
          .footer { margin-top: 50px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

function escapeHtml(unsafe: string) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type Tab = "documents" | "reports";
type DocView = "list" | "new" | "draft" | "view";
type ReportView = "list" | "new" | "view";

export default function DocumentReportStudio({ role, userName, userEmail, clients, cryptoKey, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Hydration state
  const [hydrationComplete, setHydrationComplete] = useState(false);
  const [hydrationFailed, setHydrationFailed] = useState(false);

  // --- Document State ---
  const [docView, setDocView] = useState<DocView>("list");
  const [docDraft, setDocDraft] = useState<DocumentDraft | null>(null);
  const [viewDoc, setViewDoc] = useState<GeneratedDocument | null>(null);

  // New Doc Form
  const [newDocTemplate, setNewDocTemplate] = useState<"incident_report" | "care_assessment_summary" | "general_letter">("incident_report");
  const [newDocClient, setNewDocClient] = useState<string>("");
  const [newDocFreeText, setNewDocFreeText] = useState("");
  const [newDocStructured, setNewDocStructured] = useState<{key: string, value: string}[]>([{key: "", value: ""}]);

  // Draft Editing State
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSections, setEditingSections] = useState<DocumentSection[]>([]);
  const [isQueueingDoc, setIsQueueingDoc] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // --- Report State ---
  const [reportView, setReportView] = useState<ReportView>("list");
  const [newReportRequest, setNewReportRequest] = useState("");
  const [newReportClient, setNewReportClient] = useState<string>("");
  const [viewReport, setViewReport] = useState<GeneratedReport | null>(null);
  const [isQueueingReport, setIsQueueingReport] = useState(false);

  // Lists
  const listDocsQuery = useListDocuments(
    { userEmail }, 
    { query: { enabled: activeTab === "documents" && docView === "list", queryKey: getListDocumentsQueryKey({ userEmail }) } }
  );
  const listReportsQuery = useListReports(
    { userEmail }, 
    { query: { enabled: activeTab === "reports" && role === "manager", queryKey: getListReportsQueryKey({ userEmail }) } }
  );
  
  const generateDocMut = useGenerateDocument();
  const confirmDocMut = useConfirmDocument();
  const generateReportMut = useGenerateReport();

  // Offline Queues
  const [offlineDocQueue, setOfflineDocQueue] = useState<DocumentGenerationInput[]>([]);
  const [offlineReportQueue, setOfflineReportQueue] = useState<ReportGenerationInput[]>([]);

  // Load offline queues & draft
  useEffect(() => {
    setHydrationComplete(false);
    setHydrationFailed(false);
    if (!cryptoKey) {
      setHydrationComplete(true);
      return;
    }
    Promise.all([
      loadEncrypted<DocumentGenerationInput[]>(cryptoKey, `doc_queue_${userEmail}`),
      loadEncrypted<ReportGenerationInput[]>(cryptoKey, `rep_queue_${userEmail}`),
      loadEncrypted<{draft: DocumentDraft, title: string, sections: DocumentSection[]}>(cryptoKey, `saved_draft_${userEmail}`),
      loadEncrypted<{
        docTemplate: any,
        docClient: string,
        docFreeText: string,
        docStructured: {key: string, value: string}[],
        repRequest: string,
        repClient: string
      }>(cryptoKey, `studio_form_${userEmail}`)
    ]).then(([dq, rq, d, formState]) => {
      if (dq) setOfflineDocQueue(dq);
      if (rq) setOfflineReportQueue(rq);
      if (d && d.draft) {
        setDocDraft(d.draft);
        setEditingTitle(d.title);
        setEditingSections(d.sections);
        setDocView("draft");
      }
      if (formState) {
        if (formState.docTemplate) setNewDocTemplate(formState.docTemplate);
        if (formState.docClient !== undefined) setNewDocClient(formState.docClient);
        if (formState.docFreeText !== undefined) setNewDocFreeText(formState.docFreeText);
        if (formState.docStructured) setNewDocStructured(formState.docStructured);
        if (formState.repRequest !== undefined) setNewReportRequest(formState.repRequest);
        if (formState.repClient !== undefined) setNewReportClient(formState.repClient);
      }
      setHydrationComplete(true);
    }).catch(e => {
      console.error("Hydration failed", e);
      setHydrationFailed(true);
      setSyncError("Secure storage could not be unlocked. Encrypted drafts and offline queues are temporarily unavailable.");
    });
  }, [cryptoKey, userEmail]);

  // Save offline queues & draft
  useEffect(() => {
    if (cryptoKey && hydrationComplete) {
      saveEncrypted(cryptoKey, `doc_queue_${userEmail}`, offlineDocQueue)
        .catch(() => setSyncError("Failed to save offline document queue"));
    }
  }, [offlineDocQueue, cryptoKey, userEmail, hydrationComplete]);

  useEffect(() => {
    if (cryptoKey && hydrationComplete) {
      saveEncrypted(cryptoKey, `rep_queue_${userEmail}`, offlineReportQueue)
        .catch(() => setSyncError("Failed to save offline report queue"));
    }
  }, [offlineReportQueue, cryptoKey, userEmail, hydrationComplete]);

  useEffect(() => {
    if (cryptoKey && hydrationComplete) {
      if (docDraft) {
        saveEncrypted(cryptoKey, `saved_draft_${userEmail}`, { draft: docDraft, title: editingTitle, sections: editingSections })
          .catch(() => setSyncError("Failed to save document draft"));
      } else {
        saveEncrypted(cryptoKey, `saved_draft_${userEmail}`, null)
          .catch(() => setSyncError("Failed to clear document draft"));
      }
    }
  }, [docDraft, editingTitle, editingSections, cryptoKey, userEmail, hydrationComplete]);

  useEffect(() => {
    if (cryptoKey && hydrationComplete) {
      saveEncrypted(cryptoKey, `studio_form_${userEmail}`, {
        docTemplate: newDocTemplate,
        docClient: newDocClient,
        docFreeText: newDocFreeText,
        docStructured: newDocStructured,
        repRequest: newReportRequest,
        repClient: newReportClient
      }).catch(() => setSyncError("Failed to save form state"));
    }
  }, [newDocTemplate, newDocClient, newDocFreeText, newDocStructured, newReportRequest, newReportClient, cryptoKey, userEmail, hydrationComplete]);

  // Auto-process queues when online
  useEffect(() => {
    let mounted = true;
    if (hydrationComplete && isOnline && offlineDocQueue.length > 0 && !docDraft && !generateDocMut.isPending && !isQueueingDoc) {
      const processDocQueue = async () => {
        const input = offlineDocQueue[0];
        try {
          const draft = await generateDocMut.mutateAsync({ data: input });
          if (!mounted) return;
          
          // Restore the exact form state for this queued item so confirmation preserves provenance
          setNewDocTemplate(input.templateType as any);
          setNewDocClient(input.client?.id || "");
          setNewDocFreeText(input.freeText);
          const structArray = Object.entries(input.structuredDetails).map(([k,v]) => ({key: k, value: v}));
          setNewDocStructured(structArray.length ? structArray : [{key: "", value: ""}]);
          
          setDocDraft(draft);
          setEditingTitle(draft.title);
          setEditingSections(draft.sections.map(s => ({...s})));
          setDocView("draft");
          setOfflineDocQueue(prev => prev.slice(1));
          setSyncError(null);
        } catch (e) {
          if (!mounted) return;
          setSyncError("Failed to process queued document. Will retry later.");
        }
      };
      processDocQueue();
    }
    return () => { mounted = false; };
  }, [isOnline, offlineDocQueue, docDraft, generateDocMut.isPending, isQueueingDoc, hydrationComplete]);

  useEffect(() => {
    let mounted = true;
    if (hydrationComplete && isOnline && offlineReportQueue.length > 0 && !generateReportMut.isPending && !isQueueingReport) {
      const processRepQueue = async () => {
        let remaining = [...offlineReportQueue];
        let hasError = false;
        for (const input of offlineReportQueue) {
          try {
            await generateReportMut.mutateAsync({ data: input });
            if (!mounted) return;
            remaining = remaining.filter(item => item !== input);
          } catch (e) {
            hasError = true;
            break;
          }
        }
        if (mounted) {
          setOfflineReportQueue(remaining);
          if (hasError) {
            setSyncError("Failed to process some queued reports.");
          } else {
            setSyncError(null);
          }
          if (remaining.length < offlineReportQueue.length && activeTab === "reports") {
            listReportsQuery.refetch();
          }
        }
      };
      processRepQueue();
    }
    return () => { mounted = false; };
  }, [isOnline, offlineReportQueue, generateReportMut.isPending, isQueueingReport, activeTab, listReportsQuery]);


  // --- Document Actions ---
  const handleGenerateDoc = async () => {
    if (!newDocFreeText.trim()) return;
    
    const structured: Record<string, string> = {};
    newDocStructured.forEach(item => {
      if (item.key.trim() && item.value.trim()) {
        structured[item.key.trim()] = item.value.trim();
      }
    });

    const clientObj = clients.find(c => c.id === newDocClient);
    const input: DocumentGenerationInput = {
      templateType: newDocTemplate,
      freeText: newDocFreeText,
      structuredDetails: structured,
      identity: { userName, userEmail, userRole: role },
      client: clientObj ? { id: clientObj.id, name: clientObj.name } : undefined
    };

    if (!isOnline) {
      if (!cryptoKey) {
        setSyncError("Cannot securely preserve this request until the app is unlocked.");
        return;
      }
      setOfflineDocQueue(prev => [...prev, input]);
      setIsQueueingDoc(true);
      setTimeout(() => {
        setIsQueueingDoc(false);
        setDocView("list");
      }, 1500);
      return;
    }

    try {
      const draft = await generateDocMut.mutateAsync({ data: input });
      setDocDraft(draft);
      setEditingTitle(draft.title);
      setEditingSections(draft.sections.map(s => ({...s})));
      setDocView("draft");
      setSyncError(null);
    } catch (e) {
      setSyncError("Generation failed. Please try again.");
    }
  };

  const handleConfirmDoc = async () => {
    if (!docDraft) return;
    if (!isOnline) {
      alert("Cannot confirm documents while offline. Please connect to internet.");
      return;
    }

    const clientObj = clients.find(c => c.id === newDocClient);
    
    const input: DocumentConfirmationInput = {
      documentType: docDraft.documentType as any,
      title: editingTitle,
      sections: editingSections,
      sourceDetails: { originalFreeText: newDocFreeText },
      identity: { userName, userEmail, userRole: role },
      client: clientObj ? { id: clientObj.id, name: clientObj.name } : undefined
    };

    try {
      await confirmDocMut.mutateAsync({ data: input });
      setDocDraft(null);
      setDocView("list");
      listDocsQuery.refetch();
      setSyncError(null);
    } catch (e) {
      setSyncError("Confirm failed. Please try again.");
    }
  };

  const handleExportDoc = (doc: GeneratedDocument) => {
    const html = `
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="meta">
        <strong>Generated By:</strong> ${escapeHtml(doc.userName)} (${escapeHtml(doc.userRole)})<br/>
        <strong>Date:</strong> ${new Date(doc.createdAt).toLocaleString("en-GB")}<br/>
        ${doc.clientName ? `<strong>Client:</strong> ${escapeHtml(doc.clientName)}<br/>` : ''}
        <strong>Status:</strong> Confirmed
      </div>
      ${doc.sections.map(s => `
        <div class="section">
          <h2>${escapeHtml(s.heading)}</h2>
          <div class="section-content">${escapeHtml(s.content)}</div>
        </div>
      `).join('')}
      <div class="footer">Generated via CAREi Workspace</div>
    `;
    exportToPDF(doc.title, html);
  };


  const handleGenerateReport = async () => {
    if (!newReportRequest.trim() || !newReportClient) return;

    const clientObj = clients.find(c => c.id === newReportClient);
    if (!clientObj) return;

    const input: ReportGenerationInput = {
      request: newReportRequest,
      userName,
      userEmail,
      client: { id: clientObj.id, name: clientObj.name },
      currentDateTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    if (!isOnline) {
      if (!cryptoKey) {
        setSyncError("Cannot securely preserve this request until the app is unlocked.");
        return;
      }
      setOfflineReportQueue(prev => [...prev, input]);
      setIsQueueingReport(true);
      setTimeout(() => {
        setIsQueueingReport(false);
        setReportView("list");
      }, 1500);
      return;
    }

    try {
      const report = await generateReportMut.mutateAsync({ data: input });
      setViewReport(report);
      setReportView("view");
      listReportsQuery.refetch();
      setSyncError(null);
    } catch (e) {
      setSyncError("Report generation failed. Please try again.");
    }
  };

  const handleExportReport = (report: GeneratedReport) => {
    let rowsHtml = '';
    if (report.underlyingData && report.underlyingData.length > 0) {
      const keys = Object.keys(report.underlyingData[0] || {});
      rowsHtml = `
        <h2>Underlying Data Source (${report.rowCount} records)</h2>
        <table>
          <thead>
            <tr>${keys.map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${report.underlyingData.map(row => `
              <tr>${keys.map(k => `<td>${escapeHtml(String((row as any)[k] ?? ''))}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <h1>Data Report: ${escapeHtml(report.reportType.replace('_', ' ').toUpperCase())}</h1>
      <div class="meta">
        <strong>Requested By:</strong> ${escapeHtml(report.userName)}<br/>
        <strong>Date Generated:</strong> ${new Date(report.createdAt).toLocaleString("en-GB")}<br/>
        <strong>Client:</strong> ${escapeHtml(report.clientName || 'N/A')}<br/>
        <strong>Period:</strong> ${escapeHtml(report.dateFrom)} to ${escapeHtml(report.dateTo)}<br/>
        <strong>Request:</strong> ${escapeHtml(report.request)}
      </div>
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="section-content">${escapeHtml(report.narrative)}</div>
      </div>
      ${rowsHtml}
      <div class="footer">Generated via CAREi Workspace</div>
    `;
    exportToPDF(`Report - ${report.clientName}`, html);
  };


  // --- Renders ---

  const renderNewDocument = () => (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setDocView("list")} style={{ background: "transparent", border: "none", color: C.g2, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Create New Document</h2>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Template Type</label>
            <select 
              value={newDocTemplate} 
              onChange={e => setNewDocTemplate(e.target.value as any)}
              style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
            >
              <option value="incident_report">Incident Report</option>
              <option value="care_assessment_summary">Care Assessment Summary</option>
              <option value="general_letter">General Letter</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Client (Optional)</label>
            <select 
              value={newDocClient} 
              onChange={e => setNewDocClient(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
            >
              <option value="">None / General</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Plain-English Details</label>
          <p style={{ fontSize: 12, color: C.g3, marginBottom: 8 }}>Describe what happened, observations, or key points. The AI will structure this into professional language.</p>
          <textarea 
            value={newDocFreeText}
            onChange={e => setNewDocFreeText(e.target.value)}
            rows={5}
            placeholder="e.g. Found Mrs. Smith asleep in chair, roused easily but complained of slight dizziness..."
            style={{ width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600 }}>Key Details (Optional)</label>
              <span style={{ fontSize: 12, color: C.g3 }}>Exact facts to include (e.g. Time, Temperature, Location)</span>
            </div>
            <button onClick={() => setNewDocStructured([...newDocStructured, {key: "", value: ""}])} style={{ background: "rgba(79,209,197,0.1)", color: C.teal, border: "1px solid rgba(79,209,197,0.2)", padding: "4px 10px", borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <Plus size={14} /> Add Detail
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {newDocStructured.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <input 
                  placeholder="e.g. BP" 
                  value={item.key} 
                  onChange={e => {
                    const next = [...newDocStructured];
                    next[i].key = e.target.value;
                    setNewDocStructured(next);
                  }}
                  style={{ flex: 1, padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }} 
                />
                <input 
                  placeholder="e.g. 120/80" 
                  value={item.value} 
                  onChange={e => {
                    const next = [...newDocStructured];
                    next[i].value = e.target.value;
                    setNewDocStructured(next);
                  }}
                  style={{ flex: 2, padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none" }} 
                />
                <button onClick={() => {
                  if (newDocStructured.length === 1) return setNewDocStructured([{key: "", value: ""}]);
                  setNewDocStructured(newDocStructured.filter((_, idx) => idx !== i));
                }} style={{ background: "rgba(255,90,95,0.1)", color: C.red, border: "none", borderRadius: 8, width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
          <button onClick={() => setDocView("list")} style={{ padding: "10px 20px", background: "transparent", color: C.g2, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          
          <button 
            onClick={handleGenerateDoc} 
            disabled={!newDocFreeText.trim() || generateDocMut.isPending || isQueueingDoc}
            style={{ 
              padding: "10px 24px", 
              background: !newDocFreeText.trim() ? "rgba(255,255,255,0.1)" : `linear-gradient(90deg, ${C.teal}, ${C.teal2})`, 
              color: !newDocFreeText.trim() ? C.g3 : C.dark, 
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, 
              cursor: !newDocFreeText.trim() || generateDocMut.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8
            }}
          >
            {generateDocMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 
             isQueueingDoc ? <Check size={16} /> :
             !isOnline ? <Save size={16} /> :
             <FileText size={16} />}
            {isQueueingDoc ? "Queued" : generateDocMut.isPending ? "Generating..." : !isOnline ? "Save to Queue" : "Generate Draft"}
          </button>
        </div>
        
        {!isOnline && (
          <div style={{ marginTop: 16, background: "rgba(246,183,60,0.1)", border: `1px solid ${C.amber}40`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={18} color={C.amber} style={{ marginTop: 2 }} />
            <div>
              <div style={{ color: C.amber, fontWeight: 600, fontSize: 13 }}>You are currently offline</div>
              <div style={{ color: C.g2, fontSize: 12, marginTop: 4 }}>This document request will be securely queued and automatically generated when your connection is restored.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDraftEditor = () => (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setDocView("list")} style={{ background: "transparent", border: "none", color: C.g2, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Review & Confirm Draft</h2>
        <span style={{ background: "rgba(246,183,60,0.15)", color: C.amber, padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1px solid ${C.amber}40` }}>DRAFT</span>
      </div>
      <p style={{ color: C.g2, fontSize: 14, marginBottom: 24, paddingLeft: 30 }}>Please review the generated content. You can edit the title and any section before confirming.</p>

      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "30px 40px", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        
        <input 
          value={editingTitle}
          onChange={e => setEditingTitle(e.target.value)}
          style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px dashed rgba(255,255,255,0.2)", color: "#fff", fontSize: 28, fontWeight: 700, paddingBottom: 10, marginBottom: 30, outline: "none", fontFamily: "DM Serif Display, serif" }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {editingSections.map((sec, idx) => (
            <div key={idx} style={{ position: "relative" }}>
              <input 
                value={sec.heading}
                onChange={e => {
                  const next = [...editingSections];
                  next[idx].heading = e.target.value;
                  setEditingSections(next);
                }}
                style={{ width: "100%", background: "transparent", border: "none", color: C.teal, fontSize: 16, fontWeight: 700, marginBottom: 8, outline: "none" }}
              />
              <textarea 
                value={sec.content}
                onChange={e => {
                  const next = [...editingSections];
                  next[idx].content = e.target.value;
                  setEditingSections(next);
                }}
                rows={Math.max(3, sec.content.split('\n').length)}
                style={{ width: "100%", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, color: C.g1, fontSize: 14, padding: "12px 16px", outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setDocView("list")} style={{ padding: "10px 20px", background: "transparent", color: C.g2, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Discard Draft</button>
          <button 
            onClick={handleConfirmDoc}
            disabled={confirmDocMut.isPending || !isOnline}
            style={{ 
              padding: "10px 24px", 
              background: !isOnline ? "rgba(255,255,255,0.1)" : C.green, 
              color: !isOnline ? C.g3 : "#fff", 
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, 
              cursor: !isOnline || confirmDocMut.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8
            }}
          >
            {confirmDocMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm & Save Document
          </button>
        </div>
        {!isOnline && <div style={{ textAlign: "right", color: C.amber, fontSize: 12, marginTop: 8 }}>Cannot confirm while offline.</div>}
      </div>
    </div>
  );

  const renderViewDocument = () => {
    if (!viewDoc) return null;
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setViewDoc(null); setDocView("list"); }} style={{ background: "transparent", border: "none", color: C.g2, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>View Document</h2>
          </div>
          <button onClick={() => handleExportDoc(viewDoc)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={16} /> Export PDF
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "40px 50px", color: "#000", minHeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: C.navy, fontFamily: "DM Serif Display, serif" }}>{viewDoc.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: 13, color: "#555", marginBottom: 30, paddingBottom: 20, borderBottom: "1px solid #eee" }}>
            <div><strong>Date:</strong> {new Date(viewDoc.createdAt).toLocaleString("en-GB")}</div>
            <div><strong>By:</strong> {viewDoc.userName}</div>
            {viewDoc.clientName && <div><strong>Client:</strong> {viewDoc.clientName}</div>}
            <div><strong>Status:</strong> Confirmed</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {viewDoc.sections.map((sec, idx) => (
              <div key={idx}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, borderBottom: `2px solid ${C.teal}`, paddingBottom: 4, display: "inline-block", marginBottom: 12 }}>{sec.heading}</h3>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#333", whiteSpace: "pre-wrap" }}>{sec.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDocList = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Documents</h2>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 4 }}>Manage incident reports and letters.</div>
        </div>
        <button onClick={() => setDocView("new")} style={{ padding: "9px 18px", background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})`, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={16} /> New Document
        </button>
      </div>

      {offlineDocQueue.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Clock size={20} color={C.amber} />
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{offlineDocQueue.length} Draft{offlineDocQueue.length > 1 ? 's' : ''} Queued</div>
              <div style={{ color: C.g3, fontSize: 12 }}>Will generate when connected to internet</div>
            </div>
          </div>
          {isOnline && <Loader2 size={18} className="animate-spin text-teal-400" />}
        </div>
      )}

      {listDocsQuery.isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.g3 }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto", marginBottom: 12 }} />
          Loading documents...
        </div>
      ) : listDocsQuery.data?.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 60, textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <FileText size={48} color={C.g3} style={{ margin: "0 auto", marginBottom: 16, opacity: 0.5 }} />
          <div style={{ color: C.g1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No documents found</div>
          <div style={{ color: C.g3, fontSize: 13 }}>Create your first incident report or letter.</div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Title", "Type", "Client", "Date", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.g2, fontSize: 12, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listDocsQuery.data?.map((doc, i) => (
                <tr key={doc.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "14px 16px", color: "#fff", fontSize: 14, fontWeight: 500 }}>{doc.title}</td>
                  <td style={{ padding: "14px 16px", color: C.g1, fontSize: 13 }}>{doc.documentType.replace(/_/g, ' ')}</td>
                  <td style={{ padding: "14px 16px", color: C.g2, fontSize: 13 }}>{doc.clientName || '—'}</td>
                  <td style={{ padding: "14px 16px", color: C.g3, fontSize: 12 }}>{new Date(doc.createdAt).toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ background: doc.status === 'confirmed' ? "rgba(34,197,94,0.15)" : "rgba(246,183,60,0.15)", color: doc.status === 'confirmed' ? C.green : C.amber, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {doc.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button onClick={() => { setViewDoc(doc); setDocView("view"); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 12px", color: C.g1, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderNewReport = () => (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setReportView("list")} style={{ background: "transparent", border: "none", color: C.g2, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Request Data Report</h2>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Client *</label>
          <select 
            value={newReportClient} 
            onChange={e => setNewReportClient(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
          >
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: C.g1, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What do you need?</label>
          <textarea 
            value={newReportRequest}
            onChange={e => setNewReportRequest(e.target.value)}
            rows={4}
            placeholder="e.g. Show me all completed visits for the last month, or summarize medication confirmations this week."
            style={{ width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setNewReportRequest("List completed visits for the last 30 days")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: 99, fontSize: 11, color: C.g2, cursor: "pointer" }}>Visits last 30 days</button>
            <button onClick={() => setNewReportRequest("Show medication confirmations for this week")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: 99, fontSize: 11, color: C.g2, cursor: "pointer" }}>Meds this week</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
          <button onClick={() => setReportView("list")} style={{ padding: "10px 20px", background: "transparent", color: C.g2, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button 
            onClick={handleGenerateReport} 
            disabled={!newReportRequest.trim() || !newReportClient || generateReportMut.isPending || isQueueingReport}
            style={{ 
              padding: "10px 24px", 
              background: (!newReportRequest.trim() || !newReportClient) ? "rgba(255,255,255,0.1)" : `linear-gradient(90deg, ${C.teal}, ${C.teal2})`, 
              color: (!newReportRequest.trim() || !newReportClient) ? C.g3 : C.dark, 
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, 
              cursor: (!newReportRequest.trim() || !newReportClient) || generateReportMut.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8
            }}
          >
            {generateReportMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 
             isQueueingReport ? <Check size={16} /> :
             !isOnline ? <Save size={16} /> :
             <BarChart2 size={16} />}
            {isQueueingReport ? "Queued" : generateReportMut.isPending ? "Gathering Data..." : !isOnline ? "Save to Queue" : "Generate Report"}
          </button>
        </div>

        {!isOnline && (
          <div style={{ marginTop: 16, background: "rgba(246,183,60,0.1)", border: `1px solid ${C.amber}40`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={18} color={C.amber} style={{ marginTop: 2 }} />
            <div>
              <div style={{ color: C.amber, fontWeight: 600, fontSize: 13 }}>You are currently offline</div>
              <div style={{ color: C.g2, fontSize: 12, marginTop: 4 }}>This report request will be queued and generated when your connection is restored.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderViewReport = () => {
    if (!viewReport) return null;
    
    const hasData = viewReport.underlyingData && viewReport.underlyingData.length > 0;
    const keys = hasData ? Object.keys(viewReport.underlyingData[0] || {}) : [];

    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setViewReport(null); setReportView("list"); }} style={{ background: "transparent", border: "none", color: C.g2, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Data Report</h2>
            <span style={{ background: "rgba(79,209,197,0.15)", color: C.teal, padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1px solid ${C.teal}40` }}>
              {viewReport.reportType.toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <button onClick={() => handleExportReport(viewReport)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={16} /> Export PDF
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {/* Executive Summary */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "24px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color={C.teal} /> Narrative Summary
            </h3>
            <div style={{ color: C.g1, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {viewReport.narrative}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed rgba(255,255,255,0.1)", display: "flex", gap: 24, color: C.g3, fontSize: 12 }}>
              <div><strong>Client:</strong> {viewReport.clientName || 'All'}</div>
              <div><strong>Period:</strong> {viewReport.dateFrom} — {viewReport.dateTo}</div>
              <div><strong>Records Found:</strong> {viewReport.rowCount}</div>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart2 size={16} color={C.teal} /> Underlying Data Source
              </h3>
              <span style={{ color: C.g3, fontSize: 12 }}>Verifiable Source Records</span>
            </div>
            
            {!hasData ? (
              <div style={{ padding: 40, textAlign: "center", color: C.g3, fontSize: 14 }}>
                No records found for the requested criteria.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                      {keys.map(k => (
                        <th key={k} style={{ padding: "12px 16px", textAlign: "left", color: C.g2, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                          {k.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewReport.underlyingData.map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {keys.map(k => (
                          <td key={k} style={{ padding: "12px 16px", color: C.g1, fontSize: 13 }}>
                            {String((row as any)[k] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReportList = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Data Reports</h2>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 4 }}>Query and verify compliance data.</div>
        </div>
        <button onClick={() => setReportView("new")} style={{ padding: "9px 18px", background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})`, color: C.dark, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={16} /> Request Report
        </button>
      </div>

      {offlineReportQueue.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Clock size={20} color={C.amber} />
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{offlineReportQueue.length} Report{offlineReportQueue.length > 1 ? 's' : ''} Queued</div>
              <div style={{ color: C.g3, fontSize: 12 }}>Will gather data when connected to internet</div>
            </div>
          </div>
          {isOnline && <Loader2 size={18} className="animate-spin text-teal-400" />}
        </div>
      )}

      {listReportsQuery.isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.g3 }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto", marginBottom: 12 }} />
          Loading reports...
        </div>
      ) : listReportsQuery.data?.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 60, textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <BarChart2 size={48} color={C.g3} style={{ margin: "0 auto", marginBottom: 16, opacity: 0.5 }} />
          <div style={{ color: C.g1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No reports generated</div>
          <div style={{ color: C.g3, fontSize: 13 }}>Request your first data report to analyze records.</div>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Type", "Client", "Date Range", "Records", "Generated", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.g2, fontSize: 12, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listReportsQuery.data?.map((rep, i) => (
                <tr key={rep.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "14px 16px", color: "#fff", fontSize: 14, fontWeight: 500 }}>{rep.reportType.replace(/_/g, ' ')}</td>
                  <td style={{ padding: "14px 16px", color: C.g1, fontSize: 13 }}>{rep.clientName || '—'}</td>
                  <td style={{ padding: "14px 16px", color: C.g2, fontSize: 12 }}>{rep.dateFrom} — {rep.dateTo}</td>
                  <td style={{ padding: "14px 16px", color: C.g1, fontSize: 13 }}>
                    <span style={{ background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 99, fontSize: 11 }}>{rep.rowCount}</span>
                  </td>
                  <td style={{ padding: "14px 16px", color: C.g3, fontSize: 12 }}>{new Date(rep.createdAt).toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button onClick={() => { setViewReport(rep); setReportView("view"); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 12px", color: C.g1, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif" }}>
      {syncError && (
        <div style={{ background: "rgba(255,90,95,0.1)", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.red, fontSize: 14, fontWeight: 600 }}>
            <AlertTriangle size={16} /> {syncError}
          </div>
          <button onClick={() => setSyncError(null)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Header / Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 24 }}>
          <button 
            onClick={() => { setActiveTab("documents"); setDocView("list"); setReportView("list"); }}
            style={{ 
              background: "transparent", border: "none", padding: "0 0 8px 0", cursor: "pointer",
              color: activeTab === "documents" ? "#fff" : C.g3, fontSize: 16, fontWeight: activeTab === "documents" ? 700 : 500,
              borderBottom: activeTab === "documents" ? `2px solid ${C.teal}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 8, marginBottom: -17
            }}
          >
            <FileText size={18} /> Documents
          </button>
          
          {role === "manager" && (
            <button 
              onClick={() => { setActiveTab("reports"); setDocView("list"); setReportView("list"); }}
              style={{ 
                background: "transparent", border: "none", padding: "0 0 8px 0", cursor: "pointer",
                color: activeTab === "reports" ? "#fff" : C.g3, fontSize: 16, fontWeight: activeTab === "reports" ? 700 : 500,
                borderBottom: activeTab === "reports" ? `2px solid ${C.teal}` : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 8, marginBottom: -17
              }}
            >
              <BarChart2 size={18} /> Data Reports
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 10 }}>
        {activeTab === "documents" && (
          <>
            {docView === "list" && renderDocList()}
            {docView === "new" && renderNewDocument()}
            {docView === "draft" && renderDraftEditor()}
            {docView === "view" && renderViewDocument()}
          </>
        )}
        
        {activeTab === "reports" && role === "manager" && (
          <>
            {reportView === "list" && renderReportList()}
            {reportView === "new" && renderNewReport()}
            {reportView === "view" && renderViewReport()}
          </>
        )}
      </div>
    </div>
  );
}
