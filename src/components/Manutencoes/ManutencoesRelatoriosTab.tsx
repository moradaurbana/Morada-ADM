import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Download } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';
import { LOGOS } from '../../constants/images';

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
        <Text style={[styles.coverMainText, { color: '#F47B20' }]}>MANUTENÇÕES</Text>
      </View>
    </View>
    <View style={styles.coverFooter}>
      <Text>Este documento é gerado automaticamente e contém informações confidenciais.</Text>
    </View>
  </Page>
);

export const RelatorioManutencaoGeralPDF = ({ chamados, ano, titulo }: any) => {
  const chamadosFiltrados = chamados.filter((c: any) => 
    c.dataAbertura && c.dataAbertura.includes(ano.toString())
  );

  const totalCusto = chamadosFiltrados.reduce((acc: number, c: any) => {
    const custo = c.ordensServico?.reduce((sum: number, os: any) => sum + (Number(os.valorAprovado) || 0), 0) || 0;
    return acc + custo;
  }, 0);

  const porStatus = chamadosFiltrados.reduce((acc: any, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Document>
      <CapaPDF titulo={titulo} ano={ano} />
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{titulo}</Text>
            <Text style={styles.subtitle}>Ano: {ano}</Text>
          </View>
          <View>
            <Image src={logo1Path} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. RESUMO OPERACIONAL</Text>
          <View style={styles.row}>
            <Text style={[styles.text, { width: '70%' }]}>Total de Chamados no Período</Text>
            <Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>{chamadosFiltrados.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.text, { width: '70%' }]}>Custo Total de Manutenções</Text>
            <Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>R$ {totalCusto.toFixed(2)}</Text>
          </View>
          
          <Text style={[styles.bold, { marginTop: 15, marginBottom: 5 }]}>Por Status:</Text>
          {Object.entries(porStatus).map(([status, qtd]: any) => (
             <View key={status} style={styles.row}>
              <Text style={[styles.text, { width: '70%' }]}>{status}</Text>
              <Text style={[styles.text, { width: '30%', textAlign: 'right' }]}>{qtd}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. DETALHAMENTO DOS CHAMADOS</Text>
          <View style={[styles.row, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.col1, styles.bold, { width: '20%' }]}>Data</Text>
            <Text style={[styles.col2, styles.bold, { width: '40%' }]}>Categoria</Text>
            <Text style={[styles.col3, styles.bold, { width: '20%' }]}>Status</Text>
            <Text style={[styles.col4, styles.bold, { width: '20%' }]}>Custo (R$)</Text>
          </View>
          {chamadosFiltrados.map((c: any, i: number) => {
            const custo = c.ordensServico?.reduce((sum: number, os: any) => sum + (Number(os.valorAprovado) || 0), 0) || 0;
            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.col1, styles.text, { width: '20%' }]}>{c.dataAbertura?.split('T')[0]}</Text>
                <Text style={[styles.col2, styles.text, { width: '40%' }]}>{c.categoria} {c.subcategoria ? `- ${c.subcategoria}` : ''}</Text>
                <Text style={[styles.col3, styles.text, { width: '20%' }]}>{c.status}</Text>
                <Text style={[styles.col4, styles.text, { width: '20%' }]}>R$ {custo.toFixed(2)}</Text>
              </View>
            );
          })}
          {chamadosFiltrados.length === 0 && (
             <View style={styles.row}>
                <Text style={styles.text}>Nenhum chamado no período.</Text>
             </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>Gerado pelo Módulo de Manutenção</Text>
        </View>
      </Page>
    </Document>
  );
};

export const RelatorioPrestadoresPDF = ({ prestadores, chamados, ano, titulo }: any) => {
  return (
    <Document>
      <CapaPDF titulo={titulo} ano={ano} />
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{titulo}</Text>
            <Text style={styles.subtitle}>Ano base: {ano}</Text>
          </View>
          <View>
            <Image src={logo1Path} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. DESEMPENHO E AVALIAÇÃO DE PRESTADORES</Text>
          <View style={[styles.row, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.col1, styles.bold, { width: '40%' }]}>Prestador</Text>
            <Text style={[styles.col2, styles.bold, { width: '20%' }]}>Qtd C. Aprovados</Text>
            <Text style={[styles.col3, styles.bold, { width: '20%' }]}>Nota Média</Text>
            <Text style={[styles.col4, styles.bold, { width: '20%' }]}>Total Pago (R$)</Text>
          </View>
          
          {prestadores.map((p: any, i: number) => {
            // Conta quantas OS esse prestador realizou e o total pago (considerando os chamados fechados/OS atreladas)
            let totalPago = 0;
            let qtdOs = 0;
            
            chamados.forEach((c: any) => {
               if (c.dataAbertura && c.dataAbertura.includes(ano.toString())) {
                  c.ordensServico?.forEach((os: any) => {
                     if (os.prestadorId === p.id) {
                        totalPago += (Number(os.valorAprovado) || 0);
                        qtdOs++;
                     }
                  });
               }
            });

            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.col1, styles.text, { width: '40%' }]}>{p.nome}</Text>
                <Text style={[styles.col2, styles.text, { width: '20%' }]}>{qtdOs}</Text>
                <Text style={[styles.col3, styles.text, { width: '20%' }]}>{p.notaMedia || '0'}/5</Text>
                <Text style={[styles.col4, styles.text, { width: '20%' }]}>R$ {totalPago.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>Gerado pelo Módulo de Manutenção</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function ManutencoesRelatoriosTab() {
  const [anoBase, setAnoBase] = useState(new Date().getFullYear());
  const [tipo, setTipo] = useState<'manut_imovel' | 'manut_prop' | 'manut_geral' | 'prestadores'>('manut_geral');
  const [loading, setLoading] = useState(false);
  
  const [proprietarios, setProprietarios] = useState<any[]>([]);
  const [inquilinos, setInquilinos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [imoveis, setImoveis] = useState<any[]>([]);
  const [chamados, setChamados] = useState<any[]>([]);
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroCampo, setFiltroCampo] = useState<'todos' | 'nome' | 'documento' | 'contrato' | 'endereco'>('todos');

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [pSnap, iSnap, cSnap, imSnap, chSnap, prSnap] = await Promise.all([
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'inquilinos')),
        getDocs(collection(db, 'contratos')),
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'chamados_manutencao')),
        getDocs(collection(db, 'prestadores'))
      ]);

      const allProps = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allInqs = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allContratos = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allImoveis = imSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allChamados = chSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allPrestadores = prSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const primaryPropIds = new Set([
        ...allImoveis.map((im: any) => im.proprietarioId),
        ...allContratos.map((c: any) => c.proprietarioId)
      ]);
      const primaryInqIds = new Set(allContratos.map((c: any) => c.inquilinoId));

      const filteredProps = allProps.filter((p: any) => primaryPropIds.has(p.id));
      const filteredInqs = allInqs.filter((i: any) => primaryInqIds.has(i.id));

      filteredProps.sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
      filteredInqs.sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

      setProprietarios(filteredProps);
      setInquilinos(filteredInqs);
      setContratos(allContratos);
      setImoveis(allImoveis);
      setChamados(allChamados);
      setPrestadores(allPrestadores);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'relatorios_manutencao');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return <div className="p-8 text-center text-gray-500">Carregando dados para relatórios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onChange={(e) => {
                setTipo(e.target.value as any);
                setBusca('');
              }}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
            >
              <option value="manut_geral">Resumo Geral de Manutenções e Custos</option>
              <option value="manut_imovel">Manutenções por Imóvel</option>
              <option value="manut_prop">Manutenções por Proprietário</option>
              <option value="prestadores">Avaliação e Serviços de Prestadores</option>
            </select>
          </div>
        </div>

        {(tipo === 'manut_prop' || tipo === 'manut_imovel') && (
          <div className="border-t border-gray-100 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={`Pesquisar ${tipo === 'manut_prop' ? 'Proprietário' : 'Imóvel'}...`}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm shadow-sm bg-gray-50"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tipo === 'manut_imovel' ? (
                imoveis.filter(im => {
                  const termo = busca.toLowerCase();
                  if (!termo) return true;
                  return im.endereco.toLowerCase().includes(termo) || 
                         im.codigo?.toLowerCase().includes(termo) || 
                         im.condominio?.toLowerCase().includes(termo);
                }).map(imovel => {
                  const chamadosDoImovel = chamados.filter(c => c.imovelId === imovel.id);
                  return (
                    <div key={imovel.id} className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-between hover:border-[#F47B20]/30 transition-all">
                      <div>
                        <h4 className="font-bold text-[#1E2732] mb-1">{imovel.codigo ? `[${imovel.codigo}] ` : ''}{imovel.endereco}</h4>
                        <p className="text-xs text-gray-500 mb-4">{imovel.bairro} - {imovel.cidade}</p>
                        <div className="text-xs text-gray-400 font-medium bg-gray-50 p-2 rounded mb-4">
                          Total de Chamados Cadastrados: {chamadosDoImovel.length}
                        </div>
                      </div>
                      <PDFDownloadLink
                        document={<RelatorioManutencaoGeralPDF chamados={chamadosDoImovel} ano={anoBase} titulo={`MANUTENÇÕES: ${imovel.endereco.toUpperCase()}`} />}
                        fileName={`Relatorio_Manutencoes_Imovel_${anoBase}_${imovel.codigo || imovel.id.substring(0,6)}.pdf`}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-[#F47B20] text-white rounded-xl hover:bg-[#d96a1b] transition-all text-sm font-bold shadow-sm"
                      >
                        {/* @ts-ignore */}
                        {({ loading }) => (loading ? 'Gerando...' : <><Download size={16} /> Baixar Relatório</>)}
                      </PDFDownloadLink>
                    </div>
                  );
                })
              ) : (
                proprietarios.filter(pessoa => {
                  const termo = busca.toLowerCase();
                  if (!termo) return true;
                  return pessoa.nome.toLowerCase().includes(termo) || pessoa.documento.toLowerCase().includes(termo);
                }).map(pessoa => {
                  const pessoaContratos = contratos.filter(c => c.proprietarioId === pessoa.id);
                  const chamadosDoProprietario = chamados.filter(c => pessoaContratos.some(cont => cont.imovelId === c.imovelId));
                  return (
                    <div key={pessoa.id} className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#F47B20]/30 transition-all flex flex-col group">
                      <div className="mb-4">
                        <h4 className="font-bold text-[#1E2732] group-hover:text-[#F47B20] transition-colors line-clamp-1 mb-2">{pessoa.nome}</h4>
                        <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-xs text-gray-500">{pessoa.documento}</span>
                        <div className="mt-4 text-xs text-gray-400 font-medium bg-gray-50 p-2 rounded">
                          Total de Chamados: {chamadosDoProprietario.length}
                        </div>
                      </div>
                      
                      <PDFDownloadLink
                        document={<RelatorioManutencaoGeralPDF chamados={chamadosDoProprietario} ano={anoBase} titulo={`MANUTENÇÕES: ${pessoa.nome.toUpperCase()}`} />}
                        fileName={`Relatorio_Manutencoes_${anoBase}_${pessoa.nome.replace(/\\s+/g, '_')}.pdf`}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-[#F47B20] text-white rounded-xl hover:bg-[#d96a1b] transition-all text-sm font-bold shadow-sm"
                      >
                        {/* @ts-ignore */}
                        {({ loading }) => (loading ? 'Gerando...' : <><Download size={16} /> Baixar Relatório</>)}
                      </PDFDownloadLink>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tipo === 'manut_geral' && (
          <div className="border-t border-gray-100 pt-6 text-center">
            <h3 className="text-xl font-semibold text-[#1E2732] mb-2">Relatório Geral de Manutenções e Custos</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Gere um documento consolidado com todos os chamados e custos aprovados para o ano calendário selecionado.</p>
            <div className="flex justify-center">
               <PDFDownloadLink
                  document={<RelatorioManutencaoGeralPDF chamados={chamados} ano={anoBase} titulo="RESUMO GERAL DE MANUTENÇÕES E CUSTOS" />}
                  fileName={`Resumo_Geral_Manutencoes_${anoBase}.pdf`}
                  className="bg-[#1E2732] text-white px-8 py-4 rounded-xl hover:bg-[#F47B20] transition-colors font-bold shadow-lg flex items-center gap-3 active:scale-95"
               >
                  {/* @ts-ignore */}
                  {({ loading }) => (loading ? 'Processando PDF...' : <><Download size={20} /> Baixar Relatório Geral - {anoBase}</>)}
               </PDFDownloadLink>
            </div>
          </div>
        )}

        {tipo === 'prestadores' && (
          <div className="border-t border-gray-100 pt-6 text-center">
            <h3 className="text-xl font-semibold text-[#1E2732] mb-2">Avaliação e Serviços de Prestadores</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Gere um relatório completo contendo a lista de prestadores e os volumes de ordens de serviço pagas no ano.</p>
            <div className="flex justify-center">
               <PDFDownloadLink
                  document={<RelatorioPrestadoresPDF prestadores={prestadores} chamados={chamados} ano={anoBase} titulo="AVALIAÇÃO E DESEMPENHO DE PRESTADORES" />}
                  fileName={`Relatorio_Prestadores_${anoBase}.pdf`}
                  className="bg-[#1E2732] text-white px-8 py-4 rounded-xl hover:bg-[#F47B20] transition-colors font-bold shadow-lg flex items-center gap-3 active:scale-95"
               >
                  {/* @ts-ignore */}
                  {({ loading }) => (loading ? 'Processando PDF...' : <><Download size={20} /> Baixar Relatório de Prestadores - {anoBase}</>)}
               </PDFDownloadLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
