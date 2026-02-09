import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faChevronLeft,
  faChevronRight,
  faDownload,
  faForwardStep,
  faKeyboard,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

const Header = ({
  pageNumber,
  numPages,
  setPageNumber,
  jumpToNextIssue,
  handleExportCSV,
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
          <FontAwesomeIcon icon={faFilePdf} className="text-lg" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">
            Thesis Validator
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium tracking-wide">
            <span>AUTOMATED CHECK SYSTEM</span>
            <span className="text-slate-300">|</span>
            {/* Tooltip hint สำหรับคีย์ลัด */}
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              <FontAwesomeIcon icon={faKeyboard} /> Press{" "}
              <b className="text-slate-800">Enter</b> to Approve & Next
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://github.com/9Thanaphat/pdf-validate-viewer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-black hover:bg-slate-100 w-9 h-9 flex items-center justify-center rounded-lg transition-all"
          title="View Source on GitHub"
        >
          <FontAwesomeIcon icon={faGithub} className="text-xl" />
        </a>

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
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faChevronLeft} size="xs" />
          </button>
          <span className="text-xs font-mono px-4 w-24 text-center select-none">
            Page <span className="font-bold text-slate-800">{pageNumber}</span>{" "}
            <span className="text-slate-400">/ {numPages || "-"}</span>
          </span>
          <button
            onClick={() =>
              setPageNumber((p) => Math.min(numPages || 1, p + 1))
            }
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
  );
};

export default Header;
