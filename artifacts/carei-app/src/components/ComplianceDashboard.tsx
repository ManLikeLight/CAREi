import React, { useState, useEffect, useCallback } from "react";
import { useGetComplianceDashboard, getGetComplianceDashboardQueryKey } from "@workspace/api-client-react";
import type {
  ComplianceDashboard,
  ComplianceArea,
  ComplianceFlag,
  ComplianceDashboardOverallStatus
} from "@workspace/api-client-react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Printer,
  AlertTriangle,
  FileText
} from "lucide-react";
import { loadEncrypted, saveEncrypted } from "../lib/careStore";

const C = {
  navy: "#1B2A49", dark: "#0F1D34", teal: "#4FD1C5", teal2: "#38B2AC",
  amber: "#F6B73C", red: "#FF5A5F", green: "#22C55E",
  g0: "#F8FAFC", g1: "#E2E8F0", g2: "#94A3B8", g3: "#475569", g4: "#64748B",
};

// Safe PDF export via print window
function exportToPDF(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #000; padding: 40px; max-width: 900px; margin: 0 auto; }
          h1 { color: #1B2A49; margin-bottom: 5px; font-size: 24px; }
          h2 { color: #1B2A49; border-bottom: 2px solid #4FD1C5; padding-bottom: 4px; margin-top: 30px; font-size: 18px; }
          h3 { color: #333; margin-top: 20px; font-size: 16px; }
          .meta { color: #555; font-size: 13px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
          .section { margin-bottom: 20px; }
          .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
          .status-green { background: #dcfce7; color: #166534; }
          .status-amber { background: #fef08a; color: #854d0e; }
          .status-red { background: #fee2e2; color: #991b1b; }
          .status-unknown { background: #f1f5f9; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f9f9f9; color: #333; }
          .disclaimer { margin-top: 40px; font-size: 11px; color: #666; font-style: italic; border-top: 1px solid #eee; padding-top: 15px; }
          .footer { margin-top: 20px; font-size: 11px; color: #888; text-align: center; }
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

export default function ComplianceDashboardScreen({ 
  sessionToken,
  cryptoKey,
  onNavigateToRecord
}: {
  sessionToken?: string;
  cryptoKey?: CryptoKey;
  onNavigateToRecord: (targetScreen: string, clientId?: string) => void;
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedData, setCachedData] = useState<ComplianceDashboard | null>(null);
  
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

  const { data, isLoading, isError, error, refetch, isFetching } = useGetComplianceDashboard({
    request: {
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
    },
    query: {
      queryKey: getGetComplianceDashboardQueryKey(),
      enabled: isOnline,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  });

  // Hydrate offline cache
  useEffect(() => {
    if (cryptoKey) {
      loadEncrypted<ComplianceDashboard>(cryptoKey, 'compliance_dashboard_cache').then(cached => {
        if (cached && !data) {
          setCachedData(cached);
        }
      }).catch(() => {});
    }
  }, [cryptoKey, data]);

  // Save to offline cache when we get new data
  useEffect(() => {
    if (data && cryptoKey) {
      setCachedData(data);
      saveEncrypted(cryptoKey, 'compliance_dashboard_cache', data).catch(() => {});
    }
  }, [data, cryptoKey]);

  const activeData = data || cachedData;
  const showOfflineBanner = !isOnline && !!activeData;

  const handlePrint = useCallback(() => {
    if (!activeData) return;
    
    const getStatusClass = (status: string) => {
      switch(status) {
        case 'green': return 'status-green';
        case 'amber': return 'status-amber';
        case 'red': return 'status-red';
        default: return 'status-unknown';
      }
    };
    
    let html = `
      <h1>CAREi Compliance Dashboard</h1>
      <div class="meta">
        <strong>Agency:</strong> ${escapeHtml(activeData.agency)}<br/>
        <strong>Generated:</strong> ${new Date(activeData.generatedAt).toLocaleString("en-GB")}<br/>
        <strong>Data Freshness:</strong> ${escapeHtml(activeData.dataFreshness)}<br/>
        <strong>Overall Position:</strong> <span class="status-badge ${getStatusClass(activeData.overallStatus)}">${activeData.overallStatus.toUpperCase()}</span>
      </div>
      
      <h2>Summary Statistics</h2>
      <table>
        <tr>
          <th>Total Monitored Visits</th>
          <th>Total Medication Events</th>
          <th>Active Compliance Flags</th>
        </tr>
        <tr>
          <td>${activeData.counts.visits}</td>
          <td>${activeData.counts.medications}</td>
          <td>${activeData.counts.flags}</td>
        </tr>
      </table>
      
      <h2>Compliance Areas</h2>
    `;
    
    activeData.areas.forEach(area => {
      html += `
        <div class="section">
          <h3>${escapeHtml(area.label)} - <span class="status-badge ${getStatusClass(area.status)}">${area.status.toUpperCase()}</span></h3>
          <p style="font-size: 12px; color: #555;"><strong>Ref:</strong> ${escapeHtml(area.referenceLabel)}</p>
          <p style="font-size: 12px; color: #555; margin-bottom: 15px;"><strong>Frameworks:</strong> ${(area.frameworks || []).join(", ")}</p>
      `;
      
      if (area.flags && area.flags.length > 0) {
        html += `
          <table>
            <tr>
              <th>Reason</th>
              <th>Rule</th>
              <th>Required Action</th>
            </tr>
            ${area.flags.map(f => `
              <tr>
                <td>${escapeHtml(f.reason)}</td>
                <td>${escapeHtml(f.rule)}</td>
                <td>${escapeHtml(f.action)}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        html += `<p>No active flags in this area.</p>`;
      }
      
      html += `</div>`;
    });
    
    html += `
      <div class="disclaimer">
        <strong>Disclaimer:</strong> ${escapeHtml(activeData.disclaimer)}
      </div>
      <div class="footer">Confidential & Proprietary - Generated via CAREi</div>
    `;
    
    exportToPDF(`Compliance_Report_${activeData.agency}_${new Date().toISOString().split('T')[0]}`, html);
  }, [activeData]);

  const handleFlagAction = (flag: ComplianceFlag) => {
    // Navigate based on targetKind
    switch (flag.targetKind) {
      case 'visit':
        onNavigateToRecord('visit-history', flag.clientId);
        break;
      case 'mar':
        onNavigateToRecord('medication', flag.clientId);
        break;
      case 'carer':
        onNavigateToRecord('admin-dashboard', flag.clientId); // No direct carer view except admin dashboard overview
        break;
      default:
        onNavigateToRecord('client-overview', flag.clientId);
    }
  };

  const getActionLabel = (kind: string) => {
    switch(kind) {
      case 'visit': return 'Open visit history';
      case 'mar': return 'Open MAR record';
      case 'carer': return 'Open staff overview';
      default: return 'Open record';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return C.green;
      case 'amber': return C.amber;
      case 'red': return C.red;
      default: return C.g3;
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'green': return "rgba(34,197,94,0.15)";
      case 'amber': return "rgba(246,183,60,0.15)";
      case 'red': return "rgba(255,90,95,0.15)";
      default: return "rgba(100,116,139,0.15)";
    }
  };

  const getStatusIcon = (status: string, size = 18) => {
    switch (status) {
      case 'green': return <CheckCircle size={size} color={C.green} />;
      case 'amber': return <AlertTriangle size={size} color={C.amber} />;
      case 'red': return <AlertCircle size={size} color={C.red} />;
      default: return <Info size={size} color={C.g3} />;
    }
  };

  if (isLoading && !cachedData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, height: "100%" }}>
        <Loader2 size={32} className="animate-spin" color={C.teal} style={{ marginBottom: 16 }} />
        <div style={{ color: C.g2, fontSize: 14 }}>Loading live compliance data...</div>
      </div>
    );
  }

  if (isError && !activeData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, height: "100%" }}>
        <AlertTriangle size={48} color={C.red} style={{ marginBottom: 16 }} />
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Unable to load compliance data</div>
        <div style={{ color: C.g2, fontSize: 14, textAlign: "center", maxWidth: 400, marginBottom: 24 }}>
          {!isOnline ? "You are currently offline and have no cached data available." : "An error occurred while fetching compliance records."}
        </div>
        <button 
          onClick={() => refetch()}
          disabled={!isOnline || isFetching}
          style={{
            padding: "10px 20px", background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})`, color: C.dark,
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: !isOnline || isFetching ? "not-allowed" : "pointer",
            opacity: !isOnline || isFetching ? 0.6 : 1
          }}
        >
          {isFetching ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  }

  if (!activeData) return null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {showOfflineBanner && (
        <div style={{ 
          background: "rgba(246,183,60,0.1)", border: `1px solid ${C.amber}40`, borderRadius: 8, 
          padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 
        }}>
          <AlertTriangle size={18} color={C.amber} style={{ marginTop: 2 }} />
          <div>
            <div style={{ color: C.amber, fontWeight: 600, fontSize: 13 }}>Offline Mode — Viewing Stale Data</div>
            <div style={{ color: C.g2, fontSize: 12, marginTop: 4 }}>
              You are currently offline. This dashboard shows the last known compliance state and cannot be refreshed until your connection is restored.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={24} color={C.teal} />
            Live Compliance Position
          </h2>
          <div style={{ color: C.g2, fontSize: 13, marginTop: 4 }}>
            {activeData.agency} · Evidence generated at {new Date(activeData.generatedAt).toLocaleString("en-GB")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button 
            onClick={() => refetch()}
            disabled={!isOnline || isFetching}
            style={{ 
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: !isOnline ? C.g4 : C.g1, fontSize: 13, cursor: !isOnline ? "not-allowed" : "pointer"
            }}
          >
            <Loader2 size={14} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing..." : "Refresh Data"}
          </button>
          <button 
            onClick={handlePrint}
            style={{ 
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
              background: "rgba(79,209,197,0.15)", border: `1px solid rgba(79,209,197,0.3)`,
              color: C.teal, fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}
          >
            <Printer size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.g2, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Overall Status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              background: getStatusBg(activeData.overallStatus), 
              width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              {getStatusIcon(activeData.overallStatus, 24)}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: getStatusColor(activeData.overallStatus), textTransform: "capitalize" }}>
                {activeData.overallStatus}
              </div>
              <div style={{ fontSize: 12, color: C.g3 }}>Based on {activeData.areas.length} areas</div>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.g2, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Flags</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: activeData.overallStatus === 'unknown' ? C.g3 : (activeData.counts.flags > 0 ? C.amber : C.green) }}>
            {activeData.overallStatus === 'unknown' ? 'Unknown' : activeData.counts.flags}
          </div>
          <div style={{ fontSize: 12, color: C.g3 }}>
            {activeData.overallStatus === 'unknown' ? 'No recent data available' : 'Requires manager action'}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ color: C.g2, fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Monitored Events</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{activeData.counts.visits}</div>
              <div style={{ fontSize: 12, color: C.g3 }}>Visits</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{activeData.counts.medications}</div>
              <div style={{ fontSize: 12, color: C.g3 }}>Meds</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Areas List */}
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
        Evidence Areas
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {activeData.areas.map(area => (
          <div key={area.key} style={{ 
            background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.08)`, 
            borderRadius: 12, overflow: "hidden" 
          }}>
            {/* Area Header */}
            <div style={{ 
              padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center",
              borderBottom: area.flags.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2 }}>{getStatusIcon(area.status, 20)}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>{area.label}</div>
                  <div style={{ color: C.g3, fontSize: 12, marginTop: 4 }}>
                    <strong>Ref:</strong> {area.referenceLabel} <br/>
                    <strong>Frameworks:</strong> {(area.frameworks || []).join(", ")}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                background: getStatusBg(area.status), color: getStatusColor(area.status),
                padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, textTransform: "capitalize", alignSelf: "flex-start"
              }}>
                {area.status}
              </div>
            </div>

            {/* Area Flags */}
            {area.flags.length > 0 && (
              <div style={{ padding: 0, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                      <th style={{ padding: "10px 20px", textAlign: "left", color: C.g2, fontSize: 11, fontWeight: 600, width: "30%" }}>Reason</th>
                      <th style={{ padding: "10px 20px", textAlign: "left", color: C.g2, fontSize: 11, fontWeight: 600, width: "30%" }}>Rule</th>
                      <th style={{ padding: "10px 20px", textAlign: "left", color: C.g2, fontSize: 11, fontWeight: 600, width: "25%" }}>Action & Ref</th>
                      <th style={{ padding: "10px 20px", textAlign: "right", color: C.g2, fontSize: 11, fontWeight: 600, width: "15%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {area.flags.map((flag, idx) => (
                      <tr key={idx} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <td style={{ padding: "12px 20px", color: "#fff", fontSize: 13, verticalAlign: "top" }}>
                          {flag.reason}
                        </td>
                        <td style={{ padding: "12px 20px", color: C.g2, fontSize: 12, verticalAlign: "top" }}>
                          <span style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                            {flag.rule}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", color: C.amber, fontSize: 13, verticalAlign: "top" }}>
                          <div>{flag.action}</div>
                          <div style={{ fontSize: 11, color: C.g3, marginTop: 4 }}>Ref: {flag.targetId}</div>
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right", verticalAlign: "top" }}>
                          <button 
                            onClick={() => handleFlagAction(flag)}
                            style={{ 
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: "rgba(79,209,197,0.1)", color: C.teal, border: "1px solid rgba(79,209,197,0.2)",
                              padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                              transition: "all 0.2s", whiteSpace: "nowrap"
                            }}
                          >
                            <FileText size={14} /> {getActionLabel(flag.targetKind)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ 
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
        padding: "12px 16px", color: C.g3, fontSize: 11, display: "flex", gap: 10
      }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: C.g2 }}>Disclaimer:</strong> {activeData.disclaimer}
        </div>
      </div>
    </div>
  );
}
