const PDFDocument = require('pdfkit');
const moment = require('moment');

// Test simple de crear un PDF
try {
    const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
        size: 'A4'
    });
    
    console.log('📄 PDF creado OK');
    
    doc.fontSize(20).text('Prueba de PDF');
    console.log('📝 Texto agregado OK');
    
    // Test de addWatermark
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    doc.save();
    doc.opacity(0.1);
    doc.fontSize(80);
    doc.fillColor('#E8E8E8');
    doc.text('PapaIA', pageWidth - 150, pageHeight - 100, {
        align: 'right'
    });
    doc.restore();
    console.log('💧 Watermark agregado OK');
    
    doc.end();
    console.log('✅ PDF completado OK');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
}
