import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Download, Edit2, Trash2, X, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { pdf } from '@react-pdf/renderer';
import { InquilinoPDF, ProprietarioPDF } from '../components/PrestacaoContasPDF';
import { ConfirmDialog, AlertDialog } from '../components/ConfirmDialog';
import { useForm } from 'react-hook-form';

export interface ItemAdicional {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'acrescimo' | 'desconto' | 'despesa_proprietario' | 'nenhum';
  fazParteCondominio?: boolean;
}

export interface Cobranca {
  id: string;
  contratoId: string;
  inquilinoId: string;
  mesReferencia: string;
  dataVencimento: string;
  valorAluguel: number;
  valorCondominio: number;
  valorIptu: number;
  taxasExtras: number;
  condoProporcionalDesc?: string;
  condoProporcionalValor?: number;
  iptuProporcionalDesc?: string;
  iptuProporcionalValor?: number;
  itensAdicionais?: ItemAdicional[];
  valorTotal: number;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  dataPagamento?: string;
}

export interface Repasse {
  id: string;
  contratoId: string;
  proprietarioId: string;
  cobrancaId: string;
  mesReferencia: string;
  valorAluguel: number;
  valorRecebido: number;
  taxaAdministracao: number;
  valorCondominio?: number;
  tipoCondominio?: 'desconto' | 'repasse' | 'nenhum';
  valorIptu?: number;
  tipoIptu?: 'desconto' | 'repasse' | 'nenhum';
  condoProporcionalDesc?: string;
  condoProporcionalValor?: number;
  iptuProporcionalDesc?: string;
  iptuProporcionalValor?: number;
  itensAdicionais?: ItemAdicional[];
  valorLiquido: number;
  status: 'Pendente' | 'Pago';
  dataRepasse?: string;
}

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState<'receber' | 'pagar'>('receber');
  const [mesGeracao, setMesGeracao] = useState(format(new Date(), 'MM'));
  const [anoGeracao, setAnoGeracao] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState<string | null>(null);

  const [inquilinos, setInquilinos] = useState<Record<string, any>>({});
  const [proprietarios, setProprietarios] = useState<Record<string, any>>({});
  const [contratos, setContratos] = useState<Record<string, any>>({});
  const [imoveis, setImoveis] = useState<Record<string, any>>({});

  // Modals state
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ title: string, message: string } | null>(null);
  
  // Edit Cobranca state
  const [editingCobranca, setEditingCobranca] = useState<Cobranca | null>(null);
  const [editingItens, setEditingItens] = useState<ItemAdicional[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Cobranca>();

  // Edit Repasse state
  const [editingRepasse, setEditingRepasse] = useState<Repasse | null>(null);
  const [editingItensRepasse, setEditingItensRepasse] = useState<ItemAdicional[]>([]);
  const { register: registerRepasse, handleSubmit: handleSubmitRepasse, reset: resetRepasse } = useForm<Repasse>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cobSnap, repSnap, inqSnap, propSnap, contSnap, imovSnap] = await Promise.all([
        getDocs(collection(db, 'cobrancas')),
        getDocs(collection(db, 'repasses')),
        getDocs(collection(db, 'inquilinos')),
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'contratos')),
        getDocs(collection(db, 'imoveis'))
      ]);

      setCobrancas(cobSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cobranca)));
      setRepasses(repSnap.docs.map(d => ({ id: d.id, ...d.data() } as Repasse)));

      const inqMap: Record<string, any> = {};
      inqSnap.forEach(d => { inqMap[d.id] = { id: d.id, ...d.data() }; });
      setInquilinos(inqMap);

      const propMap: Record<string, any> = {};
      propSnap.forEach(d => { propMap[d.id] = { id: d.id, ...d.data() }; });
      setProprietarios(propMap);

      const contMap: Record<string, any> = {};
      contSnap.forEach(d => { contMap[d.id] = { id: d.id, ...d.data() }; });
      setContratos(contMap);

      const imovMap: Record<string, any> = {};
      imovSnap.forEach(d => { imovMap[d.id] = { id: d.id, ...d.data() }; });
      setImoveis(imovMap);

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'financeiro');
    } finally {
      setLoading(false);
    }
  };

  const filteredCobrancas = cobrancas.filter(cob => {
    const [mes, ano] = cob.mesReferencia.split('/');
    return mes === selectedMonth && ano === selectedYear;
  });

  const filteredRepasses = repasses.filter(rep => {
    const [mes, ano] = rep.mesReferencia.split('/');
    return mes === selectedMonth && ano === selectedYear;
  });

  const confirmarGeracaoCobrancas = () => {
    setConfirmAction({
      title: 'Gerar Cobranças',
      message: `Deseja gerar as cobranças para todos os contratos ativos para o mês ${mesGeracao}/${anoGeracao}?`,
      onConfirm: () => {
        setConfirmAction(null);
        executarGeracaoCobrancas();
      }
    });
  };

  const executarGeracaoCobrancas = async () => {
    try {
      setGerando(true);
      const mesReferencia = `${mesGeracao}/${anoGeracao}`;
      
      const contratosAtivos = Object.entries(contratos).filter(([_, c]: [string, any]) => c.status === 'Ativo');
      
      if (contratosAtivos.length === 0) {
        setAlertMessage({ title: 'Aviso', message: 'Nenhum contrato ativo encontrado para gerar cobranças.' });
        return;
      }

      const batch = writeBatch(db);
      let geradas = 0;

      for (const [id, contrato] of contratosAtivos as [string, any][]) {
        const q = query(
          collection(db, 'cobrancas'), 
          where('contratoId', '==', id),
          where('mesReferencia', '==', mesReferencia)
        );
        const exists = await getDocs(q);
        
        if (exists.empty) {
          const cobrancaRef = doc(collection(db, 'cobrancas'));
          
          const [mes, ano] = mesReferencia.split('/').map(Number);
          const vencimento = new Date(ano, mes - 1, contrato.diaVencimento);

          const imovel = imoveis[contrato.imovelId];
          const valorCondominio = imovel?.valorCondominio || 0;
          
          let valorIptu = 0;
          if (imovel?.iptuAtivo) {
            const mesInicio = Number(imovel.iptuMesInicio) || 2;
            const numParcelas = Number(imovel.iptuNumParcelas) || 10;
            const [mesCob] = mesReferencia.split('/').map(Number);
            
            // O IPTU é cobrado dentro do ano civil, começando no mês de início
            // Ex: Início 2 (Fev), 10 parcelas -> vai até mês 11 (Nov)
            const mesFinal = mesInicio + numParcelas - 1;
            
            if (mesCob >= mesInicio && mesCob <= mesFinal) {
              valorIptu = imovel.valorIptu || 0;
            }
          }

          const valorTotal = contrato.valorAluguel + valorCondominio + valorIptu;

          batch.set(cobrancaRef, {
            contratoId: id,
            inquilinoId: contrato.inquilinoId,
            mesReferencia,
            dataVencimento: vencimento.toISOString(),
            valorAluguel: contrato.valorAluguel,
            valorCondominio,
            valorIptu,
            taxasExtras: 0,
            valorTotal,
            status: 'Pendente',
            createdAt: new Date().toISOString()
          });
          geradas++;
        }
      }

      if (geradas > 0) {
        await batch.commit();
        setAlertMessage({ title: 'Sucesso', message: `${geradas} cobrança(s) gerada(s) com sucesso para ${mesReferencia}!` });
        fetchData();
      } else {
        setAlertMessage({ title: 'Aviso', message: `Nenhuma nova cobrança para gerar em ${mesReferencia}. As cobranças deste mês já foram geradas.` });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cobrancas_batch');
    } finally {
      setGerando(false);
    }
  };

  const openEditCobranca = (cob: Cobranca) => {
    reset({
      ...cob,
      dataVencimento: cob.dataVencimento ? format(new Date(cob.dataVencimento), 'yyyy-MM-dd') : ''
    });
    setEditingItens(cob.itensAdicionais || []);
    setEditingCobranca(cob);
  };

  const onSubmitEditCobranca = async (data: Cobranca) => {
    try {
      if (!editingCobranca) return;
      
      const valorAluguel = Number(Number(data.valorAluguel).toFixed(2)) || 0;
      const valorCondominio = Number(Number(data.valorCondominio).toFixed(2)) || 0;
      const valorIptu = Number(Number(data.valorIptu).toFixed(2)) || 0;
      const taxasExtras = Number(Number(data.taxasExtras).toFixed(2)) || 0;
      const condoProporcionalValor = Number(Number(data.condoProporcionalValor).toFixed(2)) || 0;
      const iptuProporcionalValor = Number(Number(data.iptuProporcionalValor).toFixed(2)) || 0;
      
      let valorTotal = valorAluguel + valorCondominio + valorIptu + taxasExtras + condoProporcionalValor + iptuProporcionalValor;
      
      editingItens.forEach(item => {
        if (item.tipo === 'acrescimo') valorTotal += item.valor;
        else if (item.tipo === 'desconto') valorTotal -= item.valor;
        // Itens do tipo 'despesa_proprietario' são ignorados na soma do inquilino
      });

      valorTotal = Number(valorTotal.toFixed(2));

      const cobRef = doc(db, 'cobrancas', editingCobranca.id);
      const [year, month, day] = data.dataVencimento.split('-').map(Number);
      await updateDoc(cobRef, {
        dataVencimento: new Date(year, month - 1, day).toISOString(),
        valorAluguel,
        valorCondominio,
        valorIptu,
        taxasExtras,
        condoProporcionalDesc: data.condoProporcionalDesc || '',
        condoProporcionalValor,
        iptuProporcionalDesc: data.iptuProporcionalDesc || '',
        iptuProporcionalValor,
        itensAdicionais: editingItens,
        valorTotal
      });

      setEditingCobranca(null);
      setEditingItens([]);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'cobranca');
    }
  };

  const handleDeleteCobranca = (id: string) => {
    setConfirmAction({
      title: 'Excluir Cobrança',
      message: 'Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'cobrancas', id));
          setConfirmAction(null);
          fetchData();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `cobrancas/${id}`);
        }
      }
    });
  };

  const handleDeleteRepasse = (id: string) => {
    setConfirmAction({
      title: 'Excluir Repasse',
      message: 'Tem certeza que deseja excluir este repasse? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'repasses', id));
          setConfirmAction(null);
          fetchData();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `repasses/${id}`);
        }
      }
    });
  };

  const marcarComoPago = async (cobranca: Cobranca) => {
    setConfirmAction({
      title: 'Confirmar Pagamento',
      message: 'Confirma o recebimento desta cobrança? Isso irá gerar automaticamente o repasse para o proprietário.',
      onConfirm: async () => {
        try {
          // Buscar a versão mais recente da cobrança para garantir que temos os itens adicionais
          const cobSnap = await getDocs(query(collection(db, 'cobrancas'), where('__name__', '==', cobranca.id)));
          if (cobSnap.empty) throw new Error("Cobrança não encontrada");
          const latestCobranca = { id: cobSnap.docs[0].id, ...cobSnap.docs[0].data() } as Cobranca;

          const contrato = contratos[latestCobranca.contratoId];
          if (!contrato) throw new Error("Contrato não encontrado");

          const batch = writeBatch(db);
          
          const cobRef = doc(db, 'cobrancas', latestCobranca.id);
          batch.update(cobRef, {
            status: 'Pago',
            dataPagamento: new Date().toISOString()
          });

          const repasseRef = doc(collection(db, 'repasses'));
          const taxaAdmValor = Number(((latestCobranca.valorAluguel * contrato.taxaAdministracao) / 100).toFixed(2));
          
          // Copiar itens da cobrança para o repasse
          const itensAdicionaisRepasse = (latestCobranca.itensAdicionais || []).map(item => ({
            ...item,
            // Acréscimos na cobrança (como utilitários) costumam ser neutros para o proprietário
            // Despesas do proprietário viram descontos no repasse
            tipo: item.tipo === 'despesa_proprietario' ? 'desconto' : 'nenhum'
          }));

          // Cálculo do valor líquido inicial baseado na lógica do usuário:
          // Valor Líquido = Valor Recebido (Total do Inquilino) - Taxa Adm - Valor Total do Condomínio (pago pela ADM)
          // E subtraímos as despesas do proprietário que foram ignoradas no valorRecebido
          const valorRecebido = Number(latestCobranca.valorTotal.toFixed(2));
          const valorCondominioTotal = Number((latestCobranca.valorCondominio || 0).toFixed(2));
          const valorIptuTotal = Number((latestCobranca.valorIptu || 0).toFixed(2));
          
          let valorLiquido = valorRecebido - taxaAdmValor - valorCondominioTotal - valorIptuTotal;

          // Subtrair despesas do proprietário que não entraram no valorRecebido
          (latestCobranca.itensAdicionais || []).forEach(item => {
            if (item.tipo === 'despesa_proprietario') {
              valorLiquido -= item.valor;
            }
          });

          valorLiquido = Number(valorLiquido.toFixed(2));

          const repasseData = {
            contratoId: latestCobranca.contratoId,
            proprietarioId: contrato.proprietarioId,
            cobrancaId: latestCobranca.id,
            mesReferencia: latestCobranca.mesReferencia,
            valorAluguel: Number(latestCobranca.valorAluguel.toFixed(2)),
            valorRecebido: valorRecebido,
            taxaAdministracao: taxaAdmValor,
            valorCondominio: valorCondominioTotal,
            tipoCondominio: 'desconto', // Desconto porque a ADM paga o boleto total
            valorIptu: valorIptuTotal,
            tipoIptu: 'desconto',
            condoProporcionalDesc: latestCobranca.condoProporcionalDesc || '',
            condoProporcionalValor: latestCobranca.condoProporcionalValor || 0,
            iptuProporcionalDesc: latestCobranca.iptuProporcionalDesc || '',
            iptuProporcionalValor: latestCobranca.iptuProporcionalValor || 0,
            itensAdicionais: itensAdicionaisRepasse,
            valorLiquido: valorLiquido,
            status: 'Pendente',
            createdAt: new Date().toISOString()
          };

          console.log('Gerando repasse com itens:', itensAdicionaisRepasse);
          batch.set(repasseRef, repasseData);

          await batch.commit();
          setConfirmAction(null);
          fetchData();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'cobranca_pagamento');
        }
      }
    });
  };

  const marcarRepassePago = async (repasseId: string) => {
    setConfirmAction({
      title: 'Confirmar Repasse',
      message: 'Confirma que o repasse foi transferido para o proprietário?',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'repasses', repasseId), {
            status: 'Pago',
            dataRepasse: new Date().toISOString()
          });
          setConfirmAction(null);
          fetchData();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'repasse_pagamento');
        }
      }
    });
  };

  const openEditRepasse = (rep: Repasse) => {
    const cobranca = cobrancas.find(c => c.id === rep.cobrancaId);
    
    // Garantir que os valores venham da cobrança se não existirem no repasse (fallback robusto)
    const valorCondominio = rep.valorCondominio !== undefined && rep.valorCondominio !== null 
      ? rep.valorCondominio 
      : (cobranca?.valorCondominio || 0);
      
    const valorIptu = rep.valorIptu !== undefined && rep.valorIptu !== null 
      ? rep.valorIptu 
      : (cobranca?.valorIptu || 0);

    resetRepasse({
      ...rep,
      valorAluguel: Number((rep.valorAluguel || (cobranca?.valorAluguel || 0)).toFixed(2)),
      valorRecebido: Number((rep.valorRecebido || (cobranca?.valorTotal || 0)).toFixed(2)),
      taxaAdministracao: Number((rep.taxaAdministracao || 0).toFixed(2)),
      valorCondominio: Number(valorCondominio.toFixed(2)),
      tipoCondominio: rep.tipoCondominio || 'desconto',
      valorIptu: Number(valorIptu.toFixed(2)),
      tipoIptu: rep.tipoIptu || 'desconto',
      condoProporcionalDesc: rep.condoProporcionalDesc || (cobranca?.condoProporcionalDesc || ''),
      condoProporcionalValor: Number((rep.condoProporcionalValor || (cobranca?.condoProporcionalValor || 0)).toFixed(2)),
      iptuProporcionalDesc: rep.iptuProporcionalDesc || (cobranca?.iptuProporcionalDesc || ''),
      iptuProporcionalValor: Number((rep.iptuProporcionalValor || (cobranca?.iptuProporcionalValor || 0)).toFixed(2))
    });
    setEditingItensRepasse(rep.itensAdicionais || []);
    setEditingRepasse(rep);
  };

  const onSubmitEditRepasse = async (data: Repasse) => {
    try {
      if (!editingRepasse) return;
      
      const valorAluguel = Number(Number(data.valorAluguel).toFixed(2)) || 0;
      const valorRecebido = Number(Number(data.valorRecebido).toFixed(2)) || 0;
      const taxaAdministracao = Number(Number(data.taxaAdministracao).toFixed(2)) || 0;
      const valorCondominio = Number(Number(data.valorCondominio).toFixed(2)) || 0;
      const valorIptu = Number(Number(data.valorIptu).toFixed(2)) || 0;
      const tipoCondominio = data.tipoCondominio || 'nenhum';
      const tipoIptu = data.tipoIptu || 'nenhum';
      
      // Cálculo do valor líquido baseado no Valor Recebido (Total do Inquilino)
      let valorLiquido = valorRecebido - taxaAdministracao;
      
      if (tipoCondominio === 'desconto') {
        valorLiquido -= valorCondominio;
      }
      
      if (tipoIptu === 'desconto') {
        valorLiquido -= valorIptu;
      }
      
      editingItensRepasse.forEach(item => {
        if (item.tipo === 'acrescimo') valorLiquido += item.valor;
        else if (item.tipo === 'desconto') valorLiquido -= item.valor;
      });

      valorLiquido = Number(valorLiquido.toFixed(2));

      const repRef = doc(db, 'repasses', editingRepasse.id);
      await updateDoc(repRef, {
        valorAluguel,
        valorRecebido,
        taxaAdministracao,
        valorCondominio,
        tipoCondominio,
        valorIptu,
        tipoIptu,
        condoProporcionalDesc: data.condoProporcionalDesc || '',
        condoProporcionalValor: Number(Number(data.condoProporcionalValor).toFixed(2)) || 0,
        iptuProporcionalDesc: data.iptuProporcionalDesc || '',
        iptuProporcionalValor: Number(Number(data.iptuProporcionalValor).toFixed(2)) || 0,
        itensAdicionais: editingItensRepasse,
        valorLiquido
      });

      setEditingRepasse(null);
      setEditingItensRepasse([]);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'repasse');
    }
  };

  const downloadInquilinoPDF = async (cobranca: Cobranca) => {
    try {
      setBaixandoPdf(cobranca.id);
      const contrato = contratos[cobranca.contratoId];
      const inquilino = inquilinos[cobranca.inquilinoId];
      const imovel = imoveis[contrato?.imovelId];

      const blob = await pdf(
        <InquilinoPDF 
          cobranca={cobranca} 
          contrato={contrato} 
          inquilino={inquilino} 
          imovel={imovel} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prestacao_Contas_${inquilino?.nome}_${cobranca.mesReferencia.replace('/', '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setAlertMessage({ title: 'Erro', message: 'Erro ao gerar o PDF.' });
    } finally {
      setBaixandoPdf(null);
    }
  };

  const downloadProprietarioPDF = async (repasse: Repasse) => {
    try {
      setBaixandoPdf(repasse.id);
      const contrato = contratos[repasse.contratoId];
      const proprietario = proprietarios[repasse.proprietarioId];
      const inquilino = inquilinos[contrato?.inquilinoId];
      const imovel = imoveis[contrato?.imovelId];
      const cobranca = cobrancas.find(c => c.id === repasse.cobrancaId);

      const blob = await pdf(
        <ProprietarioPDF 
          repasse={repasse}
          cobranca={cobranca} 
          contrato={contrato} 
          proprietario={proprietario}
          inquilino={inquilino} 
          imovel={imovel} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Repasse_${proprietario?.nome}_${repasse.mesReferencia.replace('/', '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setAlertMessage({ title: 'Erro', message: 'Erro ao gerar o PDF.' });
    } finally {
      setBaixandoPdf(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Pago': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle size={12}/> Pago</span>;
      case 'Pendente': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1 w-fit"><Clock size={12}/> Pendente</span>;
      case 'Atrasado': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1 w-fit"><AlertCircle size={12}/> Atrasado</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Financeiro</h1>
          <p className="text-gray-500">Gestão de recebimentos e repasses</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-600 px-2">Filtro:</span>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                return <option key={month} value={month}>{format(new Date(2000, i), 'MMMM', { locale: ptBR })}</option>;
              })}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = (new Date().getFullYear() - 2 + i).toString();
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-[#1E2732]/5 p-2 rounded-lg border border-[#1E2732]/10">
            <span className="text-sm font-medium text-[#1E2732] px-2">Gerar Competência:</span>
            <select 
              value={mesGeracao}
              onChange={(e) => setMesGeracao(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                return <option key={month} value={month}>{format(new Date(2000, i), 'MMMM', { locale: ptBR })}</option>;
              })}
            </select>
            <select 
              value={anoGeracao}
              onChange={(e) => setAnoGeracao(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = (new Date().getFullYear() - 2 + i).toString();
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <button 
              onClick={confirmarGeracaoCobrancas}
              disabled={gerando}
              className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <RefreshCw size={18} className={gerando ? "animate-spin" : ""} />
              {gerando ? 'Gerando...' : 'Gerar Cobranças'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative ${activeTab === 'receber' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('receber')}
        >
          Contas a Receber (Inquilinos)
          {activeTab === 'receber' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative ${activeTab === 'pagar' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pagar')}
        >
          Contas a Pagar (Repasses)
          {activeTab === 'pagar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'receber' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-medium text-gray-500 text-sm">Inquilino / Contrato</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Referência</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Vencimento</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Valor</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                    <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCobrancas.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma cobrança encontrada para o período.</td></tr>
                  ) : (
                    filteredCobrancas.map(cob => (
                      <tr key={cob.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-[#1E2732]">{inquilinos[cob.inquilinoId]?.nome || 'Desconhecido'}</p>
                          <p className="text-xs text-gray-500">CT: {contratos[cob.contratoId]?.codigo}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{cob.mesReferencia}</td>
                        <td className="p-4 text-sm text-gray-600">{format(new Date(cob.dataVencimento), 'dd/MM/yyyy')}</td>
                        <td className="p-4 font-bold text-[#1E2732]">{formatCurrency(cob.valorTotal)}</td>
                        <td className="p-4">{getStatusBadge(cob.status)}</td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => downloadInquilinoPDF(cob)}
                            disabled={baixandoPdf === cob.id}
                            className="p-2 text-gray-500 hover:text-[#F47B20] hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Baixar Prestação de Contas"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => openEditCobranca(cob)}
                            className="p-2 text-gray-500 hover:text-[#F47B20] hover:bg-orange-50 rounded-lg transition-colors"
                            title="Revisar / Editar Valores"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCobranca(cob.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Cobrança"
                          >
                            <Trash2 size={18} />
                          </button>
                          {cob.status !== 'Pago' && (
                            <button 
                              onClick={() => marcarComoPago(cob)}
                              className="text-sm bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium transition-colors"
                            >
                              Marcar Pago
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-medium text-gray-500 text-sm">Proprietário / Contrato</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Referência</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Valor Bruto</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Taxa Adm</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Líquido a Repassar</th>
                    <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                    <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepasses.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum repasse encontrado para o período.</td></tr>
                  ) : (
                    filteredRepasses.map(rep => (
                      <tr key={rep.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-[#1E2732]">{proprietarios[rep.proprietarioId]?.nome || 'Desconhecido'}</p>
                          <p className="text-xs text-gray-500">CT: {contratos[rep.contratoId]?.codigo}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{rep.mesReferencia}</td>
                        <td className="p-4 text-sm text-gray-600">{formatCurrency(rep.valorRecebido)}</td>
                        <td className="p-4 text-sm text-red-500">-{formatCurrency(rep.taxaAdministracao)}</td>
                        <td className="p-4 font-bold text-[#1E2732]">{formatCurrency(rep.valorLiquido)}</td>
                        <td className="p-4">{getStatusBadge(rep.status)}</td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => downloadProprietarioPDF(rep)}
                            disabled={baixandoPdf === rep.id}
                            className="p-2 text-gray-500 hover:text-[#F47B20] hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Baixar Recibo de Repasse"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => openEditRepasse(rep)}
                            className="p-2 text-gray-500 hover:text-[#F47B20] hover:bg-orange-50 rounded-lg transition-colors"
                            title="Revisar / Editar Valores"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRepasse(rep.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Repasse"
                          >
                            <Trash2 size={18} />
                          </button>
                          {rep.status !== 'Pago' && (
                            <button 
                              onClick={() => marcarRepassePago(rep.id)}
                              className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                            >
                              Efetuar Repasse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Cobrança */}
      {editingCobranca && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-[#1E2732]">Revisar Cobrança</h2>
              <button onClick={() => setEditingCobranca(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmitEditCobranca)} className="flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Vencimento</label>
                    <input type="date" {...register('dataVencimento', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Aluguel (R$)</label>
                    <input type="number" step="0.01" {...register('valorAluguel', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Condomínio (R$)</label>
                    <input type="number" step="0.01" {...register('valorCondominio')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">IPTU (R$)</label>
                    <input type="number" step="0.01" {...register('valorIptu')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Taxas Extras (R$)</label>
                    <input type="number" step="0.01" {...register('taxasExtras')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Condomínio Proporcional</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Descrição" {...register('condoProporcionalDesc')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <input type="number" step="0.01" placeholder="Valor" {...register('condoProporcionalValor')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">IPTU Proporcional</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Descrição" {...register('iptuProporcionalDesc')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <input type="number" step="0.01" placeholder="Valor" {...register('iptuProporcionalValor')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-[#1E2732]">Itens Adicionais (Água, Luz, etc)</h3>
                    <button 
                      type="button" 
                      onClick={() => setEditingItens([...editingItens, { id: Date.now().toString(), descricao: '', valor: 0, tipo: 'acrescimo' }])}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                  {editingItens.map((item, index) => (
                    <div key={item.id} className="flex gap-2 mb-2 items-start">
                      <input 
                        type="text" 
                        placeholder="Descrição" 
                        value={item.descricao}
                        onChange={(e) => {
                          const newItens = [...editingItens];
                          newItens[index].descricao = e.target.value;
                          setEditingItens(newItens);
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Valor" 
                        value={item.valor}
                        onChange={(e) => {
                          const newItens = [...editingItens];
                          newItens[index].valor = Number(e.target.value);
                          setEditingItens(newItens);
                        }}
                        className="w-24 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <select
                        value={item.tipo}
                        onChange={(e) => {
                          const newItens = [...editingItens];
                          newItens[index].tipo = e.target.value as 'acrescimo' | 'desconto' | 'despesa_proprietario';
                          setEditingItens(newItens);
                        }}
                        className="w-28 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      >
                        <option value="acrescimo">Acréscimo</option>
                        <option value="desconto">Desconto</option>
                        <option value="despesa_proprietario">Desp. Proprietário</option>
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setEditingItens(editingItens.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setEditingCobranca(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#d96a1b] font-medium transition-colors">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Repasse */}
      {editingRepasse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-[#1E2732]">Revisar Repasse</h2>
              <button onClick={() => setEditingRepasse(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitRepasse(onSubmitEditRepasse)} className="flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Aluguel (R$)</label>
                    <input type="number" step="0.01" {...registerRepasse('valorAluguel', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Valor Recebido (Total Inquilino)</label>
                    <input type="number" step="0.01" {...registerRepasse('valorRecebido', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Taxa Adm. (R$)</label>
                    <input type="number" step="0.01" {...registerRepasse('taxaAdministracao', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Condomínio Total (Boleto ADM)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" {...registerRepasse('valorCondominio')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <select {...registerRepasse('tipoCondominio')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none bg-white">
                        <option value="nenhum">Nenhum</option>
                        <option value="desconto">Desconto (Pago pela ADM)</option>
                        <option value="repasse">Repasse (Recebido do Inquilino)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">IPTU Total (Boleto ADM)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.01" {...registerRepasse('valorIptu')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <select {...registerRepasse('tipoIptu')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none bg-white">
                        <option value="nenhum">Nenhum</option>
                        <option value="desconto">Desconto (Pago pela ADM)</option>
                        <option value="repasse">Repasse (Recebido do Inquilino)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Condomínio Proporcional</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Descrição" {...registerRepasse('condoProporcionalDesc')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <input type="number" step="0.01" placeholder="Valor" {...registerRepasse('condoProporcionalValor')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">IPTU Proporcional</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Descrição" {...registerRepasse('iptuProporcionalDesc')} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                      <input type="number" step="0.01" placeholder="Valor" {...registerRepasse('iptuProporcionalValor')} className="w-40 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-[#1E2732]">Itens Adicionais</h3>
                    <button 
                      type="button" 
                      onClick={() => setEditingItensRepasse([...editingItensRepasse, { id: Date.now().toString(), descricao: '', valor: 0, tipo: 'acrescimo' }])}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                  {editingItensRepasse.map((item, index) => (
                    <div key={item.id} className="flex gap-2 mb-2 items-start">
                      <input 
                        type="text" 
                        placeholder="Descrição" 
                        value={item.descricao}
                        onChange={(e) => {
                          const newItens = [...editingItensRepasse];
                          newItens[index].descricao = e.target.value;
                          setEditingItensRepasse(newItens);
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Valor" 
                        value={item.valor}
                        onChange={(e) => {
                          const newItens = [...editingItensRepasse];
                          newItens[index].valor = Number(e.target.value);
                          setEditingItensRepasse(newItens);
                        }}
                        className="w-24 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <select
                        value={item.tipo}
                        onChange={(e) => {
                          const newItens = [...editingItensRepasse];
                          newItens[index].tipo = e.target.value as any;
                          setEditingItensRepasse(newItens);
                        }}
                        className="w-28 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F47B20] outline-none"
                      >
                        <option value="nenhum">Nenhum</option>
                        <option value="acrescimo">Acréscimo</option>
                        <option value="desconto">Desconto</option>
                      </select>
                      <div className="flex items-center gap-1 h-10 px-2 border border-gray-300 rounded-lg bg-gray-50">
                        <input 
                          type="checkbox" 
                          id={`condo-${item.id}`}
                          checked={item.fazParteCondominio || false}
                          onChange={(e) => {
                            const newItens = [...editingItensRepasse];
                            newItens[index].fazParteCondominio = e.target.checked;
                            setEditingItensRepasse(newItens);
                          }}
                          className="rounded text-[#F47B20] focus:ring-[#F47B20]"
                        />
                        <label htmlFor={`condo-${item.id}`} className="text-[10px] leading-tight text-gray-600 font-medium">Boleto Cond.</label>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setEditingItensRepasse(editingItensRepasse.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setEditingRepasse(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#d96a1b] font-medium transition-colors">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <ConfirmDialog 
        isOpen={!!confirmAction} 
        title={confirmAction?.title || ''} 
        message={confirmAction?.message || ''} 
        onConfirm={() => confirmAction?.onConfirm()} 
        onCancel={() => setConfirmAction(null)} 
      />
      <AlertDialog 
        isOpen={!!alertMessage} 
        title={alertMessage?.title || ''} 
        message={alertMessage?.message || ''} 
        onClose={() => setAlertMessage(null)} 
      />
    </div>
  );
}
