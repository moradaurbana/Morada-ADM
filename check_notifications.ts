import { db } from './src/services/firebase_node.js';

async function checkSent() {
  try {
    const snapshot = await db.collection('notificacoes_enviadas').get();
    console.log(`CHECK_RESULT: ${snapshot.size} notificações encontradas no histórico.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Contrato: ${data.contratoId}, Tipo: ${data.tipo}, Ciclo: ${data.ciclo}, Data: ${data.dataEnvio}`);
    });
  } catch (error) {
    console.error('Erro ao verificar notificações:', error);
  }
}

checkSent();
