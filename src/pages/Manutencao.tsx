import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Database, Download, ShieldCheck, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

export default function Manutencao() {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const collections = [
    'proprietarios',
    'inquilinos',
    'imoveis',
    'contratos',
    'cobrancas',
    'repasses',
    'usuarios'
  ];

  const exportBackup = async () => {
    try {
      setExporting(true);
      setStatus(null);

      const collections = [
        'proprietarios',
        'inquilinos',
        'imoveis',
        'contratos',
        'cobrancas',
        'repasses',
        'usuarios'
      ];

      const backupData: Record<string, any[]> = {};

      // Buscar dados de todas as coleções em paralelo
      await Promise.all(collections.map(async (colName) => {
        const snap = await getDocs(collection(db, colName));
        backupData[colName] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }));

      // Gerar o arquivo JSON
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Criar link temporário para download
      const link = document.createElement('a');
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      link.href = url;
      link.download = `backup-imobiliaria-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: 'Backup exportado com sucesso!' });
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      setStatus({ type: 'error', message: 'Falha ao exportar backup. Verifique sua conexão e permissões.' });
      handleFirestoreError(error, OperationType.LIST, 'backup_export');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async (colName: string) => {
    try {
      setExporting(true);
      setStatus(null);

      const snap = await getDocs(collection(db, colName));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (data.length === 0) {
        setStatus({ type: 'error', message: `A coleção ${colName} está vazia.` });
        return;
      }

      // Função para achatar objetos aninhados para o CSV
      const flatten = (obj: any, prefix = ''): any => {
        return Object.keys(obj).reduce((acc: any, k: string) => {
          const pre = prefix.length ? prefix + '_' : '';
          if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]) && !(obj[k] instanceof Date)) {
            Object.assign(acc, flatten(obj[k], pre + k));
          } else if (Array.isArray(obj[k])) {
            acc[pre + k] = obj[k].join('; ');
          } else {
            acc[pre + k] = obj[k];
          }
          return acc;
        }, {});
      };

      const flattenedData = data.map(item => flatten(item));
      
      // Obter todos os cabeçalhos únicos
      const headers = Array.from(new Set(flattenedData.flatMap(item => Object.keys(item))));
      
      const csvContent = [
        headers.join(','),
        ...flattenedData.map(item => 
          headers.map(header => {
            let val = item[header];
            if (val === null || val === undefined) val = '';
            // Escapar aspas e envolver em aspas
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-${colName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: `Coleção ${colName} exportada com sucesso!` });
    } catch (error) {
      console.error(`Erro ao exportar ${colName}:`, error);
      setStatus({ type: 'error', message: `Falha ao exportar ${colName}.` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Manutenção</h1>
          <p className="text-gray-500">Ferramentas de sistema e segurança de dados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card de Exportação */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="text-blue-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Backup de Dados</h2>
          </div>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Esta ferramenta permite exportar todos os dados cadastrados no sistema (Proprietários, Inquilinos, Imóveis, Contratos e Financeiro) em um arquivo JSON. Recomendamos realizar este backup periodicamente para sua segurança.
          </p>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-blue-800">
                O arquivo gerado contém informações sensíveis. Armazene-o em um local seguro e não o compartilhe com pessoas não autorizadas.
              </p>
            </div>

            <button
              onClick={exportBackup}
              disabled={exporting}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                exporting 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-[#1E2732] text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
              }`}
            >
              {exporting ? (
                <>Gerando arquivo...</>
              ) : (
                <>
                  <Download size={20} />
                  Exportar Backup Completo (JSON)
                </>
              )}
            </button>

            {status && (
              <div className={`p-3 rounded-lg text-sm font-medium text-center ${
                status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {status.message}
              </div>
            )}
          </div>
        </div>

        {/* Card de Informações */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="text-green-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Exportar Planilhas (CSV)</h2>
          </div>
          
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Exporte coleções individuais para o formato CSV, compatível com Excel e Google Sheets.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {collections.map(col => (
              <button
                key={col}
                onClick={() => exportToCSV(col)}
                disabled={exporting}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-colors capitalize"
              >
                {col}
                <Download size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Card de Informações Importantes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-[#1E2732]">Informações Importantes</h2>
          </div>
          
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-[#F47B20] font-bold">•</span>
              O backup inclui todas as coleções do banco de dados.
            </li>
            <li className="flex gap-2">
              <span className="text-[#F47B20] font-bold">•</span>
              Arquivos anexos (fotos, PDFs) não são incluídos no JSON, apenas seus links e metadados.
            </li>
            <li className="flex gap-2">
              <span className="text-[#F47B20] font-bold">•</span>
              A restauração de dados a partir deste arquivo deve ser feita apenas por suporte técnico especializado.
            </li>
            <li className="flex gap-2">
              <span className="text-[#F47B20] font-bold">•</span>
              O tempo de geração depende da quantidade de dados e da velocidade da sua internet.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
