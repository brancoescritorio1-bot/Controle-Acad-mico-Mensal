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
            pixelRatio: 2,
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
    // Create a wrapper that is fixed and positioned at 0,0 but placed behind everything
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '-9999';
    wrapper.style.opacity = '1';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.backgroundColor = 'transparent';

    const container = document.createElement('div');
    container.style.width = orientation === 'p' ? '800px' : '1120px';
    container.style.backgroundColor = 'white';
    container.style.padding = '40px';
    container.innerHTML = `<div style="font-family: 'Inter', sans-serif; color: #111827;">${htmlContent}</div>`;
    
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);
    
    try {
      await PdfService.exportToPDF(container, fileName, orientation, action, shareText);
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
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
    // Create a wrapper that is fixed and positioned at 0,0 but placed behind everything
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '-9999';
    wrapper.style.opacity = '1';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.backgroundColor = 'transparent';

    const tableContainer = document.createElement('div');
    tableContainer.style.width = orientation === 'p' ? '800px' : '1120px';
    tableContainer.style.backgroundColor = 'white';
    tableContainer.style.padding = '40px';
    
    // Build HTML string
    let html = `
      <div style="font-family: 'Inter', sans-serif; color: #111827;">
        <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">${title}</h1>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">${subtitle}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px;">
          <thead>
            <tr>
              ${headers.map(h => `<th style="text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-weight: 700;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                ${row.map(cell => `<td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6;">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${totalText ? `<div style="font-size: 16px; font-weight: 700; text-align: right; margin-top: 24px;">${totalText}</div>` : ''}
      </div>
    `;
    tableContainer.innerHTML = html;
    wrapper.appendChild(tableContainer);
    document.body.appendChild(wrapper);
    
    try {
      await PdfService.exportToPDF(tableContainer, fileName, orientation, action, shareText);
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }
  }
};
