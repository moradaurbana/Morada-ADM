import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Chamado, Prestador } from '../../types/manutencao';
import { formatCurrency } from '../../lib/utils';
import { LOGOS } from '../../constants/images';

const logo1Path = LOGOS.logo1;

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 15, marginBottom: 20 },
  logo: { width: 100, height: 'auto' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1E2732', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#F47B20', backgroundColor: '#f8fafc', padding: 6, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 6 },
  colHalf: { width: '50%', paddingRight: 10 },
  colFull: { width: '100%' },
  label: { fontSize: 9, color: '#64748b', fontWeight: 'bold', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 10, color: '#1E2732' },
  box: { border: '1px solid #e2e8f0', padding: 10, borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #f1f5f9', padding: 6 },
  col1: { width: '15%' },
  col2: { width: '25%' },
  col3: { width: '40%' },
  col4: { width: '20%', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 8, borderTop: '1px solid #f1f5f9', paddingTop: 15 },
  timelineContainer: { borderLeft: '1px solid #cbd5e1', marginLeft: 10, paddingLeft: 15, marginTop: 5 },
  timelineItem: { position: 'relative', marginBottom: 15 },
  timelineDot: { position: 'absolute', left: -20, top: 2, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#F47B20', border: '2px solid #ffffff' },
  timelineContent: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 4, border: '1px solid #f1f5f9' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timelineAction: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  timelineDate: { fontSize: 8, color: '#64748b' },
  timelineObs: { fontSize: 9, color: '#475569', marginTop: 4 }
});

const CapaPDF = ({ chamado }: { chamado: Chamado }) => (
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
        <Text style={styles.coverMainText}>ENCERRAMENTO DE</Text>
        <Text style={[styles.coverMainText, { color: '#F47B20' }]}>MANUTENÇÃO</Text>
        <Text style={{ color: '#aaa', marginTop: 10, fontSize: 12 }}>Chamado N° {String(chamado.numero).padStart(4, '0')} - {chamado.categoria}</Text>
      </View>
    </View>
    <View style={styles.coverFooter}>
      <Text>Este documento é acompanhado de termo de conclusão de serviços.</Text>
    </View>
  </Page>
);

interface Props {
  chamado: Chamado;
  imovel: any;
  prestador?: Prestador;
  prestadores: Prestador[];
}

