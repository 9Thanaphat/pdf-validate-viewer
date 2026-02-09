import DocumentMap from "./DocumentMap";
import IssueList from "./IssueList";

const Sidebar = ({
  numPages,
  pageNumber,
  setPageNumber,
  getPageColorClass,
  currentPageIssues,
  handleTogglePageIgnore,
  toggleIssueStatus,
}) => {
  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col z-20 shadow-[0_0_20px_rgba(0,0,0,0.03)]">
      <DocumentMap
        numPages={numPages}
        pageNumber={pageNumber}
        setPageNumber={setPageNumber}
        getPageColorClass={getPageColorClass}
      />
      <IssueList
        pageNumber={pageNumber}
        currentPageIssues={currentPageIssues}
        handleTogglePageIgnore={handleTogglePageIgnore}
        toggleIssueStatus={toggleIssueStatus}
      />
    </div>
  );
};

export default Sidebar;
