import jsPDF from "jspdf";
import "jspdf-autotable";

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
    // Wait for the browser layout engine to finish styling and painting the elements
    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;
      
    if (!element) {
        throw new Error(`Element not found`);
    }

    try {
        if (preProcess) preProcess(element);

        // Explicitly remove all SVGs to avoid html2canvas loading issues
        const svgs = element.querySelectorAll('svg');
        svgs.forEach(svg => svg.remove());

        const pdf = new jsPDF(orientation, 'mm', 'a4');
        
        await pdf.html(element, {
            callback: (doc) => {
                if (action === 'share' && navigator.share) {
                    const pdfBlob = doc.output('blob');
                    const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: fileName,
                            text: shareText
                        }).catch(console.error);
                    } else {
                        doc.save(`${fileName}.pdf`);
                    }
                } else {
                    doc.save(`${fileName}.pdf`);
                }
            },
            x: 10,
            y: 10,
            width: orientation === 'p' ? 190 : 277,
            windowWidth: element.offsetWidth,
            html2canvas: {
                logging: false,
                useCORS: true,
                ignoreElements: (el) => el.tagName === 'svg',
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
  },

  exportHTMLToPDF: async (
    htmlContent: string,
    orientation: 'p' | 'l',
    fileName: string,
    action: 'save' | 'share' = 'save',
    shareText?: string
  ) => {
    const container = document.createElement('div');
    container.style.width = orientation === 'p' ? '190mm' : '277mm';
    container.style.backgroundColor = 'white';
    container.style.padding = '10mm';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = `<div style="font-family: 'Inter', sans-serif; color: #111827;">${htmlContent}</div>`;
    
    // Explicitly remove all SVGs to avoid html2canvas loading issues
    const svgs = container.querySelectorAll('svg');
    svgs.forEach(svg => svg.remove());
    
    document.body.appendChild(container);
    
    try {
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        
        await pdf.html(container, {
            callback: (doc) => {
                if (action === 'save') doc.save(`${fileName}.pdf`);
                else if (action === 'share') {
                    const pdfBlob = doc.output('blob');
                    const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
                    if (navigator.share) {
                      navigator.share({
                        files: [file],
                        title: fileName,
                        text: shareText || 'Segue o documento em PDF.',
                      }).catch(console.error);
                    } else {
                      const url = URL.createObjectURL(pdfBlob);
                      window.open(url);
                    }
                }
            },
            x: 0,
            y: 0,
            width: orientation === 'p' ? 190 : 277,
            windowWidth: container.offsetWidth,
            html2canvas: {
                logging: false,
                useCORS: true,
                // The SVGs are already removed, but this is a safety measure
                ignoreElements: (el) => el.tagName === 'svg',
            },
        });
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  },

  exportTableToPDF: async (
    title: string,
    subtitle: string,
    headers: string[],
    data: string[][],
    totalText: string | null,
    orientation: 'p' | 'l',
    fileName: string,
    action: 'save' | 'share' = 'save',
    shareText?: string
  ) => {
    const doc = new jsPDF(orientation, 'mm', 'a4');
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(12);
    doc.text(subtitle, 14, 30);
    
    (doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 10, font: 'helvetica' },
    });

    if (totalText) {
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.text(totalText, 196, finalY + 10, { align: 'right' });
    }

    if (action === 'save') {
        doc.save(`${fileName}.pdf`);
    } else if (action === 'share') {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
        if (navigator.share) {
            await navigator.share({ files: [file], title: fileName, text: shareText || '' });
        } else {
            window.open(URL.createObjectURL(pdfBlob));
        }
    }
  }
};
