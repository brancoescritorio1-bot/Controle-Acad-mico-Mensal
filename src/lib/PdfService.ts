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

        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const footerHeight = 15;
        
        // Ensure the element is fully visible for capture
        const originalStyle = element.style.cssText;
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        
        // Capture the entire content as one high-quality image
        const canvas = await toPng(element, {
            quality: 1.0,
            pixelRatio: 4, // Upgraded to 4x for high-res/300 DPI+
            backgroundColor: '#ffffff'
        });
        
        element.style.cssText = originalStyle;
        
        const imgProps = pdf.getImageProperties(canvas);
        // Vertical scale factor to convert CSS pixels to PDF mm
        const vScale = pdfWidth / element.offsetWidth;
        const scaledHeight = element.offsetHeight * vScale;
        
        // Find all cards to detect their positions for intelligent breaking
        const cards = element.querySelectorAll('.report-card');
        const cardPositions = Array.from(cards).map(card => {
            const rect = (card as HTMLElement).getBoundingClientRect();
            const parentRect = element.getBoundingClientRect();
            return {
                top: (rect.top - parentRect.top) * vScale,
                bottom: (rect.bottom - parentRect.top) * vScale
            };
        });

        let yOffset = 0;
        while (yOffset < scaledHeight - 1) { // -1 to avoid tiny slivers at the end
            if (yOffset > 0) pdf.addPage();
            
            let sliceHeight = pdfHeight - footerHeight;
            let nextYOffset = yOffset + sliceHeight;
            
            // Check if this cut-off point splits a card
            // We only care if the cut-off is NOT at the very end of the document
            if (nextYOffset < scaledHeight) {
                const splittingCard = cardPositions.find(pos => 
                    pos.top < nextYOffset && pos.bottom > nextYOffset
                );
                
                // If we are splitting a card, try to move the cut-off point to just before it
                // but only if the card doesn't start at the very top of the current page
                // (if it starts at the top and still doesn't fit, we HAVE to split it)
                if (splittingCard && splittingCard.top > yOffset + 5) {
                    nextYOffset = splittingCard.top - 2; // Cut 2mm before the card
                }
            }
            
            pdf.addImage(
                canvas, 
                'PNG', 
                0, 
                -yOffset, 
                pdfWidth, 
                scaledHeight,
                undefined,
                'FAST'
            );

            // Draw a white rectangle to cover the part that will be on the next page
            // This prevents "duplication" where the top of the next card is visible at the bottom of the current page
            const actualSliceHeight = nextYOffset - yOffset;
            if (actualSliceHeight < pdfHeight) {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, actualSliceHeight, pdfWidth, pdfHeight - actualSliceHeight, 'F');
            }
            
            yOffset = nextYOffset;
        }
        
        const pageCount = pdf.getNumberOfPages();
        
        // Add footer for all pages
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} - Página ${i} de ${pageCount}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
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
  },

  exportHTMLToPDF: async (
    htmlContent: string,
    orientation: 'p' | 'l',
    fileName: string,
    action: 'save' | 'share' = 'save',
    shareText?: string
  ) => {
    const container = document.createElement('div');
    container.style.width = orientation === 'p' ? '800px' : '1120px';
    container.style.backgroundColor = 'white';
    container.style.padding = '40px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = `<div style="font-family: 'Inter', sans-serif; color: #111827;">${htmlContent}</div>`;
    
    document.body.appendChild(container);
    
    try {
        const canvas = await toPng(container, {
            quality: 1.0,
            pixelRatio: 4,
            backgroundColor: '#ffffff'
        });
        
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(canvas);
        const vScale = pdfWidth / container.offsetWidth;
        const scaledHeight = container.offsetHeight * vScale;
        
        pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, scaledHeight, undefined, 'FAST');
        
        if (action === 'save') pdf.save(`${fileName}.pdf`);
        else if (action === 'share') {
            const pdfBlob = pdf.output('blob');
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
