import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateLeft,
  faCheckDouble,
  faMagnifyingGlass,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

const IssueList = ({
  pageNumber,
  currentPageIssues,
  handleTogglePageIgnore,
  toggleIssueStatus,
}) => {
  return (
    <>
      {/* Issue List Header */}
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Page {pageNumber}</h3>
          <span className="text-[10px] text-slate-400">
            {currentPageIssues.length} issues found
          </span>
        </div>

        {currentPageIssues.length > 0 && (
          <button
            onClick={handleTogglePageIgnore}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5
                        ${
                          currentPageIssues.every((i) => i.isIgnored)
                            ? "bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300"
                            : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                        }`}
          >
            <FontAwesomeIcon
              icon={
                currentPageIssues.every((i) => i.isIgnored)
                  ? faRotateLeft
                  : faCheckDouble
              }
            />
            {currentPageIssues.every((i) => i.isIgnored)
              ? "Undo All"
              : "Resolve All"}
          </button>
        )}
      </div>

      {/* Issue List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
        {currentPageIssues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="text-2xl text-slate-200"
              />
            </div>
            <span className="text-xs font-medium">
              No issues found on this page
            </span>
          </div>
        ) : (
          currentPageIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => toggleIssueStatus(issue.id)}
              className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 relative select-none
                            ${
                              issue.isIgnored
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5"
                            }
                        `}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`font-bold tracking-wider px-2 py-0.5 rounded text-[9px] uppercase border
                                ${
                                  issue.severity === "error"
                                    ? "bg-rose-50 text-rose-600 border-rose-100"
                                    : "bg-amber-50 text-amber-600 border-amber-100"
                                }
                            `}
                >
                  {issue.code}
                </span>
                {issue.isIgnored && (
                  <span className="text-blue-500 bg-blue-50 p-1 rounded-full w-5 h-5 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCheck} size="xs" />
                  </span>
                )}
              </div>

              <p
                className={`text-xs leading-relaxed ${
                  issue.isIgnored
                    ? "text-slate-400 line-through decoration-slate-300"
                    : "text-slate-600"
                }`}
              >
                {issue.message}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default IssueList;
