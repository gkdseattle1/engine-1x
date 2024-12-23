function getBrowserInfo(userAgent) {
  if (!userAgent) return 'Unknown';
  
  // Simple browser detection
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  
  return 'Other';
}

module.exports = { getBrowserInfo }; 