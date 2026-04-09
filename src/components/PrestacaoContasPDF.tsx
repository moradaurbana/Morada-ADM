import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo1 from '../assets/logo1.png';
import logo3 from '../assets/logo3.png';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#333',
    backgroundColor: '#ffffff'
  },
  coverPage: {
    padding: 0,
    backgroundColor: '#1E2732',
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a1118',
    opacity: 0.6,
  },
  coverContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 50,
  },
  coverHeader: {
    marginTop: 20,
  },
  coverHeaderLine: {
    width: 30,
    height: 2,
    backgroundColor: '#F47B20',
    marginBottom: 10,
  },
  coverBrand: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  coverSubBrand: {
    color: '#aaa',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
  coverDateBadge: {
    position: 'absolute',
    top: 70,
    right: 50,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 15,
  },
  coverDateText: {
    color: '#aaa',
    fontSize: 8,
    letterSpacing: 1,
  },
  coverMainText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 5,
    lineHeight: 1.1,
  },
  coverDocRef: {
    color: '#F47B20',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverFooterLeft: {
    color: '#aaa',
    fontSize: 8,
    letterSpacing: 1,
  },
  coverFooterRight: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'rgba(30, 39, 50, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coverFooterLogoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#777',
  },
  logoContainer: {
    alignItems: 'flex-end',
    width: 150,
    position: 'relative',
  },
  secondaryLogo: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 60,
    height: 'auto',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F47B20',
  },
  logoSubText: {
    fontSize: 8,
    color: '#1E2732',
  },
  infoSection: {
    marginBottom: 20,
    lineHeight: 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 80,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
  },
  mesReferencia: {
    marginTop: 10,
    marginBottom: 10,
    color: '#666',
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2732',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableHeaderLeft: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E2732',
    letterSpacing: 1,
  },
  tableHeaderRight: {
    width: 100,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E2732',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRowHighlight: {
    backgroundColor: '#fafafa',
  },
  tableRowDark: {
    backgroundColor: '#f8f9fa',
  },
  tableColLeft: {
    flex: 1,
    color: '#444',
    fontSize: 10,
  },
  tableColRight: {
    width: 100,
    textAlign: 'right',
    color: '#1E2732',
    fontWeight: 'bold',
    fontSize: 10,
  },
  textRed: {
    color: '#ff0000',
  },
  tableHeader: {
    fontWeight: 'bold',
    color: '#F47B20',
    borderBottomWidth: 2,
    borderBottomColor: '#F47B20',
    paddingBottom: 5,
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 10,
    backgroundColor: '#1E2732',
    borderRadius: 4,
  },
  totalLabel: {
    flex: 1,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#F47B20',
  },
  disclaimer: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
    marginTop: 20,
    marginBottom: 40,
    textAlign: 'justify',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#999',
    width: 300,
    marginHorizontal: 'auto',
    marginTop: 40,
    paddingTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    lineHeight: 1.4,
  }
});

