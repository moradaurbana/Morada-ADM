import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { parseISO, format, differenceInDays, setYear, getYear, isBefore, addYears, isAfter, subMonths } from 'date-fns';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Inicializar admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

// Inicializar o banco de dados via Admin
// O Admin SDK ignora as Security Rules, sendo ideal para o servidor (Cloud Run)
// e evita erros de stream gRPC comuns no Client SDK rodando em Node.js
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

export { 
  db, 
  parseISO, 
  format, 
  differenceInDays, 
  setYear, 
  getYear, 
  isBefore, 
  addYears, 
  isAfter, 
  subMonths 
};
