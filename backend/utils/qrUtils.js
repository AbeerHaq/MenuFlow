const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate a cryptographically secure random token for table QR codes
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate QR code Data URL for given target URL
 */
const generateQrDataUrl = async (url) => {
  return await QRCode.toDataURL(url, {
    width: 360,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
};

module.exports = {
  generateSecureToken,
  generateQrDataUrl,
};
