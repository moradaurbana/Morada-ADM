import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Calendar, AlertTriangle, ArrowUpRight, CheckCircle, Clock, Home, User, Check, Calculator, Download, X as XIcon } from 'lucide-react';
import { 
  format, 
  addDays, 
  addMonths,
  isAfter, 
  isBefore, 
  differenceInDays, 
  parseISO, 
  addYears,
  subMonths,
  setYear,
  getYear,
  getMonth,
  getDate
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, updateDoc, deleteField, getDoc } from 'firebase/firestore';
import { IndicesService } from '../services/indicesService';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { LOGOS } from '../constants/images';
import extenso from 'extenso';

const logo1Path = LOGOS.logo1;

// Estilos do PDF para a Carta de Reajuste
const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9.5, color: '#334155', lineHeight: 1.3 },
  header: { marginBottom: 12, borderBottom: '2px solid #F47B20', paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 80 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#1E2732', textAlign: 'right' },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1E2732', marginBottom: 6, backgroundColor: '#f8fafc', padding: 5, borderRadius: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 140, fontWeight: 'bold', color: '#64748b' },
  value: { flex: 1, color: '#1E2732' },
  text: { marginBottom: 6, textAlign: 'justify', lineHeight: 1.4 },
  footer: { marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 10, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
  signature: { marginTop: 20, alignItems: 'center' },
  signatureLine: { width: 220, borderTop: '1px solid #334155', marginTop: 20, textAlign: 'center', fontSize: 8 },
  highlight: { backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#1E2732', padding: 10, borderRadius: 8, marginTop: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 11 },
  bold: { fontWeight: 'bold', color: '#1E2732' }
});

const CartaReajustePDF = ({ alerta, valorPercentual, novoValor }: { alerta: ItemAlerta, valorPercentual: number, novoValor: number }) => {
  const dataRef = new Date();
  
  // Lógica de Vigência: 
  // Se o aniversário é Abril (Uso em Maio), o pagamento é em Junho (mês vencido)
  const dataUso = addMonths(alerta.dataAlerta, 1);
  const dataPagamento = addMonths(alerta.dataAlerta, 2);
  
  const mesUsoDesc = format(dataUso, "MMMM/yyyy", { locale: ptBR });
  const mesPagamentoDesc = format(dataPagamento, "MMMM/yyyy", { locale: ptBR });

  const periodoCalculo = (() => {
    const alvo = alerta.dataAlerta;
    const inicio = subMonths(alvo, 12);
    const fim = subMonths(alvo, 1);
    return `${format(inicio, "MMMM/yyyy", { locale: ptBR })} a ${format(fim, "MMMM/yyyy", { locale: ptBR })}`;
  })();

  const valorExtensoNovo = extenso(novoValor.toFixed(2).replace('.', ','), { mode: 'currency', currency: { type: 'BRL' } });
  const valorExtensoCorr = extenso((novoValor - (alerta.valorAtual || 0)).toFixed(2).replace('.', ','), { mode: 'currency', currency: { type: 'BRL' } });

  const formatAddress = (obj: any) => {
    if (!obj) return 'N/A';
    const parts = [];
    if (obj.endereco) parts.push(`${obj.endereco}${obj.numero ? `, ${obj.numero}` : ''}`);
    if (obj.complemento) parts.push(obj.complemento);
    if (obj.bairro) parts.push(obj.bairro);
    if (obj.cidade || obj.estado) parts.push(`${obj.cidade || ''}${obj.cidade && obj.estado ? ' - ' : ''}${obj.estado || ''}`);
    return parts.filter(Boolean).join(' - ');
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Image src={logo1Path} style={pdfStyles.logo} />
          <View>
            <Text style={pdfStyles.title}>COMUNICAÇÃO DE</Text>
            <Text style={[pdfStyles.title, { color: '#F47B20' }]}>REAJUSTE DE ALUGUEL</Text>
          </View>
        </View>

        <View style={{ textAlign: 'right', marginBottom: 10 }}>
          <Text>São Paulo, {format(dataRef, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.bold}>À atenção do(a) Locatário(a):</Text>
          <Text style={{ fontSize: 11 }}>{alerta.inquilino?.nome || 'Inquilino'}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.text}>
            Eu, <Text style={pdfStyles.bold}>{alerta.proprietario?.nome}</Text>, inscrito no CPF/CNPJ sob o nº <Text style={pdfStyles.bold}>{alerta.proprietario?.documento || '---'}</Text>, com endereço na {formatAddress(alerta.proprietario)}, por seu representante legal <Text style={pdfStyles.bold}>MORADA URBANA CONSULTORIA DE IMÓVEIS SLU LTDA</Text>, inscrita no CNPJ/ME 52.098.528/0001-49, venho por meio desta lhe <Text style={pdfStyles.bold}>NOTIFICAR</Text> que conforme dispõe o Contrato de Locação firmado em <Text style={pdfStyles.bold}>{alerta.dataInicioContrato ? format(parseISO(alerta.dataInicioContrato), 'dd/MM/yyyy') : '---'}</Text>, referente ao imóvel localizado no endereço <Text style={pdfStyles.bold}>{alerta.imovelEndereco}</Text>, a partir da competência <Text style={pdfStyles.bold}>{mesUsoDesc}</Text> o valor do aluguel mensal passará a ser de <Text style={pdfStyles.bold}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(novoValor)} ({valorExtensoNovo})</Text>.
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.text}>
            O índice aplicado no reajuste foi o <Text style={pdfStyles.bold}>{alerta.indiceTipo}</Text>, conforme previsto em contrato e abaixo demonstrado:
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>MEMORIAL DE CÁLCULO</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Valor Anterior:</Text>
            <Text style={pdfStyles.value}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alerta.valorAtual || 0)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Período de Apuração:</Text>
            <Text style={pdfStyles.value}>{periodoCalculo}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Variação do Índice:</Text>
            <Text style={pdfStyles.value}>{valorPercentual.toFixed(2)}%</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Valor da Correção:</Text>
            <Text style={pdfStyles.value}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(novoValor - (alerta.valorAtual || 0))} ({valorExtensoCorr})</Text>
          </View>
        </View>

        <View style={pdfStyles.highlight}>
          <Text>NOVO VALOR DO ALUGUEL: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(novoValor)}</Text>
        </View>

        <View style={[pdfStyles.section, { marginTop: 8 }]}>
          <Text style={pdfStyles.text}>
            O novo valor será aplicado ao aluguel referente ao mês de uso de <Text style={pdfStyles.bold}>{mesUsoDesc}</Text>, com o primeiro pagamento reajustado ocorrendo no boleto com vencimento em <Text style={pdfStyles.bold}>{mesPagamentoDesc}</Text>.
          </Text>
          <Text style={pdfStyles.text}>
            Permanecemos à disposição para quaisquer esclarecimentos através de nossos canais de atendimento.
          </Text>
        </View>

        <View style={pdfStyles.signature}>
          <View style={pdfStyles.signatureLine}>
            <Text>Morada Urbana Consultoria Imobiliária</Text>
            <Text style={{ fontSize: 7 }}>Administradora do Imóvel</Text>
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <Text>Morada Urbana Consultoria Imobiliária - CNPJ: 52.098.528/0001-49</Text>
          <Text>Rua General Alencastro Guimarães, 253 – São Paulo – SP | www.moradaurbana.com.br</Text>
        </View>
      </Page>
    </Document>
  );
};

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
  indiceReajuste: 'IGP-M' | 'IPCA' | 'INPC' | 'Outro';
  lastAdjustmentDate?: string;
  valorAnteriorReajuste?: number;
}

