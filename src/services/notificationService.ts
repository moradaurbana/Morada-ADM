import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { 
  db, 
  parseISO, 
  format, 
  differenceInDays, 
  setYear, 
  getYear, 
  isBefore, 
  addYears 
} from './firebase_node';

const NOTIFICATIONS_LOG_FILE = path.join(process.cwd(), 'sent_notifications.json');

// Helper para ler/escrever log local
function getSentNotifications() {
  if (fs.existsSync(NOTIFICATIONS_LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_LOG_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

async function registrarNotificacao(contratoId: string, tipo: string, ciclo: string) {
  // 1. Registrar no Log Local
  const sent = getSentNotifications();
  sent.push({
    contratoId,
    tipo,
    ciclo,
    dataEnvio: new Date().toISOString()
  });
  fs.writeFileSync(NOTIFICATIONS_LOG_FILE, JSON.stringify(sent, null, 2));

  // 2. Tentar registrar no Firestore (Admin SDK)
  try {
    await db.collection('notificacoes_enviadas').add({
      contratoId,
      tipo,
      ciclo,
      dataEnvio: new Date().toISOString()
    });
  } catch (e) {
    console.error('Erro ao espelhar notificacao no Firestore:', e);
  }
}

// Configurações do transportador (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function checkAndSendNotifications() {
  console.log('--- Iniciando verificação de alertas para notificações por e-mail (Admin SDK) ---');
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Configurações de SMTP ausentes. Notificações não serão enviadas.');
    return;
  }

  try {
    const [contSnap, inqSnap, propSnap, imovSnap] = await Promise.all([
      db.collection('contratos').get(),
      db.collection('inquilinos').get(),
      db.collection('proprietarios').get(),
      db.collection('imoveis').get()
    ]);

    const contratos = contSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const inquilinos = Object.fromEntries(inqSnap.docs.map(d => [d.id, d.data()]));
    const proprietarios = Object.fromEntries(propSnap.docs.map(d => [d.id, d.data()]));
    const imoveis = Object.fromEntries(imovSnap.docs.map(d => [d.id, d.data()]));

    const notificacoesEnviadas = getSentNotifications();
    const hoje = new Date();

    for (const contrato of contratos as any[]) {
      if (contrato.status !== 'Ativo') continue;

      const dInicio = contrato.dataInicio ? parseISO(contrato.dataInicio) : null;
      const dTermino = contrato.dataTermino ? parseISO(contrato.dataTermino) : null;
      
      // 1. Verificação de REAJUSTE
      if (dInicio) {
        let proximo = setYear(dInicio, getYear(hoje));
        if (isBefore(proximo, hoje) && differenceInDays(hoje, proximo) > 30) {
          proximo = addYears(proximo, 1);
        }
        
        const diffR = differenceInDays(proximo, hoje);
        const cicloR = format(proximo, 'MM/yyyy');
        
        let jaAjustado = false;
        if (contrato.lastAdjustmentCycle === cicloR) {
          jaAjustado = true;
        }

        if (!jaAjustado && diffR <= 40 && diffR >= -30) {
          const jaNotificado = notificacoesEnviadas.some((n: any) => 
            n.contratoId === contrato.id && 
            n.tipo === 'REAJUSTE' && 
            n.ciclo === cicloR
          );

          if (!jaNotificado) {
            await sendReajusteEmail(contrato, inquilinos, proprietarios, imoveis, diffR, cicloR);
            await registrarNotificacao(contrato.id, 'REAJUSTE', cicloR);
          }
        }
      }

      // 2. Verificação de FINAL DE CONTRATO (Vencimento)
      if (dTermino) {
        const diffV = differenceInDays(dTermino, hoje);
        const cicloV = format(dTermino, 'MM/yyyy');

        if (diffV <= 40 && diffV >= -30) {
          const jaNotificado = notificacoesEnviadas.some((n: any) => 
            n.contratoId === contrato.id && 
            n.tipo === 'VENCIMENTO' && 
            n.ciclo === cicloV
          );

          if (!jaNotificado) {
            await sendVencimentoEmail(contrato, inquilinos, proprietarios, imoveis, diffV);
            await registrarNotificacao(contrato.id, 'VENCIMENTO', cicloV);
          }
        }
      }
    }

    console.log('--- Verificação de notificações concluída ---');
  } catch (error) {
    console.error('Erro ao verificar/enviar notificações:', error);
  }
}

async function sendReajusteEmail(contrato: any, inquilinos: any, proprietarios: any, imoveis: any, dias: number, ciclo: string) {
  const inquilino = inquilinos[contrato.inquilinoId]?.nome || 'N/A';
  const proprietario = proprietarios[contrato.proprietarioId]?.nome || 'N/A';
  const imovel = imoveis[contrato.imovelId];
  const endereco = imovel ? `${imovel.endereco}, ${imovel.numero}` : 'N/A';

  const subject = `Alerta de reajuste de contrato ${contrato.codigo}`;
  const text = `
    Ola,
    
    Um alerta de reajuste surgiu para o contrato ${contrato.codigo}.
    
    Dados do Contrato:
    - Imovel: ${endereco}
    - Inquilino: ${inquilino}
    - Proprietario: ${proprietario}
    - Valor Atual: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valorAluguel)}
    - Indice: ${contrato.indiceReajuste}
    - Data do Aniversario: ${ciclo} (${dias < 0 ? 'Atrasado ' + Math.abs(dias) + ' dias' : 'Em ' + dias + ' dias'})
    
    Por favor, realize o processamento na aba de Gestao de Alertas do sistema.
    
    Equipe Morada Urbana
  `;

  try {
    await transporter.sendMail({
      from: `"Sistema Morada Urbana" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject,
      text,
    });
    console.log(`E-mail de reajuste enviado para contrato ${contrato.codigo}`);
  } catch (mailError) {
    console.error(`Erro ao enviar e-mail de reajuste para ${contrato.codigo}:`, mailError);
  }
}

async function sendVencimentoEmail(contrato: any, inquilinos: any, proprietarios: any, imoveis: any, dias: number) {
  const inquilino = inquilinos[contrato.inquilinoId]?.nome || 'N/A';
  const proprietario = proprietarios[contrato.proprietarioId]?.nome || 'N/A';
  const imovel = imoveis[contrato.imovelId];
  const endereco = imovel ? `${imovel.endereco}, ${imovel.numero}` : 'N/A';

  const subject = `Alerta de vencimento de contrato ${contrato.codigo}`;
  const text = `
    Ola,
    
    Um alerta de vencimento surgiu para o contrato ${contrato.codigo}.
    
    Dados do Contrato:
    - Imovel: ${endereco}
    - Inquilino: ${inquilino}
    - Proprietario: ${proprietario}
    - Data de Termino: ${format(parseISO(contrato.dataTermino), 'dd/MM/yyyy')} (${dias < 0 ? 'Vencido ha ' + Math.abs(dias) + ' dias' : 'Vence em ' + dias + ' dias'})
    
    Por favor, verifique a necessidade de renovacao ou encerramento.
    
    Equipe Morada Urbana
  `;

  try {
    await transporter.sendMail({
      from: `"Sistema Morada Urbana" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject,
      text,
    });
    console.log(`E-mail de vencimento enviado para contrato ${contrato.codigo}`);
  } catch (mailError) {
    console.error(`Erro ao enviar e-mail de vencimento para ${contrato.codigo}:`, mailError);
  }
}