const formatCurrency = (value: number) => {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CoverPage = ({ type, monthYear }: { type: 'LOCATÁRIO' | 'LOCADOR', monthYear: string }) => (
  <Page size="A4" style={styles.coverPage}>
    <Image src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" style={styles.coverImage} />
    <View style={styles.coverOverlay} />
    <View style={styles.coverContent}>
      <View style={styles.coverHeader}>
        <View style={styles.coverHeaderLine} />
        <Text style={styles.coverBrand}>MORADA URBANA</Text>
        <Text style={styles.coverSubBrand}>CONSULTORIA IMOBILIÁRIA</Text>
      </View>
      
      <View style={styles.coverDateBadge}>
        <Text style={styles.coverDateText}>{monthYear.toUpperCase()}</Text>
      </View>

      <View style={{ marginTop: 250 }}>
        <Text style={{ color: '#aaa', fontSize: 10, lineHeight: 1.5, width: 350, marginBottom: 50 }}>
          SOLUÇÕES IMOBILIÁRIAS PERSONALIZADAS COM FOCO EM EXCELÊNCIA, TRANSPARÊNCIA E VALORIZAÇÃO PATRIMONIAL.
        </Text>
        
        <Text style={styles.coverDocRef}>DOCUMENTO DE REFERÊNCIA</Text>
        <Text style={styles.coverMainText}>PRESTAÇÃO DE</Text>
        <Text style={styles.coverMainText}>CONTAS {type}</Text>
      </View>

      <View style={styles.coverFooter}>
        <View>
          <Text style={styles.coverFooterLeft}>PREPARADO POR</Text>
          <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>EQUIPE MORADA URBANA</Text>
        </View>
        <View style={styles.coverFooterRight}>
          <Image src={logo3} style={{ width: 120, height: 'auto' }} />
        </View>
      </View>
    </View>
  </Page>
);

const formatMesReferencia = (mesRef?: string) => {
  if (!mesRef) return format(new Date(), 'MM / yyyy', { locale: ptBR });
  return mesRef.includes('/') ? mesRef.replace('/', ' / ') : mesRef;
};

export const InquilinoPDF = ({ cobranca, contrato, inquilino, imovel, coInquilinos = [] }: any) => {
  const inquilinosNomes = [inquilino?.nome, ...coInquilinos.map((c: any) => c.nome)].filter(Boolean).join(', ');
  const mesRef = formatMesReferencia(cobranca?.mesReferencia);
  
  return (
  <Document>
    <CoverPage type="LOCATÁRIO" monthYear={mesRef} />
    <Page size="A4" style={styles.page}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Prestação de contas</Text>
        <View style={styles.logoContainer}>
          <Image src={logo3} style={styles.secondaryLogo} />
          <Image src={logo1} style={{ width: 120 }} />
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Inquilino(s):</Text>
          <Text style={styles.infoValue}>{inquilinosNomes}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Imóvel:</Text>
          <Text style={styles.infoValue}>{imovel?.endereco}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Condomínio:</Text>
          <Text style={styles.infoValue}>{imovel?.nomeCondominio || imovel?.caracteristicas || 'N/A'}</Text>
        </View>
      </View>

      <Text style={styles.mesReferencia}>Mês referência: {mesRef}:</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderLeft}>DESCRIÇÃO</Text>
          <Text style={styles.tableHeaderRight}>VALOR</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableColLeft}>ALUGUEL</Text>
          <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorAluguel)}</Text>
        </View>
        
        {cobranca?.valorCondominio > 0 && (
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableColLeft}>Cota condominial</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorCondominio)}</Text>
          </View>
        )}
        
        {cobranca?.valorIptu > 0 && (
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableColLeft}>IPTU</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorIptu)}</Text>
          </View>
        )}

        {cobranca?.taxasExtras > 0 && (
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Taxas Extras</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.taxasExtras)}</Text>
          </View>
        )}

        {cobranca?.itensAdicionais?.map((item: any, index: number) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowHighlight : {}]}>
            <Text style={[styles.tableColLeft, (item.tipo === 'desconto' || item.tipo === 'despesa_proprietario') ? styles.textRed : {}]}>{item.descricao}</Text>
            <Text style={[styles.tableColRight, (item.tipo === 'desconto' || item.tipo === 'despesa_proprietario') ? styles.textRed : {}]}>
              {(item.tipo === 'desconto' || item.tipo === 'despesa_proprietario') ? '- ' : ''}{formatCurrency(item.valor)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalValue}>{formatCurrency(cobranca?.valorTotal)}</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Recebi de Morada Urbana Consultoria Imobiliária, CNPJ – 52.098.528/0001-49, corretora representante Shirley Cristina Ortega CRECI N° - 231764, a prestação de contas referente ao pagamento de aluguel, IPTU e condomínio no mês referência acima descrito.
      </Text>

      <View style={styles.signatureLine}>
        <Text>{inquilino?.nome}</Text>
      </View>

      <View style={styles.footer}>
        <Text>Rua General Alencastro Guimarães, 253 CEP: 05101-050 – São Paulo – SP</Text>
        <Text>www.moradaurbana.com.br</Text>
      </View>
    </Page>
  </Document>
  );
};

