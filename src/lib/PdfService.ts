import jsPDF from "jspdf";
import "jspdf-autotable";

export const PdfService = {
  generatePDF: async (
    element: HTMLElement,
    fileName: string,
    action: 'save' | 'share' = 'save',
    shareText: string = 'Segue o documento em PDF.',
    preProcess?: (el: HTMLElement) => void,
    postProcess?: (el: HTMLElement) => void,
  ) => {
    try {
      if (preProcess) preProcess(element);
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      await pdf.html(element, {
        callback: async (doc) => {
          if (postProcess) postProcess(element);
          
          if (action === 'share' && navigator.share) {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: fileName,
                  text: shareText
                });
              } catch (shareErr) {
                console.error('Share error:', shareErr);
                doc.save(`${fileName}.pdf`);
              }
            } else {
              doc.save(`${fileName}.pdf`);
            }
          } else {
            doc.save(`${fileName}.pdf`);
          }
        },
        margin: [40, 40, 40, 40],
        autoPaging: 'text',
        width: 520, 
        windowWidth: element.offsetWidth,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
};
