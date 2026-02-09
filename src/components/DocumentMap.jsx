import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleXmark,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

const DocumentMap = ({
  numPages,
  pageNumber,
  setPageNumber,
  getPageColorClass,
}) => {
  return (
    <div className="p-6 border-b border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Document Map
        </h2>
      </div>
      {/* Grid */}
      <div className="grid grid-cols-8 p-2 gap-1.5 max-h-[25vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
        {numPages &&
          Array.from(new Array(numPages), (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPageNumber(p)}
                className={`aspect-square rounded-[4px] text-[10px] font-medium transition-all border ${getPageColorClass(
                  p
                )} ${
                  pageNumber === p
                    ? "ring-2 ring-slate-800 ring-offset-1 z-10"
                    : "opacity-90"
                }`}
              >
                {p}
              </button>
            );
          })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-start text-[10px] font-medium text-slate-500 pt-3 border-t border-slate-50">
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCircleXmark} className="text-rose-500" />{" "}
          Error
        </span>
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="text-amber-400"
          />{" "}
          Warn
        </span>
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCircleCheck} className="text-blue-500" />{" "}
          Resolved
        </span>
      </div>
    </div>
  );
};

export default DocumentMap;
