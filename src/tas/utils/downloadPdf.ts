/**
 * Download a PDF URL as a file, falling back to opening in a new tab.
 */
export async function downloadPdf(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank');
  }
}
