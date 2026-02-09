import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "./components/Header";
import PDFViewer from "./components/PDFViewer";
import Sidebar from "./components/Sidebar";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

function App() {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [allIssues, setAllIssues] = useState([]);
  const [pageDimensions, setPageDimensions] = useState({
    width: 0,
    height: 0,
  });

  // 1. Load CSV
  useEffect(() => {
    fetch("/report_full_683130_THESIS_FULL_PAPER.csv")
      .then((response) => response.text())
      .then((csvText) => {
        const parsedIssues = [];
        const lines = csvText.trim().split("\n");

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/);
          if (parts.length < 5) continue;

          let bbox = null;
          try {
            bbox = JSON.parse(parts[4].trim().replace(/^"|"$/g, ""));
            if (
              !Array.isArray(bbox) ||
              bbox.length !== 4 ||
              !bbox.some((v) => v !== 0)
            )
              bbox = null;
          } catch (e) {
            bbox = null;
          }

          parsedIssues.push({
            id: i,
            page: parseInt(parts[0].trim()),
            code: parts[1].trim(),
            severity: parts[2].trim().toLowerCase(),
            message: parts[3].trim().replace(/^"|"$/g, ""),
            bbox,
            isIgnored: false,
          });
        }
        setAllIssues(parsedIssues);
      })
      .catch((error) => console.error("Error loading CSV:", error));
  }, []);

  // ------------------------------------------------------------------
  // Helper Functions
  // ------------------------------------------------------------------

  const getPageStatus = useCallback(
    (p) => {
      const issues = allIssues.filter((i) => i.page === p);
      if (issues.length === 0) return "clean";

      const active = issues.filter((i) => !i.isIgnored);
      if (active.some((i) => i.severity === "error")) return "error";
      if (active.some((i) => i.severity === "warning")) return "warning";

      return "resolved";
    },
    [allIssues]
  );

  const findNextProblemPage = useCallback(() => {
    if (!numPages) return null;
    for (let p = pageNumber + 1; p <= numPages; p++) {
      const status = getPageStatus(p);
      if (status === "error" || status === "warning") {
        return p;
      }
    }
    return null;
  }, [pageNumber, numPages, getPageStatus]);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const toggleIssueStatus = (issueId) => {
    setAllIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, isIgnored: !issue.isIgnored } : issue
      )
    );
  };

  const handleTogglePageIgnore = () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);
    setAllIssues((prev) =>
      prev.map((issue) =>
        issue.page === pageNumber ? { ...issue, isIgnored: hasActive } : issue
      )
    );
  };

  const handleQuickApproveAndNext = () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);

    if (hasActive) {
      setAllIssues((prev) =>
        prev.map((issue) =>
          issue.page === pageNumber ? { ...issue, isIgnored: true } : issue
        )
      );
    }

    if (pageNumber < (numPages || 0)) {
      setPageNumber((p) => p + 1);
    }
  };

  const jumpToNextIssue = () => {
    const nextProblemPage = findNextProblemPage();
    if (nextProblemPage) {
      setPageNumber(nextProblemPage);
    } else {
      alert("🎉 เยี่ยมมาก! ตรวจครบทุกหน้าแล้ว ไม่พบปัญหาเหลืออยู่");
    }
  };

  const handleExportCSV = () => {
    const activeIssues = allIssues.filter((i) => !i.isIgnored);
    const rows = activeIssues
      .map(
        (i) =>
          `${i.page},${i.code},${i.severity},"${i.message}","${i.bbox ? JSON.stringify(i.bbox) : ""}"`
      )
      .join("\n");
    const blob = new Blob(["Page,Code,Severity,Message,BBox\n" + rows],
      {
        type: "text/csv;charset=utf-8;",
      }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "validated_report.csv";
    link.click();
  };

  // ------------------------------------------------------------------
  // Keyboard Shortcuts Listener
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      switch (e.key) {
        case "ArrowRight":
          setPageNumber((p) => Math.min(numPages || 1, p + 1));
          break;
        case "ArrowLeft":
          setPageNumber((p) => Math.max(1, p - 1));
          break;
        case "Enter":
          e.preventDefault();
          handleQuickApproveAndNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, pageNumber, allIssues]);

  // ------------------------------------------------------------------
  // Render Logic
  // ------------------------------------------------------------------
  const currentPageIssues = useMemo(
    () => allIssues.filter((i) => i.page === pageNumber),
    [allIssues, pageNumber]
  );

  const getPageColorClass = (page) => {
    switch (getPageStatus(page)) {
      case "error":
        return "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100";
      case "warning":
        return "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100";
      case "resolved":
        return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100";
      default:
        return "bg-white text-slate-400 border-slate-200 hover:border-slate-400";
    }
  };

  const renderOverlayBoxes = () => {
    if (!pageDimensions.width || currentPageIssues.length === 0) return null;
    return currentPageIssues.map((issue) => {
      if (!issue.bbox) return null;
      const [x0, y0, x1, y1] = issue.bbox;

      let borderColor = issue.severity === "error" ? "red" : "#fbbf24";
      let bgColor =
        issue.severity === "error"
          ? "rgba(255, 0, 0, 0.1)"
          : "rgba(251, 191, 36, 0.2)";
      if (issue.isIgnored) {
        borderColor = "#3b82f6";
        bgColor = "rgba(59, 130, 246, 0.15)";
      }

      return (
        <div
          key={issue.id}
          onClick={(e) => {
            e.stopPropagation();
            toggleIssueStatus(issue.id);
          }}
          className="absolute cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-[1.02]"
          style={{
            left: `${(x0 / pageDimensions.width) * 100}%`,
            top: `${(y0 / pageDimensions.height) * 100}%`,
            width: `${((x1 - x0) / pageDimensions.width) * 100}%`,
            height: `${((y1 - y0) / pageDimensions.height) * 100}%`,
            border: `2px solid ${borderColor}`,
            backgroundColor: bgColor,
            zIndex: 10,
            borderRadius: "4px",
          }}
        />
      );
    });
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-700">
      <Header
        pageNumber={pageNumber}
        numPages={numPages}
        setPageNumber={setPageNumber}
        jumpToNextIssue={jumpToNextIssue}
        handleExportCSV={handleExportCSV}
      />

      <div className="flex flex-1 overflow-hidden">
        <PDFViewer
          pageNumber={pageNumber}
          setNumPages={setNumPages}
          setPageDimensions={setPageDimensions}
          renderOverlayBoxes={renderOverlayBoxes}
        />
        <Sidebar
          numPages={numPages}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          getPageColorClass={getPageColorClass}
          currentPageIssues={currentPageIssues}
          handleTogglePageIgnore={handleTogglePageIgnore}
          toggleIssueStatus={toggleIssueStatus}
        />
      </div>
    </div>
  );
}

export default App;
