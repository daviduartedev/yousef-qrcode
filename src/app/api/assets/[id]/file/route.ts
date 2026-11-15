import { apiError, privateHeaders, requireApiUser } from '@/server/http';
import { readAssetFile } from '@/server/assets';
import { assetMimeTypes, type AssetMimeType } from '@/lib/assets';

export const runtime = 'nodejs';

/** Owner-only file bytes. The stored type was detected from the content, and the response cannot run as a page. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const file = await readAssetFile(user.id, (await context.params).id);
    if (!file) return Response.json({ error: 'File not found' }, { status: 404, headers: privateHeaders });
    const download = new URL(request.url).searchParams.get('download') === '1';
    // RFC 5987 encoding plus an ASCII fallback named with the stored type's extension.
    const filename = encodeURIComponent(file.name).replace(/['()*!]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
    const extension = assetMimeTypes[file.mimeType as AssetMimeType]?.extension ?? 'bin';
    return new Response(new Uint8Array(file.content), { headers: {
      ...privateHeaders,
      'Content-Type': file.mimeType,
      'Content-Length': String(file.content.byteLength),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="file.${extension}"; filename*=UTF-8''${filename}`,
      // PDF viewers do not render inside a sandboxed document; PDFs keep the other protections.
      'Content-Security-Policy': file.mimeType === 'application/pdf' ? "default-src 'none'; object-src 'self'; img-src 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
      ETag: `"${file.sha256}"`,
    } });
  } catch (error) {
    return apiError(error);
  }
}