interface Imovel {
  id: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface Pessoa {
  id: string;
  nome: string;
  documento?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
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
  valorAtual?: number;
  indiceTipo?: string;
  dataInicioContrato?: string;
  dataTerminoContrato?: string;
  proprietario?: Pessoa;
  inquilino?: Pessoa;
  ultimoAjusteData?: string;
  ultimoAjusteIndice?: number;
}

export default function Alertas() {
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<ItemAlerta[]>([]);
  const [concluidos, setConcluidos] = useState<ItemAlerta[]>([]);
  const [resumo, setResumo] = useState({ reajustes: 0, vencimentos: 0 });
  
  // Estados para o Modal de Reajuste
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState<ItemAlerta | null>(null);
  const [indexValue, setIndexValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newValue, setNewValue] = useState<number>(0);
  const [successAdjustment, setSuccessAdjustment] = useState(false);

  useEffect(() => {
    fetchAlertas();
  }, []);

  const openAdjustmentModal = async (alerta: ItemAlerta) => {
    setSelectedAlerta(alerta);
    setIsAdjustmentModalOpen(true);
    setSuccessAdjustment(false);
    
    // Iniciar com busca do índice
    try {
      let valor = 0;
      if (alerta.indiceTipo === 'IPCA') {
        valor = await IndicesService.getUltimoIPCA12Meses();
      } else if (alerta.indiceTipo === 'IGP-M') {
        valor = await IndicesService.getUltimoIGPM12Meses();
      } else {
        valor = 4.5; // Default para 'Outro'
      }
      setIndexValue(valor);
      
      const calculo = (alerta.valorAtual || 0) * (1 + valor / 100);
      setNewValue(calculo);
    } catch (e) {
      setIndexValue(0);
    }
  };

  const handleIndexChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setIndexValue(num);
    const calculo = (selectedAlerta?.valorAtual || 0) * (1 + num / 100);
    setNewValue(calculo);
  };

