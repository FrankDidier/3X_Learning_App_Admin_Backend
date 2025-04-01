/**
 * QR Code Generation Utility
 */
const QRCode = require('qrcode');

// Generate QR code from a URL or text
exports.generateQRCode = async (text) => {
  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(text);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};