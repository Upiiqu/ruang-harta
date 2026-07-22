// Standalone Node.js script to extract PDF text safely outside of Next.js Turbopack context
const fs = require('fs');

if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

async function run() {
  try {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
      console.error("No PDF path provided");
      process.exit(1);
    }
    
    const buffer = fs.readFileSync(pdfPath);
    const pdfModule = require('pdf-parse');
    
    let text = '';
    if (typeof pdfModule === 'function') {
      const res = await pdfModule(buffer);
      text = res.text || '';
    } else if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      text = typeof res === 'string' ? res : res?.text || JSON.stringify(res);
    }
    
    // Print the extracted text to stdout
    process.stdout.write(text);
  } catch (err) {
    console.error("WORKER_ERROR:", err.message);
    process.exit(1);
  }
}

run();