  const approveAdjustment = async () => {
    if (!selectedAlerta) return;
    try {
      setIsProcessing(true);
      const contratoRef = doc(db, 'contratos', selectedAlerta.contratoId);
      
      // Salvar valor atual como anterior para permitir estorno
      await updateDoc(contratoRef, {
        valorAluguel: newValue,
        valorAnteriorReajuste: selectedAlerta.valorAtual || 0,
        lastAdjustmentDate: new Date().toISOString(),
        lastAdjustmentIndex: indexValue
      });
      
      setIsAdjustmentModalOpen(false);
      setSuccessAdjustment(true); // Mostrar sucesso e opção de PDF
      fetchAlertas(); // Recarregar
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contratos/${selectedAlerta.contratoId}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
      const concluidosTemp: ItemAlerta[] = [];
      let countReajuste = 0;
      let countVencimento = 0;

      contratosSnap.forEach(docSnap => {
        const contrato = { id: docSnap.id, ...docSnap.data() } as Contrato & { lastAdjustmentDate?: string, lastAdjustmentIndex?: number };
        const imovel = imoveis.find(i => i.id === contrato.imovelId);
        const proprietario = proprietarios.find(p => p.id === contrato.proprietarioId);
        const inquilino = inquilinos.find(i => i.id === contrato.inquilinoId);

        // ... existing Vencimento logic ...
        const dataTermino = parseISO(contrato.dataTermino);
        const diasTermino = differenceInDays(dataTermino, hoje);

        if (diasTermino <= 40 && diasTermino >= -30) {
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

        // 2. Verificar Reajuste Anual
        const dataInicio = parseISO(contrato.dataInicio);
        let proximoAniversario = setYear(dataInicio, getYear(hoje));
        
        if (isBefore(proximoAniversario, hoje) && differenceInDays(hoje, proximoAniversario) > 30) {
          proximoAniversario = addYears(proximoAniversario, 1);
        }

        const diasReajuste = differenceInDays(proximoAniversario, hoje);

        let jaAjustado = false;
        if (contrato.lastAdjustmentDate) {
          const ultimaData = parseISO(contrato.lastAdjustmentDate);
          if (getYear(ultimaData) === getYear(proximoAniversario) || isAfter(ultimaData, subMonths(proximoAniversario, 1))) {
            jaAjustado = true;
          }
        }

        const mesesDesdeInicio = Math.floor(differenceInDays(hoje, dataInicio) / 30);

        const alertaObj: ItemAlerta = {
          contratoId: contrato.id,
          contratoCodigo: contrato.codigo,
          tipo: 'Reajuste',
          dataAlerta: proximoAniversario,
          diasRestantes: diasReajuste,
          nivel: diasReajuste <= 15 ? 'urgente' : 'atencao',
          pessoaInteresse: proprietario?.nome || 'Proprietário',
          imovelEndereco: imovel?.endereco || 'Endereço não encontrado',
          detalhe: diasReajuste < 0 ? `Atrasado ${Math.abs(diasReajuste)} dias` : `Em ${diasReajuste} dias`,
          valorAtual: contrato.valorAluguel,
          indiceTipo: contrato.indiceReajuste,
          dataInicioContrato: contrato.dataInicio,
          dataTerminoContrato: contrato.dataTermino,
          proprietario,
          inquilino,
          // Adicionar info de conclusão
          ultimoAjusteData: contrato.lastAdjustmentDate,
          ultimoAjusteIndice: contrato.lastAdjustmentIndex
        };

        if (jaAjustado) {
          concluidosTemp.push(alertaObj);
        } else if (mesesDesdeInicio >= 11 && diasReajuste <= 40 && diasReajuste >= -30) {
          countReajuste++;
          novosAlertas.push(alertaObj);
        }
      });

      novosAlertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
      concluidosTemp.sort((a, b) => (b.ultimoAjusteData ? parseISO(b.ultimoAjusteData).getTime() : 0) - (a.ultimoAjusteData ? parseISO(a.ultimoAjusteData).getTime() : 0));

      setAlertas(novosAlertas);
      setConcluidos(concluidosTemp);
      setResumo({ reajustes: countReajuste, vencimentos: countVencimento });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'alertas_gestao');
    } finally {
      setLoading(false);
    }
  };

