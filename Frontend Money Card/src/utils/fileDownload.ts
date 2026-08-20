/**
 * Shared Browser File Download Utility
 * Handles standard binary Blob downloads with delayed URL revocation to guarantee
 * proper filename and MIME type persistence across Chrome, Edge, Safari, and Firefox.
 */

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Ensure blob has application/pdf MIME type
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });

  console.log('[PDF Download] Initiating download:', {
    filename: safeFilename,
    byteSize: pdfBlob.size,
    mimeType: pdfBlob.type,
  });

  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.setAttribute('download', safeFilename);

  document.body.appendChild(anchor);
  anchor.click();

  // Defer revocation so browser download manager has ample time to complete stream write
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(url);
    } catch {
      // Ignored if already cleaned up
    }
  }, 60000);
}
