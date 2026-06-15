/**
 * QR code generation utility — Story 4.5
 *
 * Server-only. Never import client-side.
 * Uses `qrcode` npm package (architecture AR-QR).
 */
import QRCode from 'qrcode';

/**
 * Generate a QR code data URL (PNG) encoding the given URL.
 * Returns a base64 data-URL string: "data:image/png;base64,..."
 *
 * @param url - The URL to encode (absolute, e.g. https://example.com/r/<token>)
 */
export async function generateQrDataUrl(url: string): Promise<string> {
	return QRCode.toDataURL(url, {
		type: 'image/png',
		width: 256,
		margin: 2,
		errorCorrectionLevel: 'M'
	});
}

/**
 * Generate a QR code as a PNG Buffer.
 * Used by the download endpoint to stream a PNG file.
 *
 * @param url - The URL to encode
 */
export async function generateQrBuffer(url: string): Promise<Buffer> {
	return QRCode.toBuffer(url, {
		type: 'png',
		width: 256,
		margin: 2,
		errorCorrectionLevel: 'M'
	});
}
