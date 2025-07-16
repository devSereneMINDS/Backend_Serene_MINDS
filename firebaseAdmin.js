// firebaseAdmin.ts
import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();


const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
