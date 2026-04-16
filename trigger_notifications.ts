import { checkAndSendNotifications } from './src/services/notificationService.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('--- Execução Manual de Teste de Notificações ---');
  await checkAndSendNotifications();
  console.log('--- Fim do Teste ---');
  process.exit(0);
}

run();