export const ProprietarioPDF = ({ repasse, cobranca, contrato, proprietario, inquilino, imovel }: any) => {
  const valorCondoBase = repasse?.valorCondominio !== undefined ? repasse.valorCondominio : cobranca?.valorCondominio;
  const itensCondo = repasse?.itensAdicionais?.filter((item: any) => item.fazParteCondominio) || [];
  const valorCondoTotal = valorCondoBase + itensCondo.reduce((acc: number, item: any) => acc + item.valor, 0);
  const itensOutros = repasse?.itensAdicionais?.filter((item: any) => !item.fazParteCondominio) || [];
  const mesRef = formatMesReferencia(repasse?.mesReferencia || cobranca?.mesReferencia);

  return (
  <Document>
    <CoverPage type="LOCADOR" monthYear={mesRef} />
    
    {/* PÁGINA 1: Valores Recebidos do Locatário */}
    <Page size="A4" style={styles.page}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Prestação de contas</Text>
        <View style={styles.logoContainer}>
          <Image src={logo3} style={styles.secondaryLogo} />
          <Image src={logo1} style={{ width: 120 }} />
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Proprietário:</Text>
          <Text style={styles.infoValue}>{proprietario?.nome}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Inquilino:</Text>
          <Text style={styles.infoValue}>{inquilino?.nome}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Imóvel:</Text>
          <Text style={styles.infoValue}>{imovel?.endereco}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Condomínio:</Text>
          <Text style={styles.infoValue}>{imovel?.nomeCondominio || imovel?.caracteristicas || 'N/A'}</Text>
        </View>
      </View>

      <Text style={styles.mesReferencia}>Mês referência: {mesRef} – Valores recebidos do locatário:</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderLeft}>DESCRIÇÃO</Text>
          <Text style={styles.tableHeaderRight}>VALOR</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableColLeft}>ALUGUEL</Text>
          <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorAluguel)}</Text>
        </View>
        
        {cobranca?.valorCondominio > 0 && (
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableColLeft}>Cota condominial</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorCondominio)}</Text>
          </View>
        )}
        
        {cobranca?.valorIptu > 0 && (
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableColLeft}>IPTU</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.valorIptu)}</Text>
          </View>
        )}

        {cobranca?.taxasExtras > 0 && (
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>Taxas Extras</Text>
            <Text style={styles.tableColRight}>{formatCurrency(cobranca?.taxasExtras)}</Text>
          </View>
        )}

        {cobranca?.itensAdicionais?.map((item: any, index: number) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowHighlight : {}]}>
            <Text style={styles.tableColLeft}>{item.descricao}</Text>
            <Text style={styles.tableColRight}>
              {(item.tipo === 'desconto' || item.tipo === 'despesa_proprietario') ? '- ' : ''}{formatCurrency(item.valor)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total recebido do locatário</Text>
          <Text style={styles.totalValue}>{formatCurrency(repasse?.valorRecebido)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Rua General Alencastro Guimarães, 253 CEP: 05101-050 – São Paulo – SP</Text>
        <Text>www.moradaurbana.com.br</Text>
      </View>
    </Page>

    {/* PÁGINA 2: Descontos e Repasse */}
    <Page size="A4" style={styles.page}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Demonstrativo de Repasse</Text>
        <View style={styles.logoContainer}>
          <Image src={logo3} style={styles.secondaryLogo} />
          <Image src={logo1} style={{ width: 120, height: 'auto' }} />
        </View>
      </View>

      <Text style={styles.mesReferencia}>Valores descontados / adicionados:</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderLeft}>DESCRIÇÃO</Text>
          <Text style={styles.tableHeaderRight}>VALOR</Text>
        </View>
        
        {valorCondoTotal > 0 && (
          <>
            <View style={[styles.tableRow, styles.tableRowHighlight]}>
              <Text style={styles.tableColLeft}>Condomínio ({repasse?.tipoCondominio === 'repasse' ? 'repassado ao proprietário' : 'boleto pago pela ADM'})</Text>
              <Text style={styles.tableColRight}>{repasse?.tipoCondominio === 'repasse' ? '' : '- '}{formatCurrency(valorCondoTotal)}</Text>
            </View>
            {/* Detalhamento do condomínio */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableColLeft, { paddingLeft: 10, fontSize: 8, color: '#666' }]}>• Cota Condominial</Text>
              <Text style={[styles.tableColRight, { fontSize: 8, color: '#666' }]}>{formatCurrency(valorCondoBase)}</Text>
            </View>
            {itensCondo.map((item: any, idx: number) => (
              <View key={`condo-detail-${idx}`} style={styles.tableRow}>
                <Text style={[styles.tableColLeft, { paddingLeft: 10, fontSize: 8, color: '#666' }]}>• {item.descricao}</Text>
                <Text style={[styles.tableColRight, { fontSize: 8, color: '#666' }]}>{formatCurrency(item.valor)}</Text>
              </View>
            ))}
          </>
        )}

        {(repasse?.valorIptu !== undefined ? repasse.valorIptu : cobranca?.valorIptu) > 0 && (
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableColLeft}>IPTU ({repasse?.tipoIptu === 'repasse' ? 'repassado ao proprietário' : 'pago pela ADM'})</Text>
            <Text style={styles.tableColRight}>{repasse?.tipoIptu === 'repasse' ? '' : '- '}{formatCurrency(repasse?.valorIptu !== undefined ? repasse.valorIptu : cobranca?.valorIptu)}</Text>
          </View>
        )}
        
        <View style={styles.tableRow}>
          <Text style={styles.tableColLeft}>Administração ({contrato?.taxaAdministracao}%):</Text>
          <Text style={styles.tableColRight}>- {formatCurrency(repasse?.taxaAdministracao)}</Text>
        </View>

        {itensOutros.map((item: any, index: number) => (
          <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowHighlight : {}]}>
            <Text style={styles.tableColLeft}>{item.descricao}</Text>
            <Text style={styles.tableColRight}>
              {item.tipo === 'desconto' ? '- ' : '+ '}{formatCurrency(item.valor)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total de repasse para o locador:</Text>
          <Text style={styles.totalValue}>{formatCurrency(repasse?.valorLiquido)}</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Recebi de Morada Urbana Consultoria Imobiliária, CNPJ 52.098.528/0001-49, corretora representante Shirley Cristina Ortega CRECI N° - 231764, a importância de {formatCurrency(repasse?.valorLiquido)} referente ao repasse do aluguel e encargos no mês referência acima descrito.
      </Text>

      <View style={styles.signatureLine}>
        <Text>{proprietario?.nome}</Text>
      </View>

      <View style={styles.footer}>
        <Text>Rua General Alencastro Guimarães, 253 CEP: 05101-050 – São Paulo – SP</Text>
        <Text>www.moradaurbana.com.br</Text>
      </View>
    </Page>
  </Document>
  );
};