  const resetAdjustment = async (contratoId: string) => {
    try {
      setIsProcessing(true);
      const contratoRef = doc(db, 'contratos', contratoId);
      const contratoSnap = await getDoc(contratoRef);
      
      const updateData: any = {
        lastAdjustmentDate: deleteField(),
        lastAdjustmentIndex: deleteField()
      };

      // Se houver valor anterior registrado, restaurar
      if (contratoSnap.exists()) {
        const data = contratoSnap.data();
        if (data.valorAnteriorReajuste !== undefined) {
          updateData.valorAluguel = data.valorAnteriorReajuste;
          updateData.valorAnteriorReajuste = deleteField();
        }
      }

      await updateDoc(contratoRef, updateData);
      fetchAlertas();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contratos/${contratoId}`);
    } finally {
      setIsProcessing(false);
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

      {/* Alerta de Sucesso com Botão de PDF */}
      {successAdjustment && selectedAlerta && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 text-green-700">
            <div className="p-3 bg-green-100 rounded-full">
              <Check size={24} />
            </div>
            <div>
              <h3 className="font-bold">Reajuste processado com sucesso!</h3>
              <p className="text-sm opacity-90">O contrato <strong>{selectedAlerta.contratoCodigo}</strong> foi atualizado para o valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newValue)}</strong>.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <PDFDownloadLink 
              document={<CartaReajustePDF alerta={selectedAlerta} valorPercentual={indexValue} novoValor={newValue} />} 
              fileName={`Carta_Reajuste_${selectedAlerta.contratoCodigo}.pdf`}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg"
            >
              {({ loading }) => (
                <>
                  <Download size={18} />
                  {loading ? 'Gerando...' : 'Baixar Comunicado (PDF)'}
                </>
              )}
            </PDFDownloadLink>
            <button 
              onClick={() => setSuccessAdjustment(false)}
              className="px-4 py-3 text-green-700 font-bold hover:bg-green-100 rounded-2xl transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

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
                  <AlertaCard alerta={alerta} onProcess={() => openAdjustmentModal(alerta)} />
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

      {/* Histórico de Reajustes Concluídos */}
      {concluidos.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-100 text-green-600 rounded-md">
              <CheckCircle size={20} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Reajustes Concluídos (Recentes)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concluidos.map((alerta, idx) => (
              <div key={`concluido-${idx}`} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono text-gray-400 font-bold">{alerta.contratoCodigo}</span>
                    <span className="text-[10px] bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full uppercase">Concluído</span>
                  </div>
                  <h4 className="font-bold text-[#1E2732] line-clamp-1 mb-1">{alerta.imovelEndereco}</h4>
                  <p className="text-xs text-gray-500 mb-4">Ajustado em: {alerta.ultimoAjusteData ? format(parseISO(alerta.ultimoAjusteData), 'dd/MM/yyyy') : '-'}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <PDFDownloadLink 
                    document={<CartaReajustePDF alerta={alerta} valorPercentual={alerta.ultimoAjusteIndice || 0} novoValor={alerta.valorAtual || 0} />} 
                    fileName={`Carta_Reajuste_${alerta.contratoCodigo}.pdf`}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Download size={14} />
                    PDF
                  </PDFDownloadLink>
                  <button 
                    onClick={() => resetAdjustment(alerta.contratoId)}
                    title="Estornar reajuste (para testes)"
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Clock size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Processamento de Reajuste */}
      {isAdjustmentModalOpen && selectedAlerta && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Calculator size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#1E2732]">Aplicar Reajuste Anual</h2>
              </div>
              <button 
                onClick={() => setIsAdjustmentModalOpen(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Dados Informados</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Data Inicial</p>
                    <p className="font-bold text-[#1E2732]">
                      {selectedAlerta.dataInicioContrato ? format(parseISO(selectedAlerta.dataInicioContrato), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Data Final (Contrato)</p>
                    <p className="font-bold text-[#1E2732]">
                      {selectedAlerta.dataTerminoContrato ? format(parseISO(selectedAlerta.dataTerminoContrato), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Valor Nominal (Atual)</p>
                    <p className="text-xl font-black text-[#1E2732]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAlerta.valorAtual || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Índice</p>
                    <p className="font-bold text-[#F47B20]">{selectedAlerta.indiceTipo}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Informações do Reajuste</h3>
                
                <div className="bg-[#1E2732] p-5 rounded-3xl text-white shadow-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Período utilizado para o cálculo</p>
                      <p className="font-bold text-lg">
                        {(() => {
                          const alvo = selectedAlerta.dataAlerta;
                          const inicio = subMonths(alvo, 12);
                          const fim = subMonths(alvo, 1);
                          return `${format(inicio, "MMMM/yyyy", { locale: ptBR })} a ${format(fim, "MMMM/yyyy", { locale: ptBR })}`;
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Índice de correção no período</p>
                      <p className="font-bold text-lg text-[#F47B20]">{selectedAlerta.indiceTipo}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Valor percentual correspondente (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        value={indexValue}
                        onChange={(e) => handleIndexChange(e.target.value)}
                        className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl focus:border-[#F47B20] outline-none font-black text-xl text-[#F47B20] transition-colors pl-4"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-orange-300">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Acréscimo calculado (em R$)</label>
                    <div className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-xl text-gray-500">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newValue - (selectedAlerta.valorAtual || 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2">Resumo do Novo Valor</h3>
                
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100 flex items-center justify-between shadow-inner">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-green-600">Valor Corrigido na Data Final</p>
                    <p className="text-3xl font-black text-green-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg">
                    <Check size={24} />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAdjustmentModalOpen(false)} 
                  className="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Descartar
                </button>
                <button 
                  type="button" 
                  disabled={isProcessing || indexValue === 0}
                  onClick={approveAdjustment}
                  className="flex-[2] px-4 py-4 bg-[#1E2732] text-white rounded-2xl hover:bg-[#F47B20] font-bold shadow-lg shadow-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Gravando...' : 'Aprovar e Atualizar Contrato'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertaCard({ alerta, onProcess }: { alerta: ItemAlerta, onProcess?: () => void }) {
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
        {alerta.tipo === 'Reajuste' ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onProcess?.();
            }}
            className="px-3 py-1.5 bg-[#F47B20] text-white rounded-lg font-bold hover:bg-[#d96a1b] transition-colors"
          >
            Processar Reajuste
          </button>
        ) : (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-[#F47B20]">Iniciar Tratativa &rarr;</span>
        )}
      </div>
    </div>
  );
}

