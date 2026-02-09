import { useState, useEffect, useMemo, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faFilePdf, 
  faChevronLeft, 
  faChevronRight, 
  faDownload, 
  faCheckDouble, 
  faRotateLeft, 
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faMagnifyingGlass,
  faCheck,
  faForwardStep, // Icon สำหรับปุ่มข้าม
  faKeyboard     // Icon คีย์บอร์ด
} from "@fortawesome/free-solid-svg-icons";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ตั้งค่า Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [allIssues, setAllIssues] = useState([]);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  // 1. Load CSV
  useEffect(() => {
    fetch("/report_full_683130_THESIS_FULL_PAPER.csv") 
      .then((response) => response.text())
      .then((csvText) => {
        const parsedIssues = [];
        const lines = csvText.trim().split("\n");

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (parts.length < 5) continue;

          let bbox = null;
          try {
            bbox = JSON.parse(parts[4].trim().replace(/^"|"$/g, ''));
            if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.some(v => v !== 0)) bbox = null;
          } catch (e) { bbox = null; }

          parsedIssues.push({ 
              id: i,
              page: parseInt(parts[0].trim()), 
              code: parts[1].trim(), 
              severity: parts[2].trim().toLowerCase(), 
              message: parts[3].trim().replace(/^"|"$/g, ''), 
              bbox,
              isIgnored: false 
          });
        }
        setAllIssues(parsedIssues);
      })
      .catch((error) => console.error("Error loading CSV:", error));
  }, []);

  // ------------------------------------------------------------------
  // Helper Functions (ย้ายมาไว้ข้างบน เพื่อเรียกใช้ใน Logic อื่นได้)
  // ------------------------------------------------------------------
  
  // เช็คสถานะของหน้าที่ระบุ
  const getPageStatus = useCallback((p) => {
    const issues = allIssues.filter(i => i.page === p);
    if (issues.length === 0) return 'clean';
    
    const active = issues.filter(i => !i.isIgnored);
    if (active.some(i => i.severity === 'error')) return 'error';
    if (active.some(i => i.severity === 'warning')) return 'warning';
    
    // ถ้าเคยมี issues แต่แก้หมดแล้ว
    return 'resolved';
  }, [allIssues]);

  // หาหน้าถัดไปที่มีปัญหา (Warning/Error)
  const findNextProblemPage = useCallback(() => {
    if (!numPages) return null;
    for (let p = pageNumber + 1; p <= numPages; p++) {
        const status = getPageStatus(p);
        if (status === 'error' || status === 'warning') {
            return p;
        }
    }
    return null;
  }, [pageNumber, numPages, getPageStatus]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const toggleIssueStatus = (issueId) => {
    setAllIssues(prev => prev.map(issue => issue.id === issueId ? { ...issue, isIgnored: !issue.isIgnored } : issue));
  };

  const handleTogglePageIgnore = () => {
    const pageIssues = allIssues.filter(i => i.page === pageNumber);
    const hasActive = pageIssues.some(i => !i.isIgnored);
    
    // ถ้ามี Active -> Mark Resolved ทั้งหมด
    // ถ้าไม่มี Active -> Undo กลับมา
    setAllIssues(prev => prev.map(issue => issue.page === pageNumber ? { ...issue, isIgnored: hasActive } : issue));
  };

  // [NEW] ฟังก์ชันสำหรับ Speed Review (Approve & Next)
  const handleQuickApproveAndNext = () => {
    // 1. Mark หน้านี้เป็น Resolved (ถ้ามีปัญหา)
    const pageIssues = allIssues.filter(i => i.page === pageNumber);
    const hasActive = pageIssues.some(i => !i.isIgnored);

    if (hasActive) {
        setAllIssues(prev => prev.map(issue => issue.page === pageNumber ? { ...issue, isIgnored: true } : issue));
    }

    // 2. ไปหน้าถัดไปทันที
    if (pageNumber < (numPages || 0)) {
        setPageNumber(p => p + 1);
    }
  };

  // [NEW] ฟังก์ชันกระโดดไปหน้าที่มีปัญหาถัดไป
  const jumpToNextIssue = () => {
      const nextProblemPage = findNextProblemPage();
      if (nextProblemPage) {
          setPageNumber(nextProblemPage);
      } else {
          alert("🎉 เยี่ยมมาก! ตรวจครบทุกหน้าแล้ว ไม่พบปัญหาเหลืออยู่");
      }
  };

  const handleExportCSV = () => {
      const activeIssues = allIssues.filter(i => !i.isIgnored);
      const rows = activeIssues.map(i => `${i.page},${i.code},${i.severity},"${i.message}","${i.bbox ? JSON.stringify(i.bbox) : ''}"`).join("\n");
      const blob = new Blob(["Page,Code,Severity,Message,BBox\n" + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "validated_report.csv";
      link.click();
  };

  // ------------------------------------------------------------------
  // [NEW] Keyboard Shortcuts Listener
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
        // ป้องกันการทำงานถ้า user พิมพ์ในช่อง Input (ถ้ามีอนาคต)
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        switch (e.key) {
            case "ArrowRight":
                setPageNumber(p => Math.min(numPages || 1, p + 1));
                break;
            case "ArrowLeft":
                setPageNumber(p => Math.max(1, p - 1));
                break;
            case "Enter":
                e.preventDefault(); // กัน scroll
                handleQuickApproveAndNext(); // กด Enter เพื่อ Approve + ไปหน้าถัดไป
                break;
            default:
                break;
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, pageNumber, allIssues]); // Dependencies ต้องครบเพื่อให้ state ไม่อัปเดตผิด

  // ------------------------------------------------------------------
  // Render Logic
  // ------------------------------------------------------------------
  const currentPageIssues = useMemo(() => allIssues.filter(i => i.page === pageNumber), [allIssues, pageNumber]);

  const getPageColorClass = (page) => {
    switch (getPageStatus(page)) {
      case "error": return "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100";
      case "warning": return "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100";
      case "resolved": return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100";
      default: return "bg-white text-slate-400 border-slate-200 hover:border-slate-400";
    }
  };

  const renderOverlayBoxes = () => {
    if (!pageDimensions.width || currentPageIssues.length === 0) return null;
    return currentPageIssues.map((issue) => {
      if (!issue.bbox) return null;
      const [x0, y0, x1, y1] = issue.bbox;
      
      let borderColor = issue.severity === 'error' ? 'red' : '#fbbf24';
      let bgColor = issue.severity === 'error' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(251, 191, 36, 0.2)';
      if (issue.isIgnored) { borderColor = '#3b82f6'; bgColor = 'rgba(59, 130, 246, 0.15)'; }

      return (
        <div
          key={issue.id}
          onClick={(e) => { e.stopPropagation(); toggleIssueStatus(issue.id); }}
          className="absolute cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-[1.02]"
          style={{
            left: `${(x0 / pageDimensions.width) * 100}%`,
            top: `${(y0 / pageDimensions.height) * 100}%`,
            width: `${((x1 - x0) / pageDimensions.width) * 100}%`,
            height: `${((y1 - y0) / pageDimensions.height) * 100}%`,
            border: `2px solid ${borderColor}`,
            backgroundColor: bgColor,
            zIndex: 10,
            borderRadius: '4px'
          }}
        />
      );
    });
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-700">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                <FontAwesomeIcon icon={faFilePdf} className="text-lg" />
            </div>
            <div>
                <h1 className="text-base font-bold text-slate-800 leading-tight">Thesis Validator</h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium tracking-wide">
                    <span>AUTOMATED CHECK SYSTEM</span>
                    <span className="text-slate-300">|</span>
                    {/* Tooltip hint สำหรับคีย์ลัด */}
                    <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        <FontAwesomeIcon icon={faKeyboard} /> Press <b className="text-slate-800">Enter</b> to Approve & Next
                    </span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            
            {/* [NEW] Quick Jump Button */}
            <button 
                onClick={jumpToNextIssue}
                className="text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-200 transition-all flex items-center gap-2"
                title="Skip to next error/warning page"
            >
                <span>Next Issue</span>
                <FontAwesomeIcon icon={faForwardStep} />
            </button>

            <div className="h-6 w-px bg-slate-200"></div>

            {/* Pagination */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))} 
                    disabled={pageNumber <= 1} 
                    className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 disabled:opacity-30"
                >
                    <FontAwesomeIcon icon={faChevronLeft} size="xs" />
                </button>
                <span className="text-xs font-mono px-4 w-24 text-center select-none">
                    Page <span className="font-bold text-slate-800">{pageNumber}</span> <span className="text-slate-400">/ {numPages || "-"}</span>
                </span>
                <button 
                    onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} 
                    disabled={pageNumber >= numPages} 
                    className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 disabled:opacity-30"
                >
                    <FontAwesomeIcon icon={faChevronRight} size="xs" />
                </button>
            </div>

            <button 
                onClick={handleExportCSV} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
                <FontAwesomeIcon icon={faDownload} />
                <span>Export Report</span>
            </button>
        </div>
      </header>

      {/* --- Body --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PDF Viewer */}
        <div className="flex-1 bg-slate-100/50 overflow-auto flex justify-center p-8 relative scrollbar-thin scrollbar-thumb-slate-300">
          <div className="relative shadow-2xl h-fit border border-slate-200/60 rounded-sm"> 
            <Document file="/683130_THESIS_FULL_PAPER.pdf" onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
              <Page 
                pageNumber={pageNumber} 
                width={720} 
                className="bg-white"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page) => setPageDimensions({ width: page.originalWidth, height: page.originalHeight })}
              >
                  {renderOverlayBoxes()}
              </Page>
            </Document>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col z-20 shadow-[0_0_20px_rgba(0,0,0,0.03)]">
          
          {/* Status Overview */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Map</h2>
            </div>
            {/* Grid */}
            <div className="grid grid-cols-8 gap-1.5 max-h-[25vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {numPages && Array.from(new Array(numPages), (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPageNumber(p)}
                    className={`aspect-square rounded-[4px] text-[10px] font-medium transition-all border ${getPageColorClass(p)} ${pageNumber === p ? 'ring-2 ring-slate-800 ring-offset-1 z-10' : 'opacity-90'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex gap-4 mt-4 justify-start text-[10px] font-medium text-slate-500 pt-3 border-t border-slate-50">
               <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleXmark} className="text-rose-500" /> Error</span>
               <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-400" /> Warn</span>
               <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleCheck} className="text-blue-500" /> Resolved</span>
            </div>
          </div>

          {/* Issue List Header */}
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
             <div>
                <h3 className="text-sm font-bold text-slate-800">Page {pageNumber}</h3>
                <span className="text-[10px] text-slate-400">{currentPageIssues.length} issues found</span>
             </div>
             
             {currentPageIssues.length > 0 && (
                <button 
                    onClick={handleTogglePageIgnore} 
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5
                        ${currentPageIssues.every(i => i.isIgnored) 
                            ? 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300' 
                            : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                >
                    <FontAwesomeIcon icon={currentPageIssues.every(i => i.isIgnored) ? faRotateLeft : faCheckDouble} />
                    {currentPageIssues.every(i => i.isIgnored) ? "Undo All" : "Resolve All"}
                </button>
             )}
          </div>

          {/* Issue List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
             {currentPageIssues.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl text-slate-200" />
                    </div>
                    <span className="text-xs font-medium">No issues found on this page</span>
                </div>
             ) : (
                currentPageIssues.map((issue) => (
                    <div 
                        key={issue.id} 
                        onClick={() => toggleIssueStatus(issue.id)} 
                        className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 relative select-none
                            ${issue.isIgnored 
                                ? 'bg-slate-50 border-slate-200 opacity-60' 
                                : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5'
                            }
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-bold tracking-wider px-2 py-0.5 rounded text-[9px] uppercase border
                                ${issue.severity === 'error' 
                                    ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }
                            `}>
                                {issue.code}
                            </span>
                            {issue.isIgnored && (
                                <span className="text-blue-500 bg-blue-50 p-1 rounded-full w-5 h-5 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faCheck} size="xs" />
                                </span>
                            )}
                        </div>
                        
                        <p className={`text-xs leading-relaxed ${issue.isIgnored ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-600'}`}>
                            {issue.message}
                        </p>
                    </div>
                ))
             )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;