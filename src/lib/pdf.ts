export async function pdfToImage(file: File): Promise<{ base64: string; mimeType: string }> {
  const pdfjsLib = (window as any).pdfjsLib;

  if (!pdfjsLib) {
    throw new Error('PDF.js no está cargado');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo crear el contexto del canvas');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  const base64 = canvas.toDataURL('image/png').split(',')[1];

  return {
    base64,
    mimeType: 'image/png'
  };
}
