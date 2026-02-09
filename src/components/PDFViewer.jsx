import { Document, Page, pdfjs } from "react-pdf";

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({
  pageNumber,
  setNumPages,
  setPageDimensions,
  renderOverlayBoxes,
}) => {
  return (
    <div className="flex-1 bg-slate-100/50 overflow-auto flex justify-center p-8 relative scrollbar-thin scrollbar-thumb-slate-300">
      <div className="relative shadow-2xl h-fit border border-slate-200/60 rounded-sm">
        <Document
          file="/683130_THESIS_FULL_PAPER.pdf"
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          <Page
            pageNumber={pageNumber}
            width={720}
            className="bg-white"
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={(page) =>
              setPageDimensions({
                width: page.originalWidth,
                height: page.originalHeight,
              })
            }
          >
            {renderOverlayBoxes()}
          </Page>
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
