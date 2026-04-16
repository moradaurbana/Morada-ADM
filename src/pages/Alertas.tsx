import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Calendar, AlertTriangle, ArrowUpRight, CheckCircle, Clock, Home, User } from 'lucide-react';
import { 
  format, 
  addDays, 
  isAfter, 
  isBefore, 
  differenceInDays, 
  parseISO, 
  addYears,
  setYear,
  getYear,
  getMonth,
  getDate
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contrato {
  id: string;
  codigo: string;
  imovelId: string;
  proprietarioId: string;
  inquilinoId: string;
  dataInicio: string;
  dataTermino: string;
  valorAluguel: number;
  status: 'Ativo' | 'Encerrado' | 'Inadimplente';
}

interface Imovel {
  id: string;
  endereco: string;
}

interface Pessoa {
  id: string;
  nome: string;
}

interface ItemAlerta {
  contratoId: string;
  contratoCodigo: string;
  tipo: 'Reajuste' | 'Vencimento';
  dataAlerta: Date;
  diasRestantes: number;
  nivel: 'urgente' | 'atencao' | 'ok';
  pessoaInteresse: string;
  imovelEndereco: string;
  detalhe: string;
}

export default function Alertas() {
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<ItemAlerta[]>([]);
  const [resumo, setResumo] = useState({ reajustes: 0, vencimentos: 0 });

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const [contratosSnap, imoveisSnap, propsSnap, inqsSnap] = await Promise.all([
        getDocs(query(collection(db, 'contratos'), where('status', '==', 'Ativo'))),
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'inquilinos'))
      ]);

      const imoveis = imoveisSnap.docs.map(d => ({ id: d.id, ...d.data() } as Imovel));
      const proprietarios = propsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pessoa));
      const inquilinos = inqsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pessoa));

      const hoje = new Date();
      const limiteAlerta = addDays(hoje, 40);

      const novosAlertas: ItemAlerta[] = [];
      let countReajuste = 0;
      let countVencimento = 0;

      contratosSnap.forEach(docSnap => {
        const contrato = { id: docSnap.id, ...docSnap.data() } as Contrato;
        const imovel = imoveis.find(i => i.id === contrato.imovelId);
        const proprietario = proprietarios.find(p => p.id === contrato.proprietarioId);
        const inquilino = inquilinos.find(i => i.id === contrato.inquilinoId);

        // 1. Verificar Vencimento de Contrato
        const dataTermino = parseISO(contrato.dataTermino);
        const diasTermino = differenceInDays(dataTermino, hoje);

        if (diasTermino <= 40 && diasTermino >= -30) { // Mostra alertas até 30 dias após vencido se estiver ativo
          countVencimento++;
          novosAlertas.push({
            contratoId: contrato.id,
            contratoCodigo: contrato.codigo,
            tipo: 'Vencimento',
            dataAlerta: dataTermino,
            diasRestantes: diasTermino,
            nivel: diasTermino <= 15 ? 'urgente' : 'atencao',
            pessoaInteresse: `${proprietario?.nome || 'Proprietário'} / ${inquilino?.nome || 'Inquilino'}`,
            imovelEndereco: imovel?.endereco || 'Endereço não encontrado',
            detalhe: diasTermino < 0 ? `Vencido há ${Math.abs(diasTermino)} dias` : `Vence em ${diasTermino} dias`
          });
        }

        // 2. Verificar Reajuste Anual (Aniversário do Contrato)
        const dataInicio = parseISO(contrato.dataInicio);
        // Calcular o próximo aniversário
        let proximoAniversario = setYear(dataInicio, getYear(hoje));
        
        // Se o aniversário deste ano já passou há mais de 30 dias, o próximo é no ano que vem
        if (isBefore(proximoAniversario, hoje) && differenceInDays(hoje, proximoAniversario) > 30) {
          proximoAniversario = addYears(proximoAniversario, 1);
        }

        const diasReajuste = differenceInDays(proximoAniversario, hoje);

        // Só gera alerta se o contrato tiver pelo menos 11 meses (evita alerta imediato no 1º mês)
        const mesesDesdeInicio = Math.floor(differenceInDays(hoje, dataInicio) / 30);

        if (mesesDesdeInicio >= 11 && diasReajuste <= 40 && diasReajuste >= -30) {
          countReajuste++;
          novosAlertas.push({
            contratoId: contrato.id,
            contratoCodigo: contrato.codigo,
            tipo: 'Reajuste',
            dataAlerta: proximoAniversario,
            diasRestantes: diasReajuste,
            nivel: diasReajuste <= 15 ? 'urgente' : 'atencao',
            pessoaInteresse: proprietario?.nome || 'Proprietário',
            imovelEndereco: imovel?.endereco || 'Endereço não encontrado',
            detalhe: diasReajuste < 0 ? `Atrasado ${Math.abs(diasReajuste)} dias` : `Em ${diasReajuste} dias`
          });
        }
      });

      // Ordenar por urgência e depois por dias
      novosAlertas.sort((a, b) => a.diasRestantes - b.diasRestantes);

      setAlertas(novosAlertas);
      setResumo({ reajustes: countReajuste, vencimentos: countVencimento });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'alertas_gestao');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F47B20]"></div>
        <p className="text-gray-500 font-medium">Analisando prazos e contratos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Gestão de Alertas</h1>
          <p className="text-gray-500">Monitoramento proativo de reajustes e vencimentos (Prazos de 40 dias)</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Reajustes</p>
              <p className="text-lg font-bold text-[#1E2732]">{resumo.reajustes}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Vencimentos</p>
              <p className="text-lg font-bold text-[#1E2732]">{resumo.vencimentos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna de Reajustes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-[#F47B20]/10 text-[#F47B20] rounded-md">
              <ArrowUpRight size={20} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Próximos Reajustes</h2>
          </div>
          
          <div className="space-y-3">
            {alertas.filter(a => a.tipo === 'Reajuste').length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
                <p className="text-gray-500">Nenhum reajuste previsto para os próximos 40 dias.</p>
              </div>
            ) : (
              alertas.filter(a => a.tipo === 'Reajuste').map((alerta, idx) => (
                <div key={`reajuste-${idx}`}>
                  <AlertaCard alerta={alerta} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna de Vencimentos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
              <Calendar size={20} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Vencimentos de Contrato</h2>
          </div>

          <div className="space-y-3">
            {alertas.filter(a => a.tipo === 'Vencimento').length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
                <p className="text-gray-500">Nenhum vencimento previsto para os próximos 40 dias.</p>
              </div>
            ) : (
              alertas.filter(a => a.tipo === 'Vencimento').map((alerta, idx) => (
                <div key={`vencimento-${idx}`}>
                  <AlertaCard alerta={alerta} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertaCard({ alerta }: { alerta: ItemAlerta }) {
  const isUrgente = alerta.nivel === 'urgente';
  const isVencido = alerta.diasRestantes < 0;

  return (
    <div className={`group bg-white p-4 rounded-2xl border transition-all ${
      isUrgente ? 'border-red-100 hover:border-red-200 shadow-sm shadow-red-50' : 'border-gray-100 hover:border-orange-200 shadow-sm shadow-gray-50'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            alerta.tipo === 'Reajuste' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
          }`}>
            {alerta.tipo}
          </span>
          <span className="text-[10px] font-mono text-gray-400 font-bold">{alerta.contratoCodigo}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${
          isVencido ? 'text-red-600' : isUrgente ? 'text-red-500' : 'text-orange-500'
        }`}>
          {isVencido ? <AlertTriangle size={14} /> : <Clock size={14} />}
          {alerta.detalhe}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm text-[#1E2732] font-semibold">
          <Home size={16} className="shrink-0 mt-0.5 text-gray-400" />
          <p className="line-clamp-1">{alerta.imovelEndereco}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <User size={14} className="shrink-0 text-gray-300" />
          <p className="truncate">{alerta.pessoaInteresse}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
        <p>Data Alvo: <span className="font-bold text-gray-600">{format(alerta.dataAlerta, 'dd/MM/yyyy')}</span></p>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-[#F47B20]">Iniciar Tratativa &rarr;</span>
      </div>
    </div>
  );
}
