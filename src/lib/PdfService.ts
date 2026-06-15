import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export const PdfService = {
  exportToPDF: async (
    elementOrId: string | HTMLElement,
    fileName: string,
    orientation: 'p' | 'l' = 'p',
    action: 'save' | 'share' = 'save',
    shareText: string = 'Segue o documento em PDF.',
    preProcess?: (el: HTMLElement) => void,
    postProcess?: (el: HTMLElement) => void,
  ) => {
    const element = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;
      
    if (!element) {
        throw new Error(`Element not found`);
    }

    try {
        if (preProcess) preProcess(element);

        const children = element.querySelectorAll('*');
        children.forEach((child) => (child as HTMLElement).style.breakInside = 'avoid');

        const dataUrl = await toPng(element, {                
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        });
        
        children.forEach((child) => (child as HTMLElement).style.breakInside = '');
        
        if (postProcess) postProcess(element);
        
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
        
        const finalWidth = imgProps.width * ratio;
        const finalHeight = imgProps.height * ratio;
        
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;
        
        pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
        
        // Add footer for all pages
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.text(`Página ${i} de ${pageCount}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
        }
        
        if (action === 'share' && navigator.share) {
            const pdfBlob = pdf.output('blob');
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
                    pdf.save(`${fileName}.pdf`);
                }
            } else {
                pdf.save(`${fileName}.pdf`);
            }
        } else {
            pdf.save(`${fileName}.pdf`);
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
  }
};
