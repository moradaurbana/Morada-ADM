import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CheckCircle2, Circle, Search, ChevronLeft, ChevronRight, FileText, Send, DollarSign, Building, FileSignature, Wallet, MessageCircle, Upload, Paperclip } from 'lucide-react';

export default function RotinaFinanceira() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [imoveis, setImoveis] = useState<any>({});
  const [inquilinos, setInquilinos] = useState<any>({});
  const [proprietarios, setProprietarios] = useState<any>({});
  const [fechamentos, setFechamentos] = useState<any>({});
  
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [mesGeracao, setMesGeracao] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [anoGeracao, setAnoGeracao] = useState(currentDate.getFullYear());
  
  const [searchTerm, setSearchTerm] = useState('');

  const passos = [
    { id: 'passo1_prestacao_inquilino', label: 'Gerar Prestação', desc: 'Inquilino', icon: FileText, color: 'text-blue-500' },
    { id: 'passo2_boleto_inquilino', label: 'Gerar Boleto', desc: 'Inquilino', icon: FileSignature, color: 'text-blue-500' },
    { id: 'passo3_enviar_whats_inquilino', label: 'Enviar Whats', desc: 'Inquilino', icon: Send, color: 'text-green-500' },
    { id: 'passo4_identificar_pagamento', label: 'Identificar PG', desc: 'Inquilino', icon: DollarSign, color: 'text-green-600' },
    { id: 'passo5_pagar_condominio_iptu', label: 'Pagar Cond/IPTU', desc: 'Despesa', icon: Building, color: 'text-orange-500' },
    { id: 'passo7_prestacao_proprietario', label: 'Gerar Prestação', desc: 'Proprietário', icon: FileText, color: 'text-purple-500' },
    { id: 'passo8_repasse_proprietario', label: 'Repasse', desc: 'Proprietário', icon: Wallet, color: 'text-purple-500' },
    { id: 'passo9_enviar_whats_proprietario', label: 'Enviar Whats', desc: 'Proprietário', icon: Send, color: 'text-green-500' },
  ];

  useEffect(() => {
    fetchData();
  }, [mesGeracao, anoGeracao]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [imoveisSnap, inquilinosSnap, proprietariosSnap, contratosSnap, fechamentosSnap] = await Promise.all([
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'inquilinos')),
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'contratos')),
        getDocs(query(collection(db, 'fechamentos_mensais'), where('mesReferencia', '==', `${mesGeracao}/${anoGeracao}`)))
      ]);

      const imoveisData: any = {};
      imoveisSnap.forEach(doc => imoveisData[doc.id] = { id: doc.id, ...doc.data() });
      setImoveis(imoveisData);

      const inquilinosData: any = {};
      inquilinosSnap.forEach(doc => inquilinosData[doc.id] = { id: doc.id, ...doc.data() });
      setInquilinos(inquilinosData);

      const proprietariosData: any = {};
      proprietariosSnap.forEach(doc => proprietariosData[doc.id] = { id: doc.id, ...doc.data() });
      setProprietarios(proprietariosData);

      const contratosData: any[] = [];
      contratosSnap.forEach(doc => {
        if (doc.data().status === 'Ativo') {
          contratosData.push({ id: doc.id, ...doc.data() });
        }
      });
      setContratos(contratosData);

      const fechamentosData: any = {};
      fechamentosSnap.forEach(doc => fechamentosData[doc.data().contratoId] = { id: doc.id, ...doc.data() });
      setFechamentos(fechamentosData);

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'fechamentos_mensais');
    } finally {
      setLoading(false);
    }
  };

  const handleMesChange = (delta: number) => {
    let newMes = parseInt(mesGeracao) + delta;
    let newAno = anoGeracao;
    
    if (newMes > 12) {
      newMes = 1;
      newAno++;
    } else if (newMes < 1) {
      newMes = 12;
      newAno--;
    }
    
    setMesGeracao(String(newMes).padStart(2, '0'));
    setAnoGeracao(newAno);
  };

  const togglePasso = async (contratoId: string, passoId: string, currentValue: boolean) => {
    try {
      const docId = `${contratoId}_${mesGeracao}_${anoGeracao}`;
      const newValue = !currentValue;
      
      const fechamentoAtual = fechamentos[contratoId] || {
        contratoId,
        mesReferencia: `${mesGeracao}/${anoGeracao}`,
      };

      const updatedFechamento = {
        ...fechamentoAtual,
        [passoId]: newValue,
        updatedAt: new Date().toISOString()
      };

      setFechamentos({
        ...fechamentos,
        [contratoId]: updatedFechamento
      });

      await setDoc(doc(db, 'fechamentos_mensais', docId), updatedFechamento, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'fechamentos_mensais');
    }
  };

  const getProgress = (fechamento: any) => {
    if (!fechamento) return 0;
    const completed = passos.filter(p => fechamento[p.id]).length;
    return Math.round((completed / passos.length) * 100);
  };

  const renderExtraAction = (passoId: string, contrato: any, fechamento: any) => {
    const inquilino = inquilinos[contrato.inquilinoId];
    const proprietario = proprietarios[contrato.proprietarioId];
    
    if (passoId === 'passo3_enviar_whats_inquilino') {
      const telefone = inquilino?.telefone || inquilino?.celular || '';
      const texto = `Olá ${inquilino?.nome}, segue sua prestação de contas e boleto referentes ao mês ${mesGeracao}/${anoGeracao}.`;
      return (
        <a 
          href={`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-[10px] text-green-600 font-medium flex items-center justify-center gap-1 hover:underline mt-1 bg-green-50 px-2 py-1 rounded-md"
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
      );
    }
  
    if (passoId === 'passo9_enviar_whats_proprietario') {
      const telefone = proprietario?.telefone || proprietario?.celular || '';
      const texto = `Olá ${proprietario?.nome}, segue sua prestação de contas e comprovante de repasse referentes ao mês ${mesGeracao}/${anoGeracao}.`;
      return (
        <a 
          href={`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-[10px] text-green-600 font-medium flex items-center justify-center gap-1 hover:underline mt-1 bg-green-50 px-2 py-1 rounded-md"
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
      );
    }
  
    if (['passo1_prestacao_inquilino', 'passo2_boleto_inquilino'].includes(passoId)) {
       return (
          <label className="text-[10px] text-blue-500 font-medium flex items-center justify-center gap-1 hover:underline mt-1 bg-blue-50 px-2 py-1 rounded-md w-full cursor-pointer" title="Anexar arquivo">
             <Upload size={12} /> Gerar/Anexar
             <input type="file" className="hidden" onChange={(e) => {
               if (e.target.files && e.target.files.length > 0) {
                 alert(`Arquivo "${e.target.files[0].name}" anexado com sucesso! (Simulação)`);
                 if (!fechamento[passoId]) {
                   togglePasso(contrato.id, passoId, false);
                 }
               }
             }} />
          </label>
       )
    }
  
    if (['passo4_identificar_pagamento', 'passo5_pagar_condominio_iptu'].includes(passoId)) {
      return (
          <label className="text-[10px] text-orange-500 font-medium flex items-center justify-center gap-1 hover:underline mt-1 bg-orange-50 px-2 py-1 rounded-md w-full cursor-pointer" title="Anexar Comprovante">
             <Paperclip size={12} /> Comprovante
             <input type="file" className="hidden" onChange={(e) => {
               if (e.target.files && e.target.files.length > 0) {
                 alert(`Comprovante "${e.target.files[0].name}" anexado com sucesso! (Simulação)`);
                 if (!fechamento[passoId]) {
                   togglePasso(contrato.id, passoId, false);
                 }
               }
             }} />
          </label>
      )
    }
  
    return null;
  };

  const filteredContratos = contratos.filter(c => {
    const imovel = imoveis[c.imovelId];
    const inquilino = inquilinos[c.inquilinoId];
    const proprietario = proprietarios[c.proprietarioId];
    
    const searchStr = `${c.codigo} ${imovel?.endereco} ${imovel?.condominio} ${inquilino?.nome} ${proprietario?.nome}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Rotina Financeira</h1>
          <p className="text-gray-500">Acompanhamento mensal de pagamentos e repasses</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleMesChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-lg font-bold text-[#1E2732] w-32 text-center">
            {mesGeracao}/{anoGeracao}
          </div>
          <button 
            onClick={() => handleMesChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar contrato, imóvel ou pessoas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto max-h-[calc(100vh-200px)] flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[1200px]">
            <thead className="sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="p-4 font-semibold text-gray-600 sticky left-0 z-30 bg-gray-50 shadow-[1px_0_0_0_#e5e7eb]">Contrato / Imóvel</th>
                {passos.map(passo => (
                  <th key={passo.id} className="p-4 text-center bg-gray-50">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <passo.icon size={16} className={passo.color} />
                      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{passo.label}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">{passo.desc}</span>
                    </div>
                  </th>
                ))}
                <th className="p-4 font-semibold text-gray-600 bg-gray-50 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={passos.length + 2} className="p-8 text-center text-gray-500">
                    Carregando rotina...
                  </td>
                </tr>
              ) : filteredContratos.length === 0 ? (
                <tr>
                  <td colSpan={passos.length + 2} className="p-8 text-center text-gray-500">
                    Nenhum contrato ativo encontrado.
                  </td>
                </tr>
              ) : (
                filteredContratos.map(contrato => {
                  const imovel = imoveis[contrato.imovelId];
                  const fechamento = fechamentos[contrato.id] || {};
                  const progress = getProgress(fechamento);

                  return (
                    <tr key={contrato.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4 sticky left-0 bg-white shadow-[1px_0_0_0_#f3f4f6] group-hover:bg-gray-50/50 z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#1E2732] text-sm">{contrato.codigo}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700 truncate max-w-[200px]">{imovel?.endereco}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[200px]">Loc: {inquilinos[contrato.inquilinoId]?.nome}</p>
                        <p className="text-[10px] text-gray-500 truncate max-w-[200px]">Prop: {proprietarios[contrato.proprietarioId]?.nome}</p>
                      </td>
                      
                      {passos.map(passo => (
                        <td key={passo.id} className="p-4 text-center align-top">
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => togglePasso(contrato.id, passo.id, !!fechamento[passo.id])}
                              className="inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              {fechamento[passo.id] ? (
                                <CheckCircle2 size={24} className={passo.color} />
                              ) : (
                                <Circle size={24} className="text-gray-300" />
                              )}
                            </button>
                            {renderExtraAction(passo.id, contrato, fechamento)}
                          </div>
                        </td>
                      ))}
                      
                      <td className="p-4 align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${progress === 100 ? 'text-green-600' : 'text-[#F47B20]'}`}>
                            {progress}%
                          </span>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-[#F47B20]'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
