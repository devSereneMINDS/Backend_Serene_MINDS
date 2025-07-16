import admin from '../firebaseAdmin.js'; // your firebase admin setup
import sql from '../config/db.js';        // your postgres client setup

export const verifyFirebaseAndAuthorize = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Step 1: Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email } = decoded;

    if (!email) {
      return res.status(403).json({ message: 'Email missing in Firebase token' });
    }

    // Step 2: Verify user exists in your database (client table)
    const client = await sql`
      SELECT * FROM client WHERE email = ${email}
    `;

    if (client.length === 0) {
      return res.status(403).json({ message: 'User not authorized (not in DB)' });
    }

    // Attach user info to req
    req.user = {
      firebase: decoded,
      client: client[0],
    };

    next();
  } catch (err) {
    console.error('Authorization error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
