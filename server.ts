import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON
  app.use(express.json());

  // Rota de saúde
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Rota para envio de e-mails
  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, text } = req.body;
      
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({ error: 'Configurações de SMTP ausentes.' });
      }

      await transporter.sendMail({
        from: `"Sistema Morada Urbana" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      res.status(500).json({ error: 'Falha ao enviar email' });
    }
  });

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
