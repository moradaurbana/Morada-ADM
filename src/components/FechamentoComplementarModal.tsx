import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ArrowDownCircle, ArrowUpCircle, CheckCircle2, ShieldAlert, AlertCircle, FileText } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function FechamentoComplementarModal({ isOpen, onClose, onSuccess, contratos, imoveis, inquilinos, proprietarios, mesGeracao, anoGeracao }: any) {
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaNatureza, setNovaNatureza] = useState<'credito' | 'debito'>('debito');
  const [novoTipoApp, setNovoTipoApp] = useState<'ambos' | 'locatario' | 'locador'>('ambos');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!novaDescricao || !novoValor) return;
    const val = parseFloat(novoValor);
    if (isNaN(val) || val <= 0) return;

    setItens([...itens, { 
      id: Date.now().toString(), 
      descricao: novaDescricao.trim(), 
      valor: val,
      natureza: novaNatureza, // 'credito' (+) ou 'debito' (-)
      tipoApp: novoTipoApp // 'ambos', 'locatario', 'locador'
    }]);
    
    setNovaDescricao('');
    setNovoValor('');
  };

  const applyPreset = (desc: string, natureza: 'credito' | 'debito', tipoApp: 'ambos' | 'locatario' | 'locador') => {
    setNovaDescricao(desc);
    setNovaNatureza(natureza);
    setNovoTipoApp(tipoApp);
  };

  const selectedContrato = contratos.find((c: any) => c.id === selectedContratoId);
  const imovel = selectedContrato ? imoveis[selectedContrato.imovelId] : null;
  const inquilino = selectedContrato ? inquilinos[selectedContrato.inquilinoId] : null;
  const proprietario = selectedContrato ? proprietarios[selectedContrato.proprietarioId] : null;

  // CÁLCULOS DO INQUILINO
  const itensInquilino = itens.filter(i => i.tipoApp === 'ambos' || i.tipoApp === 'locatario');
  const totalCreditosInquilino = itensInquilino
    .filter(i => i.natureza === 'credito')
    .reduce((acc, i) => acc + i.valor, 0);

  const totalDebitosInquilino = itensInquilino
    .filter(i => i.natureza === 'debito')
    .reduce((acc, i) => acc + i.valor, 0);

  // Saldo Líquido Inquilino: se positivo, inquilino deve pagar. Se negativo, inquilino recebe devolução de caução.
  const saldoInquilino = Number((totalDebitosInquilino - totalCreditosInquilino).toFixed(2));

  // CÁLCULOS DO LOCADOR
  // Itens 'ambos' com natureza 'debito' (como multa, aluguel) são cobrados do inquilino e repassados como acréscimo ao locador.
  // Itens 'ambos' com natureza 'credito' abatem do locador.
  // Itens 'locador' afetam apenas o locador (credito = acrescimo, debito = desconto).
  const itensLocador = itens.flatMap(i => {
    if (i.tipoApp === 'ambos') {
      if (i.natureza === 'debito') {
        return [{ descricao: i.descricao, valor: i.valor, tipo: 'acrescimo', natureza: 'credito', fazParteCondominio: false }];
      } else {
        return [{ descricao: i.descricao, valor: i.valor, tipo: 'desconto', natureza: 'debito', fazParteCondominio: false }];
      }
    }
    if (i.tipoApp === 'locador') {
      if (i.natureza === 'credito') {
        return [{ descricao: i.descricao, valor: i.valor, tipo: 'acrescimo', natureza: 'credito', fazParteCondominio: false }];
      } else {
        return [{ descricao: i.descricao, valor: i.valor, tipo: 'desconto', natureza: 'debito', fazParteCondominio: false }];
      }
    }
    return [];
  });

  const totalAcrescimosLocador = itensLocador.reduce((acc, i) => acc + (i.tipo === 'acrescimo' ? i.valor : 0), 0);
  const totalDescontosLocador = itensLocador.reduce((acc, i) => acc + (i.tipo === 'desconto' ? i.valor : 0), 0);
  const valorLiquidoLocador = Number((totalAcrescimosLocador - totalDescontosLocador).toFixed(2));

  const handleSave = async () => {
    if (!selectedContrato) return;
    
    setLoading(true);
    try {
      // Mapear itens do inquilino compatíveis com visualização e relatórios
      const mappedItensInquilino = itensInquilino.map(i => ({
        descricao: i.descricao,
        valor: i.valor,
        natureza: i.natureza,
        tipo: i.natureza === 'credito' ? 'desconto' : 'acrescimo',
        fazParteCondominio: false
      }));

      // 1. CASO SALDO INQUILINO > 0: Inquilino fica devendo uma diferença (ex: R$ 180,00)
      if (saldoInquilino > 0) {
        await addDoc(collection(db, 'cobrancas'), {
          contratoId: selectedContrato.id,
          inquilinoId: selectedContrato.inquilinoId,
          mesReferencia: `${mesGeracao}/${anoGeracao}`,
          dataVencimento: new Date().toISOString().split('T')[0],
          valorAluguel: 0,
          valorCondominio: 0,
          valorIptu: 0,
          taxasExtras: 0,
          itensAdicionais: mappedItensInquilino,
          valorTotal: saldoInquilino,
          status: 'Pendente',
          isComplementar: true,
          complementarRepasseData: {
            proprietarioId: selectedContrato.proprietarioId,
            mesReferencia: `${mesGeracao}/${anoGeracao}`,
            valorAluguel: 0,
            valorRecebido: saldoInquilino,
            taxaAdministracao: 0,
            itensAdicionais: itensLocador,
            valorLiquido: valorLiquidoLocador
          }
        });
      } 
      // 2. CASO SALDO INQUILINO < 0: Sobrou caução a ser DEVOLVIDA ao inquilino (ex: -R$ 1.400,00)
      else if (saldoInquilino < 0) {
        const valorDevolver = Math.abs(saldoInquilino);
        
        // Criar cobrança já compensada com histórico arquivado
        await addDoc(collection(db, 'cobrancas'), {
          contratoId: selectedContrato.id,
          inquilinoId: selectedContrato.inquilinoId,
          mesReferencia: `${mesGeracao}/${anoGeracao}`,
          dataVencimento: new Date().toISOString().split('T')[0],
          valorAluguel: 0,
          valorCondominio: 0,
          valorIptu: 0,
          taxasExtras: 0,
          itensAdicionais: mappedItensInquilino,
          valorTotal: 0,
          status: 'Pago',
          dataPagamento: new Date().toISOString(),
          isComplementar: true
        });

        // Criar Conta a Pagar: Devolução de Caução ao Inquilino
        await addDoc(collection(db, 'repasses'), {
          contratoId: selectedContrato.id,
          proprietarioId: selectedContrato.proprietarioId,
          inquilinoId: selectedContrato.inquilinoId,
          beneficiarioTipo: 'inquilino',
          mesReferencia: `${mesGeracao}/${anoGeracao}`,
          valorAluguel: 0,
          valorRecebido: 0,
          taxaAdministracao: 0,
          itensAdicionais: [{ descricao: 'Restituição / Devolução de Saldo de Caução', valor: valorDevolver, tipo: 'acrescimo' }],
          valorLiquido: valorDevolver,
          status: 'Pendente',
          isComplementar: true,
          isDevolucaoInquilino: true,
          createdAt: new Date().toISOString()
        });

        // Criar Conta a Pagar: Repasse do Locador (se houver valor devido ao locador, como a multa)
        if (valorLiquidoLocador > 0) {
          await addDoc(collection(db, 'repasses'), {
            contratoId: selectedContrato.id,
            proprietarioId: selectedContrato.proprietarioId,
            mesReferencia: `${mesGeracao}/${anoGeracao}`,
            valorAluguel: 0,
            valorRecebido: valorLiquidoLocador,
            taxaAdministracao: 0,
            itensAdicionais: itensLocador,
            valorLiquido: valorLiquidoLocador,
            status: 'Pendente',
            isComplementar: true,
            createdAt: new Date().toISOString()
          });
        }
      }
      // 3. CASO SALDO INQUILINO == 0: Caução bateu 100% com os débitos
      else {
        await addDoc(collection(db, 'cobrancas'), {
          contratoId: selectedContrato.id,
          inquilinoId: selectedContrato.inquilinoId,
          mesReferencia: `${mesGeracao}/${anoGeracao}`,
          dataVencimento: new Date().toISOString().split('T')[0],
          valorAluguel: 0,
          valorCondominio: 0,
          valorIptu: 0,
          taxasExtras: 0,
          itensAdicionais: mappedItensInquilino,
          valorTotal: 0,
          status: 'Pago',
          dataPagamento: new Date().toISOString(),
          isComplementar: true
        });

        if (valorLiquidoLocador > 0) {
          await addDoc(collection(db, 'repasses'), {
            contratoId: selectedContrato.id,
            proprietarioId: selectedContrato.proprietarioId,
            mesReferencia: `${mesGeracao}/${anoGeracao}`,
            valorAluguel: 0,
            valorRecebido: valorLiquidoLocador,
            taxaAdministracao: 0,
            itensAdicionais: itensLocador,
            valorLiquido: valorLiquidoLocador,
            status: 'Pendente',
            isComplementar: true,
            createdAt: new Date().toISOString()
          });
        }
      }

      alert('Fechamento complementar / acerto de contas salvo com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fechamento complementar.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1E2732]">Fechamento Complementar & Acerto de Contas</h2>
              <span className="text-xs bg-orange-100 text-[#F47B20] px-2 py-0.5 rounded-full font-bold">
                Crédito & Débito
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Lance garantias de caução, multas rescisórias, aluguéis e despesas com discriminação contábil clara.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* CORPO */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* SELEÇÃO DO CONTRATO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato Selecionado</label>
            <select 
              value={selectedContratoId}
              onChange={e => {
                setSelectedContratoId(e.target.value);
                setItens([]);
              }}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F47B20] bg-white font-medium text-gray-800"
            >
              <option value="">Selecione um contrato...</option>
              {contratos.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {imoveis[c.imovelId]?.endereco || 'Imóvel'} (Inquilino: {inquilinos[c.inquilinoId]?.nome || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          {selectedContrato && (
            <div className="space-y-6">
              
              {/* DADOS DO CONTRATO / ATALHOS */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Locatário (Inquilino)</p>
                  <p className="text-sm font-bold text-slate-800">{inquilino?.nome || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Locador (Proprietário)</p>
                  <p className="text-sm font-bold text-slate-800">{proprietario?.nome || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Garantia Cadastrada</p>
                  <p className="text-sm font-bold text-[#F47B20]">{selectedContrato.tipoGarantia || 'Não especificada'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Aluguel Base</p>
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(selectedContrato.valorAluguel)}</p>
                </div>
              </div>

              {/* FORMULÁRIO DE LANÇAMENTO (CRÉDITO / DÉBITO) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <h3 className="font-bold text-[#1E2732] flex items-center gap-2">
                    <FileText size={18} className="text-[#F47B20]" />
                    Adicionar Linha de Crédito ou Débito
                  </h3>
                  {/* Atalhos Rápidos */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="text-gray-400 self-center mr-1">Atalhos:</span>
                    <button 
                      type="button"
                      onClick={() => applyPreset('Garantia Caução Retida', 'credito', 'locatario')}
                      className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium hover:bg-green-100"
                    >
                      + Caução
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyPreset('Multa Rescisória Contratual', 'debito', 'ambos')}
                      className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md font-medium hover:bg-red-100"
                    >
                      - Multa Rescisória
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyPreset('Aluguel Proporcional', 'debito', 'ambos')}
                      className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-md font-medium hover:bg-orange-100"
                    >
                      - Aluguel
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyPreset('Despesas Condomínio / Consumos', 'debito', 'locatario')}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium hover:bg-blue-100"
                    >
                      - Despesas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Descrição */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição do Item</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Garantia Caução, Multa, Aluguel..."
                      value={novaDescricao}
                      onChange={e => setNovaDescricao(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#F47B20] text-sm"
                    />
                  </div>

                  {/* Natureza: Crédito ou Débito */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Natureza</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setNovaNatureza('credito')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          novaNatureza === 'credito'
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-green-700'
                        }`}
                      >
                        <ArrowDownCircle size={14} /> + Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaNatureza('debito')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          novaNatureza === 'debito'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-red-700'
                        }`}
                      >
                        <ArrowUpCircle size={14} /> - Débito
                      </button>
                    </div>
                  </div>

                  {/* Valor R$ */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={novoValor}
                      onChange={e => setNovoValor(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#F47B20] text-sm font-semibold"
                    />
                  </div>

                  {/* Destino / Aplicação */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Aplicação</label>
                    <select 
                      value={novoTipoApp}
                      onChange={e => setNovoTipoApp(e.target.value as any)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#F47B20] text-xs font-medium bg-white"
                    >
                      <option value="ambos">Ambos (Inq. e Loc.)</option>
                      <option value="locatario">Apenas Locatário</option>
                      <option value="locador">Apenas Locador</option>
                    </select>
                  </div>

                  {/* Botão Adicionar */}
                  <div className="md:col-span-1">
                    <button 
                      onClick={handleAddItem}
                      className="w-full p-2.5 bg-[#F47B20] text-white rounded-xl hover:bg-[#e06915] transition-colors font-bold flex items-center justify-center shadow-sm"
                      title="Adicionar Linha"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* LISTA DE ITENS LANÇADOS */}
              {itens.length > 0 && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-600">Extrato de Lançamentos ({itens.length})</span>
                    <span className="text-xs text-gray-500">Discriminação detalhada de créditos e débitos</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 text-xs font-semibold text-gray-600">Descrição</th>
                        <th className="p-3 text-xs font-semibold text-gray-600">Natureza</th>
                        <th className="p-3 text-xs font-semibold text-gray-600">Afeta</th>
                        <th className="p-3 text-xs font-semibold text-gray-600 text-right">Valor</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itens.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 text-sm font-medium text-gray-800">{item.descricao}</td>
                          <td className="p-3 text-sm">
                            {item.natureza === 'credito' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                <ArrowDownCircle size={12} /> + Crédito
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                <ArrowUpCircle size={12} /> - Débito
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-600 font-medium">
                            {item.tipoApp === 'ambos' ? 'Locatário e Locador' : item.tipoApp === 'locatario' ? 'Apenas Locatário' : 'Apenas Locador'}
                          </td>
                          <td className={`p-3 text-sm text-right font-bold ${item.natureza === 'credito' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.natureza === 'credito' ? '+ ' : '- '}{formatCurrency(item.valor)}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => setItens(itens.filter(i => i.id !== item.id))}
                              className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                              title="Remover"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAINEL DE BALANÇO EM TEMPO REAL */}
              {itens.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* CARD INQUILINO */}
                  <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-blue-200/50 pb-2">
                      <span className="font-bold text-sm text-blue-900">Balanço do Inquilino (Locatário)</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {inquilino?.nome || 'Inquilino'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>(+) Créditos (Caução retida / abatimentos):</span>
                        <span className="font-bold text-green-600">+{formatCurrency(totalCreditosInquilino)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>(-) Débitos (Multas, aluguéis, despesas):</span>
                        <span className="font-bold text-red-600">-{formatCurrency(totalDebitosInquilino)}</span>
                      </div>
                    </div>

                    <div className="border-t border-blue-200/60 pt-3 flex justify-between items-center">
                      <div>
                        <p className="text-xs uppercase font-bold text-gray-500">Saldo Líquido:</p>
                        <p className="text-[11px] text-gray-500">
                          {saldoInquilino > 0 ? 'Entrará em Contas a Receber' : saldoInquilino < 0 ? 'Entrará em Contas a Pagar (Devolução)' : 'Quitado com a caução'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-black ${saldoInquilino > 0 ? 'text-red-600' : saldoInquilino < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                          {saldoInquilino > 0 
                            ? `${formatCurrency(saldoInquilino)} (A PAGAR)` 
                            : saldoInquilino < 0 
                            ? `${formatCurrency(Math.abs(saldoInquilino))} (A DEVOLVER)` 
                            : 'R$ 0,00 (QUITADO)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CARD LOCADOR */}
                  <div className="bg-gradient-to-br from-purple-50/70 to-slate-50 border border-purple-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-purple-200/50 pb-2">
                      <span className="font-bold text-sm text-purple-900">Balanço do Proprietário (Locador)</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                        {proprietario?.nome || 'Proprietário'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>(+) Créditos a Repassar (Multa / Aluguel):</span>
                        <span className="font-bold text-green-600">+{formatCurrency(totalAcrescimosLocador)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>(-) Descontos / Deduções do Proprietário:</span>
                        <span className="font-bold text-red-600">-{formatCurrency(totalDescontosLocador)}</span>
                      </div>
                    </div>

                    <div className="border-t border-purple-200/60 pt-3 flex justify-between items-center">
                      <div>
                        <p className="text-xs uppercase font-bold text-gray-500">Líquido a Repassar:</p>
                        <p className="text-[11px] text-gray-500">Entrará em Contas a Pagar</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-purple-900">
                          {formatCurrency(valorLiquidoLocador)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ COM BOTÕES */}
        {selectedContrato && itens.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>O sistema calculará as baixas e gerará os históricos de recebimento e repasse automaticamente.</span>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#F47B20] text-white rounded-xl font-bold hover:bg-[#e06915] transition-all shadow-md disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Processando Fechamento...' : 'Salvar Fechamento & Gravar Contas'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
