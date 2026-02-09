/**
 * Generate Apple Client Secret JWT
 *
 * Usage:
 * 1. Place your .p8 file in this folder
 * 2. Update the values below
 * 3. Run: node generate-apple-secret.js
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');

// ============ UPDATE THESE VALUES ============
const TEAM_ID = '78BQ4M9C36';
const CLIENT_ID = 'com.myweddingdress.web';
const KEY_ID = '254U86B9DY';
const P8_FILE = './AuthKey_254U86B9DY.p8';
// =============================================

try {
  const privateKey = fs.readFileSync(P8_FILE, 'utf8');

  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d', // Max 6 months
    audience: 'https://appleid.apple.com',
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    keyid: KEY_ID,
  });

  console.log('\n✅ Your Apple Client Secret (valid for 180 days):\n');
  console.log(token);
  console.log('\n📋 Copy the token above and paste it into Supabase.\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure you have:');
  console.log('1. Installed jsonwebtoken: npm install jsonwebtoken');
  console.log('2. Placed your .p8 file in the correct location');
  console.log('3. Updated TEAM_ID, KEY_ID, and P8_FILE path');
}
