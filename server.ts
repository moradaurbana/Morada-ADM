import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { checkAndSendNotifications } from './src/services/notificationService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // Rota de saúde
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Notificações em segundo plano
  // Executa uma vez na inicialização e depois a cada 1 hora (3600000 ms)
  console.log('Iniciando sistema de monitoramento de alertas...');
  checkAndSendNotifications();
  setInterval(checkAndSendNotifications, 3600000); 

  // Configuração do Vite ou Arquivos Estáticos
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Ambiente de produção detectado. Servindo arquivos estáticos de /dist');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Pressione Ctrl+C para encerrar');
  });
}

startServer();