export const RelatorioEncerramentoPDF = ({ chamado, imovel, prestadores }: Props) => {
  const ordens = chamado.ordensServico || [];
  const custoTotal = ordens.reduce((acc, os) => acc + (os.valorAprovado || 0), 0);

  return (
    <Document>
      <CapaPDF chamado={chamado} />
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Relatório de Encerramento de Manutenção</Text>
            <Text style={styles.subtitle}>Chamado N° {String(chamado.numero).padStart(4, '0')}</Text>
          </View>
          <View>
            <Image src={logo1Path} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. DADOS DO IMÓVEL E SOLICITANTE</Text>
          <View style={styles.box}>
             <View style={styles.row}>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Endereço do Imóvel</Text>
                 <Text style={styles.value}>{imovel ? `${imovel.endereco}, ${imovel.numero} - ${imovel.bairro}` : 'Imóvel não encontrado'}</Text>
               </View>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Condomínio</Text>
                 <Text style={styles.value}>{imovel?.nomeCondominio || 'N/A'}</Text>
               </View>
             </View>
             <View style={styles.row}>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Solicitante ({chamado.solicitante.tipo})</Text>
                 <Text style={styles.value}>{chamado.solicitante.nome}</Text>
               </View>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Contato</Text>
                 <Text style={styles.value}>{chamado.solicitante.telefone} / {chamado.solicitante.email}</Text>
               </View>
             </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. DESCRIÇÃO DA OCORRÊNCIA</Text>
          <View style={styles.box}>
             <View style={styles.row}>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Data de Abertura</Text>
                 <Text style={styles.value}>{new Date(chamado.dataAbertura).toLocaleDateString()}</Text>
               </View>
               <View style={styles.colHalf}>
                 <Text style={styles.label}>Categoria / Subcategoria</Text>
                 <Text style={styles.value}>{chamado.categoria} {chamado.subcategoria ? `- ${chamado.subcategoria}` : ''}</Text>
               </View>
             </View>
             <View style={styles.row}>
               <View style={styles.colFull}>
                 <Text style={styles.label}>Problema Relatado</Text>
                 <Text style={styles.value}>{chamado.descricao}</Text>
               </View>
             </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. SERVIÇOS EXECUTADOS E CUSTOS</Text>
          <View style={styles.tableHeader}>
             <Text style={styles.col1}>Data/Hora</Text>
             <Text style={styles.col2}>Prestador</Text>
             <Text style={styles.col3}>Serviço Realizado (Escopo)</Text>
             <Text style={styles.col4}>Valor (R$)</Text>
          </View>
          {ordens.map((os, idx) => {
             const prestadorObj = prestadores.find(p => p.id === os.prestadorId);
             return (
               <View key={idx} style={styles.tableRow}>
                 <Text style={[styles.col1, { fontSize: 9 }]}>
                   {os.dataExecucao ? new Date(os.dataExecucao).toLocaleDateString() : (os.dataPrevista ? new Date(os.dataPrevista).toLocaleDateString() : 'N/D')}
                   {os.horarioAgendamento ? `\n${os.horarioAgendamento}` : ''}
                 </Text>
                 <Text style={[styles.col2, { fontSize: 9 }]}>{prestadorObj?.nome || 'Não definido'}</Text>
                 <Text style={[styles.col3, { fontSize: 9 }]}>{os.escopo || 'Sem descrição'}</Text>
                 <Text style={[styles.col4, { fontSize: 9 }]}>{formatCurrency(os.valorAprovado)}</Text>
               </View>
             );
          })}
          {ordens.length === 0 && (
             <View style={styles.tableRow}>
                <Text style={styles.colFull}>Nenhuma Ordem de Serviço vinculada a este chamado.</Text>
             </View>
          )}
          <View style={[styles.tableRow, { backgroundColor: '#f8fafc', fontWeight: 'bold' }]}>
             <Text style={[styles.col1, styles.col2, styles.col3, { width: '80%', textAlign: 'right', paddingRight: 10 }]}>CUSTO TOTAL APROVADO:</Text>
             <Text style={[styles.col4]}>{formatCurrency(custoTotal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. HISTÓRICO DE TRATATIVAS E REABERTURAS</Text>
          <View style={styles.box}>
            {chamado.historico && chamado.historico.length > 0 ? (
              <View style={styles.timelineContainer}>
                {chamado.historico.map((entry, idx) => (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineAction}>{entry.acao}</Text>
                        <Text style={styles.timelineDate}>{new Date(entry.data).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.timelineObs}>{entry.observacao || `Responsável: ${entry.usuario}`}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 10 }}>Nenhum histórico registrado.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. CONCLUSÃO</Text>
          <View style={styles.box}>
             {chamado.relatoConclusao && (
               <View style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #e2e8f0' }}>
                 <Text style={[styles.label, { color: '#F47B20' }]}>O QUE FOI FEITO (RELATO DO PRESTADOR / VISTORIA)</Text>
                 <Text style={{ fontSize: 10, lineHeight: 1.5, marginTop: 5 }}>
                   {chamado.relatoConclusao}
                 </Text>
               </View>
             )}
             {chamado.reaberto && (
                <View style={{ marginBottom: 15, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 4 }}>
                   <Text style={{ fontSize: 9, color: '#DC2626', fontWeight: 'bold' }}>ATENÇÃO: Este foi um chamado reincidente (reaberto após primeira tentativa de conclusão).</Text>
                </View>
             )}
             <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
               Atestamos para os devidos fins que os serviços acima descritos foram realizados e concluídos conforme solicitação. 
               Este formulário serve também como prestação de contas parcial/total relacionada aos custos da manutenção para futura 
               alocação {chamado.aprovacaoOrcamento === 'Obrigatória Proprietário' ? '(Repasse / Imposto de Renda)' : ''}.
             </Text>
             <Text style={{ fontSize: 10, marginTop: 20 }}>
               Responsabilidade Aparente: {chamado.responsabilidadeAparente}
             </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Gerado pelo Módulo de Manutenção - Morada Urbana Consultoria</Text>
        </View>
      </Page>
    </Document>
  );
};
