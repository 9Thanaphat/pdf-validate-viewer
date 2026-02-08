import { useState, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ตั้งค่า Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  
  // เก็บข้อมูล Issues ทั้งหมด
  const [allIssues, setAllIssues] = useState([]);
  
  // เก็บขนาดของหน้า PDF
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  // ==========================================
  // 1. โหลดและ Parse CSV
  // ==========================================
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

          const page = parseInt(parts[0].trim());
          const code = parts[1].trim();
          const severity = parts[2].trim().toLowerCase();
          const message = parts[3].trim().replace(/^"|"$/g, '');
          const bboxString = parts[4].trim().replace(/^"|"$/g, '');

          let bbox = null;
          try {
            bbox = JSON.parse(bboxString);
            if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.some(v => v !== 0)) {
               bbox = null;
            }
          } catch (e) { bbox = null; }

          parsedIssues.push({ 
              id: i,
              page, 
              code, 
              severity, 
              message, 
              bbox,
              isIgnored: false 
          });
        }
        
        setAllIssues(parsedIssues);
      })
      .catch((error) => console.error("Error loading CSV:", error));
  }, []);

  // ==========================================
  // Toggle Logic
  // ==========================================
  const toggleIssueStatus = (issueId) => {
    setAllIssues(prev => prev.map(issue => 
        issue.id === issueId 
            ? { ...issue, isIgnored: !issue.isIgnored } 
            : issue
    ));
  };

  const handleTogglePageIgnore = () => {
    const hasActiveIssues = currentPageIssues.some(i => !i.isIgnored);
    const newStatus = hasActiveIssues ? true : false;

    setAllIssues(prev => prev.map(issue => 
        issue.page === pageNumber 
            ? { ...issue, isIgnored: newStatus } 
            : issue
    ));
  };

  const handleExportCSV = () => {
      const activeIssues = allIssues.filter(i => !i.isIgnored);
      const header = "Page,Code,Severity,Message,BBox\n";
      const rows = activeIssues.map(i => {
          const bboxStr = i.bbox ? `"${JSON.stringify(i.bbox)}"` : '""';
          const msgStr = `"${i.message}"`;
          return `${i.page},${i.code},${i.severity},${msgStr},${bboxStr}`;
      }).join("\n");

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "validated_report.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`Exported ${activeIssues.length} active issues!`);
  };

  // ==========================================
  // 2. Filter Issues & Determine Page Status
  // ==========================================
  const currentPageIssues = useMemo(() => {
    return allIssues.filter(issue => issue.page === pageNumber);
  }, [allIssues, pageNumber]);

  // [UPDATED] Logic แยกแยะสถานะหน้า
  const getPageStatus = (page) => {
    // 1. หา Issues ทั้งหมดของหน้านั้น (ทั้งที่แก้แล้ว และยังไม่แก้)
    const pageIssues = allIssues.filter(i => i.page === page);
    
    // 2. ถ้าหน้านี้ไม่เคยมี Error เลย -> 'clean' (Pass)
    if (pageIssues.length === 0) return 'clean';

    // 3. หา Issues ที่ยัง Active อยู่ (ยังไม่กด Ignore)
    const activeIssues = pageIssues.filter(i => !i.isIgnored);

    // 4. ถ้ามี Active Error -> 'error'
    if (activeIssues.some(i => i.severity === 'error')) return 'error';
    
    // 5. ถ้ามี Active Warning -> 'warning'
    if (activeIssues.some(i => i.severity === 'warning')) return 'warning';

    // 6. ถ้าเคยมี Error แต่ตอนนี้ Active = 0 (แปลว่ากด Ignore หมดแล้ว) -> 'resolved' (Fixed)
    return 'resolved';
  };

  // [UPDATED] เปลี่ยนสีตามสถานะใหม่
  const getPageColor = (page) => {
    const status = getPageStatus(page);
    switch (status) {
      case "error": return "bg-red-500 text-white hover:bg-red-600 border-red-600";
      case "warning": return "bg-amber-400 text-black hover:bg-amber-500 border-amber-500";
      case "resolved": return "bg-blue-100 text-blue-700 border-blue-300 font-semibold"; // สีฟ้าสำหรับหน้าที่มีการแก้ไข
      case "clean": 
      default: return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"; // สีเขียวสำหรับหน้า Perfect
    }
  };

  // ==========================================
  // 3. Render Overlay
  // ==========================================
  const renderOverlayBoxes = () => {
    if (!pageDimensions.width || !pageDimensions.height || currentPageIssues.length === 0) return null;

    return currentPageIssues.map((issue) => {
      if (!issue.bbox) return null;

      const [x0, y0, x1, y1] = issue.bbox;
      const pdfW = pageDimensions.width; 
      const pdfH = pageDimensions.height;

      const left = (x0 / pdfW) * 100;
      const top = (y0 / pdfH) * 100;
      const width = ((x1 - x0) / pdfW) * 100;
      const height = ((y1 - y0) / pdfH) * 100;

      let borderColor = issue.severity === 'error' ? 'red' : '#fbbf24';
      let bgColor = issue.severity === 'error' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(251, 191, 36, 0.2)';
      
      // ถ้าแก้แล้ว ให้เป็นสีฟ้า (ตาม theme Resolved) หรือสีเขียวก็ได้
      if (issue.isIgnored) {
          borderColor = '#3b82f6'; // Blue-500
          bgColor = 'rgba(59, 130, 246, 0.2)'; // Blue tint
      }

      return (
        <div
          key={issue.id}
          onClick={(e) => {
              e.stopPropagation();
              toggleIssueStatus(issue.id);
          }}
          className="absolute group cursor-pointer transition-all hover:bg-opacity-40"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            border: `2px solid ${borderColor}`,
            backgroundColor: bgColor,
            zIndex: 10,
          }}
        >
          {!issue.isIgnored && (
            <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 w-max max-w-xs bg-black text-white text-xs p-2 rounded shadow-lg z-20 whitespace-normal pointer-events-none">
                <span className="font-bold uppercase text-[10px] text-yellow-300">{issue.code}</span>
                <br/>
                {issue.message}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 shadow-sm flex-shrink-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg text-xl">🔍</div>
            <div>
                <h1 className="text-lg font-bold text-gray-800 leading-tight">Thesis Validator</h1>
                <p className="text-xs text-gray-500">Visual Inspection Mode</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border">
                <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="text-gray-600 hover:text-blue-600 disabled:opacity-30">◀</button>
                <span className="text-sm font-mono px-2">Page <span className="font-bold">{pageNumber}</span> / {numPages || "-"}</span>
                <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= numPages} className="text-gray-600 hover:text-blue-600 disabled:opacity-30">▶</button>
            </div>

            <button 
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
                <span>💾</span> Export Clean CSV
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: PDF View */}
        <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8 relative">
          <div className="relative shadow-2xl h-fit"> 
            <Document
              file="/683130_THESIS_FULL_PAPER.pdf"
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            >
              <Page 
                pageNumber={pageNumber} 
                width={750} 
                renderTextLayer={false}
                renderAnnotationLayer={true}
                className="bg-white relative"
                onLoadSuccess={(page) => {
                    setPageDimensions({
                        width: page.originalWidth, 
                        height: page.originalHeight
                    });
                }}
              >
                  {renderOverlayBoxes()}
              </Page>
            </Document>
          </div>
        </div>

        {/* Right: Sidebar Navigation */}
        <div className="w-80 bg-white border-l flex flex-col shadow-xl z-20">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800 mb-3">📑 Page Overview</h2>
            {/* [UPDATED] Legend มีสีฟ้าเพิ่มเข้ามา */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-gray-600">
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Pass (Original)</div>
              <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded border border-blue-200"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Resolved (User)</div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded border border-amber-100"><div className="w-2 h-2 bg-amber-400 rounded-full"></div> Warning</div>
              <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-100"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Error</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {numPages && Array.from(new Array(numPages), (_, index) => {
                const pageIndex = index + 1;
                const status = getPageStatus(pageIndex); // logic ใหม่
                const isSelected = pageNumber === pageIndex;
                
                return (
                  <button
                    key={pageIndex}
                    onClick={() => setPageNumber(pageIndex)}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-xs transition-all duration-200 border relative
                      ${getPageColor(pageIndex)}
                      ${isSelected ? "ring-2 ring-blue-600 ring-offset-2 z-10 font-bold scale-105" : "opacity-90 hover:opacity-100"}
                    `}
                  >
                    {pageIndex}
                    {status === 'error' && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Detail Panel */}
          <div className="h-1/3 border-t bg-gray-50 flex flex-col">
             <div className="p-2 border-b bg-gray-100 text-xs font-bold text-gray-500 uppercase flex justify-between items-center">
                <span>Issues on Page {pageNumber}</span>
                
                {/* ปุ่ม Mark Page OK */}
                <div className="flex items-center gap-2">
                    {currentPageIssues.length > 0 && (
                        <button 
                            onClick={handleTogglePageIgnore}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all border
                                ${currentPageIssues.every(i => i.isIgnored) 
                                    ? 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300' 
                                    : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                }
                            `}
                        >
                            {currentPageIssues.every(i => i.isIgnored) ? "Undo All" : "✅ Mark All OK"}
                        </button>
                    )}
                    <span className="text-gray-400 min-w-[20px] text-right">{currentPageIssues.length}</span>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {currentPageIssues.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-4">No issues found 🎉</div>
                ) : (
                    currentPageIssues.map((issue) => (
                        <div 
                            key={issue.id} 
                            onClick={() => toggleIssueStatus(issue.id)} 
                            className={`p-2 rounded border text-xs cursor-pointer transition-all
                                ${issue.isIgnored 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 line-through opacity-60' 
                                    : issue.severity === 'error' 
                                        ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100' 
                                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <div className="font-bold">{issue.code}</div>
                                {issue.isIgnored && <span>✅</span>}
                            </div>
                            <div>{issue.message}</div>
                        </div>
                    ))
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;