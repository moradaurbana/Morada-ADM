import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FileText, Download, Search } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { LOGOS } from '../constants/images';

const logo1Path = LOGOS.logo1;

// Estilos do PDF
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#334155', backgroundColor: '#ffffff' },
  coverPage: { padding: 0, backgroundColor: '#1E2732', position: 'relative' },
  coverImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, objectFit: 'cover' },
  coverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0a1118', opacity: 0.6 },
  coverContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 50 },
  coverHeader: { marginTop: 20 },
  coverHeaderLine: { width: 30, height: 2, backgroundColor: '#F47B20', marginBottom: 10 },
  coverBrand: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  coverSubBrand: { color: '#aaa', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  coverMainText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 5, lineHeight: 1.1 },
  coverDocRef: { color: '#F47B20', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  coverFooter: { position: 'absolute', bottom: 50, left: 50, right: 50, textAlign: 'center', color: '#999', fontSize: 8, borderTop: '1px solid #333', paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 15, marginBottom: 25 },
  logo: { width: 80, height: 'auto', opacity: 0.9 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E2732', letterSpacing: 1 },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#F47B20', borderBottom: '1px solid #f1f5f9', paddingBottom: 4, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', borderBottom: '1px solid #f8fafc', paddingVertical: 8 },
  col1: { width: '25%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '25%', textAlign: 'right' },
  bold: { fontWeight: 'bold', color: '#1e293b' },
  text: { fontSize: 10, color: '#475569', lineHeight: 1.5 },
  totalRow: { flexDirection: 'row', borderTop: '1px solid #cbd5e1', paddingVertical: 10, marginTop: 10, backgroundColor: '#f8fafc' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 8, borderTop: '1px solid #f1f5f9', paddingTop: 15 }
});

const CapaPDF = ({ titulo, ano }: any) => (
  <Page size="A4" style={styles.coverPage}>
    <Image src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" style={styles.coverImage} />
    <View style={styles.coverOverlay} />
    <View style={styles.coverContent}>
      <View style={styles.coverHeader}>
        <View style={styles.coverHeaderLine} />
        <Text style={styles.coverBrand}>MORADA URBANA</Text>
        <Text style={styles.coverSubBrand}>CONSULTORIA IMOBILIÁRIA</Text>
      </View>

      <View style={{ marginTop: 120 }}>
        <Text style={styles.coverDocRef}>DOCUMENTO DE REFERÊNCIA</Text>
        <Text style={styles.coverMainText}>{titulo}</Text>
        <Text style={[styles.coverMainText, { color: '#F47B20' }]}>IMPOSTO DE RENDA</Text>
      </View>
    </View>
    <View style={styles.coverFooter}>
      <Text>Este documento é gerado automaticamente e contém informações confidenciais.</Text>
    </View>
  </Page>
);

// Componente do PDF para Informe IR Proprietário
export const InformeIRProprietarioPDF = ({ proprietario, inquilino, imovel, ano, repasses }: any) => {
  const repassesProcessados = repasses.map((r: any) => ({
    ...r,
    rendimentoBruto: r.valorLiquido + r.taxaAdministracao
  }));

  const totalBruto = repassesProcessados.reduce((acc: number, r: any) => acc + r.rendimentoBruto, 0);
  const totalTaxas = repassesProcessados.reduce((acc: number, r: any) => acc + r.taxaAdministracao, 0);
  const totalLiquido = repassesProcessados.reduce((acc: number, r: any) => acc + r.valorLiquido, 0);

  const formatAddress = (im: any) => {
    if (!im) return 'N/A';
    const parts = [];
    if (im.endereco) parts.push(`${im.endereco}${im.numero ? `, ${im.numero}` : ''}`);
    if (im.complemento) parts.push(im.complemento);
    if (im.bairro) parts.push(im.bairro);
    if (im.cidade || im.estado) parts.push(`${im.cidade || ''}${im.cidade && im.estado ? ' - ' : ''}${im.estado || ''}`);
    if (im.cep) parts.push(`CEP: ${im.cep}`);
    return parts.filter(Boolean).join(' - ');
  };

  return (
    <Document>
      <CapaPDF titulo="INFORME DE RENDIMENTOS" ano={ano} />
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INFORME DE RENDIMENTOS</Text>
            <Text style={styles.subtitle}>Ano-Calendário: {ano}</Text>
          </View>
          <View>
            <Image src={logo1Path} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICAÇÃO</Text>
          <Text style={styles.bold}>Fonte Pagadora (Inquilino):</Text>
          <Text style={styles.text}>Nome: {inquilino?.nome || 'N/A'}</Text>
          <Text style={styles.text}>CPF/CNPJ: {inquilino?.documento || 'N/A'}</Text>
          
          <Text style={[styles.bold, { marginTop: 10 }]}>Beneficiário (Proprietário):</Text>
          <Text style={styles.text}>Nome: {proprietario.nome}</Text>
          <Text style={styles.text}>CPF/CNPJ: {proprietario.documento}</Text>

          <Text style={[styles.bold, { marginTop: 10 }]}>Imóvel Objeto da Locação:</Text>
          <Text style={styles.text}>{formatAddress(imovel)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. NATUREZA DO RENDIMENTO</Text>
          <Text style={styles.text}>Rendimentos de aluguéis de bens imóveis.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. RESUMO FINANCEIRO ANUAL</Text>
          <View style={styles.row}>
            <Text style={[styles.text, { width: '70%' }]}>Total de Rendimentos Tributáveis</Text>
            <Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>R$ {totalBruto.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.text, { width: '70%' }]}>(-) Taxa de Administração</Text>
            <Text style={[styles.text, { width: '30%', textAlign: 'right', color: '#ef4444' }]}>- R$ {totalTaxas.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.bold, { width: '70%' }]}>Rendimento Líquido</Text>
            <Text style={[styles.bold, { width: '30%', textAlign: 'right' }]}>R$ {totalLiquido.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. DETALHAMENTO MENSAL</Text>
          <View style={[styles.row, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.col1, styles.bold]}>Mês</Text>
            <Text style={[styles.col2, styles.bold]}>Rendimento Bruto</Text>
            <Text style={[styles.col3, styles.bold]}>Descontos</Text>
            <Text style={[styles.col4, styles.bold]}>Valor Líquido</Text>
          </View>
          {repassesProcessados.map((r: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.col1, styles.text]}>{r.mesReferencia.split('/')[0]}</Text>
              <Text style={[styles.col2, styles.text]}>R$ {r.rendimentoBruto.toFixed(2)}</Text>
              <Text style={[styles.col3, styles.text]}>R$ {r.taxaAdministracao.toFixed(2)}</Text>
              <Text style={[styles.col4, styles.text]}>R$ {r.valorLiquido.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. DADOS DA IMOBILIÁRIA</Text>
          <Text style={styles.text}>Morada Urbana Consultoria Imobiliária</Text>
          <Text style={styles.text}>CNPJ: 52.098.528/0001-49</Text>
          <Text style={styles.text}>Rua General Alencastro Guimarães, 253 CEP: 05101-050 – São Paulo – SP</Text>
          <Text style={styles.text}>www.moradaurbana.com.br</Text>
        </View>
      </Page>
    </Document>
  );
};

// Componente do PDF para Informe IR Inquilino
export const InformeIRInquilinoPDF = ({ inquilino, proprietario, imovel, ano, cobrancas }: any) => {
  const totalAluguel = cobrancas.reduce((acc: number, c: any) => acc + c.valorAluguel, 0);
  const totalCondominio = cobrancas.reduce((acc: number, c: any) => acc + (c.valorCondominio || 0), 0);
  const totalIptu = cobrancas.reduce((acc: number, c: any) => acc + (c.valorIptu || 0), 0);
  const totalOutros = cobrancas.reduce((acc: number, c: any) => acc + (c.taxasExtras || 0), 0);
  const totalEncargos = totalCondominio + totalIptu + totalOutros;

  const formatAddress = (im: any) => {
    if (!im) return 'N/A';
    const parts = [];
    if (im.endereco) parts.push(`${im.endereco}${im.numero ? `, ${im.numero}` : ''}`);
    if (im.complemento) parts.push(im.complemento);
    if (im.bairro) parts.push(im.bairro);
    if (im.cidade || im.estado) parts.push(`${im.cidade || ''}${im.cidade && im.estado ? ' - ' : ''}${im.estado || ''}`);
    if (im.cep) parts.push(`CEP: ${im.cep}`);
    return parts.filter(Boolean).join(' - ');
  };

  return (
    <Document>
      <CapaPDF titulo="INFORME DE PAGAMENTOS" ano={ano} />
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INFORME DE PAGAMENTOS</Text>
            <Text style={styles.subtitle}>Ano-Calendário: {ano}</Text>
          </View>
          <View>
            <Image src={logo1Path} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICAÇÃO</Text>
          <Text style={styles.bold}>Fonte Pagadora (Inquilino):</Text>
          <Text style={styles.text}>Nome: {inquilino.nome}</Text>
          <Text style={styles.text}>CPF/CNPJ: {inquilino.documento}</Text>
          
          <Text style={[styles.bold, { marginTop: 10 }]}>Beneficiário (Proprietário):</Text>
          <Text style={styles.text}>Nome: {proprietario?.nome || 'N/A'}</Text>
          <Text style={styles.text}>CPF/CNPJ: {proprietario?.documento || 'N/A'}</Text>

          <Text style={[styles.bold, { marginTop: 10 }]}>Imóvel Objeto da Locação:</Text>
          <Text style={styles.text}>{formatAddress(imovel)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. NATUREZA DO PAGAMENTO</Text>
          <Text style={styles.text}>Pagamento de aluguéis e encargos de bens imóveis.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. RESUMO DE PAGAMENTOS</Text>
          <View style={styles.row}>
            <Text style={[styles.bold, { width: '70%' }]}>Rendimentos Tributáveis (Aluguel)</Text>
            <Text style={[styles.bold, { width: '30%', textAlign: 'right' }]}>R$ {totalAluguel.toFixed(2)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={[styles.bold, { width: '100%' }]}>Valores Pagos a Terceiros (Informativo)</Text>
          </View>
          <View style={styles.row}><Text style={[styles.text, { width: '70%' }]}>Condomínio</Text><Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>R$ {totalCondominio.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={[styles.text, { width: '70%' }]}>IPTU</Text><Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>R$ {totalIptu.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={[styles.text, { width: '70%' }]}>Outros Encargos</Text><Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>R$ {totalOutros.toFixed(2)}</Text></View>
          <View style={styles.totalRow}>
            <Text style={[styles.bold, { width: '70%' }]}>Total de Encargos</Text>
            <Text style={[styles.bold, { width: '30%', textAlign: 'right' }]}>R$ {totalEncargos.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. DETALHAMENTO MENSAL</Text>
          <View style={[styles.row, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.col1, styles.bold]}>Mês</Text>
            <Text style={[styles.col2, styles.bold]}>Aluguel</Text>
            <Text style={[styles.col3, styles.bold]}>Encargos</Text>
            <Text style={[styles.col4, styles.bold]}>Total Mensal</Text>
          </View>
          {cobrancas.map((c: any, i: number) => {
            const encargosMensal = (c.valorCondominio || 0) + (c.valorIptu || 0) + (c.taxasExtras || 0);
            const totalMensal = c.valorAluguel + encargosMensal;
            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.col1, styles.text]}>{c.mesReferencia.split('/')[0]}</Text>
                <Text style={[styles.col2, styles.text]}>R$ {c.valorAluguel.toFixed(2)}</Text>
                <Text style={[styles.col3, styles.text]}>R$ {encargosMensal.toFixed(2)}</Text>
                <Text style={[styles.col4, styles.text]}>R$ {totalMensal.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. DADOS DA IMOBILIÁRIA</Text>
          <Text style={styles.text}>Morada Urbana Consultoria Imobiliária</Text>
          <Text style={styles.text}>CNPJ: 52.098.528/0001-49</Text>
          <Text style={styles.text}>Rua General Alencastro Guimarães, 253 CEP: 05101-050 – São Paulo – SP</Text>
          <Text style={styles.text}>www.moradaurbana.com.br</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function Relatorios() {
  const [anoBase, setAnoBase] = useState(new Date().getFullYear() - 1);
  const [tipo, setTipo] = useState<'proprietario' | 'inquilino' | 'dimob'>('proprietario');
  const [loading, setLoading] = useState(false);
  
  const [proprietarios, setProprietarios] = useState<any[]>([]);
  const [inquilinos, setInquilinos] = useState<any[]>([]);
  const [repasses, setRepasses] = useState<any[][]>([]);
  const [cobrancas, setCobrancas] = useState<any[][]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [activePessoaId, setActivePessoaId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroCampo, setFiltroCampo] = useState<'todos' | 'nome' | 'documento' | 'contrato' | 'endereco'>('todos');

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    try {
      const [pSnap, iSnap, cSnap, imSnap] = await Promise.all([
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'inquilinos')),
        getDocs(collection(db, 'contratos')),
        getDocs(collection(db, 'imoveis'))
      ]);

      const allProps = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allInqs = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allContratos = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allImoveis = imSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Identificar IDs de proprietários e inquilinos PRINCIPAIS
      const primaryPropIds = new Set([
        ...allImoveis.map((im: any) => im.proprietarioId),
        ...allContratos.map((c: any) => c.proprietarioId)
      ]);
      const primaryInqIds = new Set(allContratos.map((c: any) => c.inquilinoId));

      const filteredProps = allProps.filter((p: any) => primaryPropIds.has(p.id));
      const filteredInqs = allInqs.filter((i: any) => primaryInqIds.has(i.id));

      // Ordenar por nome (alfabética)
      filteredProps.sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
      filteredInqs.sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

      setProprietarios(filteredProps);
      setInquilinos(filteredInqs);
      setContratos(allContratos);
      setImoveis(allImoveis);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'relatorios_base');
    }
  };

  const gerarRelatorio = async (pessoaId: string) => {
    try {
      setLoading(true);
      setActivePessoaId(pessoaId);
      if (tipo === 'proprietario') {
        const q = query(
          collection(db, 'repasses'),
          where('proprietarioId', '==', pessoaId),
          where('status', '==', 'Pago')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        
        const filtrado = data.filter(r => r.mesReferencia.endsWith(anoBase.toString()));
        
        // Agrupar por contrato
        const agrupado: Record<string, any[]> = {};
        filtrado.forEach(r => {
          if (!agrupado[r.contratoId]) agrupado[r.contratoId] = [];
          agrupado[r.contratoId].push(r);
        });

        // Ordenar cada grupo por mês
        Object.values(agrupado).forEach(grupo => {
          grupo.sort((a, b) => {
            const [mA] = a.mesReferencia.split('/');
            const [mB] = b.mesReferencia.split('/');
            return Number(mA) - Number(mB);
          });
        });

        setRepasses(Object.values(agrupado));
      } else if (tipo === 'inquilino') {
        const q = query(
          collection(db, 'cobrancas'),
          where('inquilinoId', '==', pessoaId),
          where('status', '==', 'Pago')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        
        const filtrado = data.filter(c => c.mesReferencia.endsWith(anoBase.toString()));
        
        // Agrupar por contrato
        const agrupado: Record<string, any[]> = {};
        filtrado.forEach(c => {
          if (!agrupado[c.contratoId]) agrupado[c.contratoId] = [];
          agrupado[c.contratoId].push(c);
        });

        // Ordenar cada grupo por mês
        Object.values(agrupado).forEach(grupo => {
          grupo.sort((a, b) => {
            const [mA] = a.mesReferencia.split('/');
            const [mB] = b.mesReferencia.split('/');
            return Number(mA) - Number(mB);
          });
        });

        setCobrancas(Object.values(agrupado));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'relatorios_gerar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2732]">Relatórios</h1>
        <p className="text-gray-500">Geração de informes de rendimentos e DIMOB</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ano Base</label>
            <input 
              type="number" 
              value={anoBase} 
              onChange={(e) => setAnoBase(Number(e.target.value))}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tipo de Relatório</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as any)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
            >
              <option value="proprietario">Para Proprietário (Locador)</option>
              <option value="inquilino">Para Inquilino (Locatário)</option>
              <option value="dimob">DIMOB (Imobiliária)</option>
            </select>
          </div>
        </div>

        {tipo !== 'dimob' && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#1E2732]">
                  Selecione o {tipo === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                </h3>
                <p className="text-xs text-gray-400">Clique em "Visualizar Dados" para carregar os informes por contrato.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative w-full sm:w-48">
                  <select
                    value={filtroCampo}
                    onChange={(e) => setFiltroCampo(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-xs bg-gray-50 uppercase font-bold text-gray-600"
                  >
                    <option value="todos">Buscar em Tudo</option>
                    <option value="nome">Nome</option>
                    <option value="documento">CPF/CNPJ</option>
                    <option value="contrato">Cód. Contrato</option>
                    <option value="endereco">Endereço</option>
                  </select>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={`Pesquisar ${filtroCampo === 'todos' ? 'por dados...' : filtroCampo}...`}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm shadow-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tipo === 'proprietario' ? proprietarios : inquilinos)
                .filter(pessoa => {
                  const termo = busca.toLowerCase();
                  if (!termo) return true;

                  const pessoaContratos = contratos.filter(c => 
                    tipo === 'proprietario' ? c.proprietarioId === pessoa.id : c.inquilinoId === pessoa.id
                  );
                  const pessoaImoveis = imoveis.filter(im => 
                    pessoaContratos.some(c => c.imovelId === im.id)
                  );

                  const matchNome = pessoa.nome.toLowerCase().includes(termo);
                  const matchDoc = pessoa.documento.toLowerCase().includes(termo);
                  const matchContrato = pessoaContratos.some(c => c.codigo.toLowerCase().includes(termo));
                  const matchEndereco = pessoaImoveis.some(im => 
                    im.endereco.toLowerCase().includes(termo) || 
                    im.codigo.toLowerCase().includes(termo)
                  );

                  if (filtroCampo === 'nome') return matchNome;
                  if (filtroCampo === 'documento') return matchDoc;
                  if (filtroCampo === 'contrato') return matchContrato;
                  if (filtroCampo === 'endereco') return matchEndereco;
                  return matchNome || matchDoc || matchContrato || matchEndereco;
                })
                .map(pessoa => {
                  const pessoaContratos = contratos.filter(c => 
                    tipo === 'proprietario' ? c.proprietarioId === pessoa.id : c.inquilinoId === pessoa.id
                  );
                  const totalContratos = pessoaContratos.length;

                  return (
                    <div key={pessoa.id} className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#F47B20]/30 transition-all flex flex-col group">
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-[#1E2732] group-hover:text-[#F47B20] transition-colors line-clamp-1">{pessoa.nome}</h4>
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            ID: {pessoa.id.slice(0, 4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{pessoa.documento}</span>
                          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-medium">
                            {totalContratos} {totalContratos === 1 ? 'Contrato' : 'Contratos'}
                          </span>
                        </div>

                        {/* Lista breve de imóveis vinculados */}
                        <div className="space-y-1.5 border-t border-gray-50 pt-3">
                          {pessoaContratos.slice(0, 2).map(c => {
                            const im = imoveis.find(i => i.id === c.imovelId);
                            return (
                              <div key={c.id} className="flex items-start gap-2 text-[10px] text-gray-400">
                                <FileText size={12} className="mt-0.5 shrink-0" />
                                <span className="truncate">
                                  <span className="font-medium text-gray-600">{c.codigo}:</span> {im?.endereco}, {im?.numero}
                                </span>
                              </div>
                            );
                          })}
                          {totalContratos > 2 && (
                            <p className="text-[10px] text-gray-400 italic pl-5">+ {totalContratos - 2} outros imóveis</p>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => gerarRelatorio(pessoa.id)}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-[#F47B20] hover:text-white transition-all text-sm font-bold border border-gray-100 hover:border-[#F47B20] shadow-sm active:scale-[0.98]"
                      >
                        Visualizar Dados
                      </button>

                      {activePessoaId === pessoa.id && (tipo === 'proprietario' ? repasses : cobrancas).map((grupo, idx) => {
                        const contrato = contratos.find(c => c.id === grupo[0].contratoId);
                        const imovel = imoveis.find(im => im.id === contrato?.imovelId);
                        const inquilino = inquilinos.find(i => i.id === contrato?.inquilinoId);
                        const proprietario = proprietarios.find(p => p.id === contrato?.proprietarioId);

                        return (
                          <PDFDownloadLink 
                            key={`${tipo}-${pessoa.id}-${idx}-${Date.now()}`}
                            document={tipo === 'proprietario' 
                              ? <InformeIRProprietarioPDF 
                                  proprietario={pessoa} 
                                  inquilino={inquilino}
                                  imovel={imovel}
                                  ano={anoBase} 
                                  repasses={grupo} 
                                />
                              : <InformeIRInquilinoPDF 
                                  inquilino={pessoa} 
                                  proprietario={proprietario}
                                  imovel={imovel}
                                  ano={anoBase} 
                                  cobrancas={grupo} 
                                />
                            }
                            fileName={`Informe_IR_${tipo === 'proprietario' ? 'Proprietario' : 'Inquilino'}_${anoBase}_${pessoa.nome.replace(/\s+/g, '_')}_${imovel?.codigo || idx}.pdf`}
                            className="mt-2 flex items-center justify-center gap-2 w-full bg-[#1E2732] text-white py-2 rounded-lg hover:bg-gray-800 transition-colors text-[10px] font-medium shadow-md shadow-gray-200"
                          >
                            {/* @ts-ignore */}
                            {({ loading }) => (loading ? 'Gerando...' : <><Download size={14} /> Baixar PDF ({imovel?.codigo || 'Contrato'})</>)}
                          </PDFDownloadLink>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tipo === 'dimob' && (
          <div className="border-t border-gray-100 pt-6 text-center">
            <h3 className="text-lg font-semibold text-[#1E2732] mb-4">DIMOB - {anoBase}</h3>
            <p className="text-gray-500 mb-6">A geração do arquivo DIMOB requer a consolidação de todos os contratos e repasses do ano.</p>
            <button 
              className="bg-[#F47B20] text-white px-6 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors font-medium"
              onClick={() => alert('Funcionalidade de geração DIMOB em desenvolvimento.')}
            >
              Gerar Arquivo DIMOB
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
