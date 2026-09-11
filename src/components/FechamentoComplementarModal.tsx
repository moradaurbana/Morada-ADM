import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function FechamentoComplementarModal({ isOpen, onClose, onSuccess, contratos, imoveis, inquilinos, proprietarios, mesGeracao, anoGeracao }: any) {
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoTipo, setNovoTipo] = useState('ambos');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!novaDescricao || !novoValor) return;
    setItens([...itens, { 
      id: Date.now().toString(), 
      descricao: novaDescricao, 
      valor: parseFloat(novoValor),
      tipoApp: novoTipo
    }]);
    setNovaDescricao('');
    setNovoValor('');
  };

  const selectedContrato = contratos.find((c: any) => c.id === selectedContratoId);
  
  const handleSave = async () => {
    if (!selectedContrato) return;
    
    setLoading(true);
    try {
      const itensInquilino = itens
        .filter(i => i.tipoApp === 'ambos' || i.tipoApp === 'locatario')
        .map(i => ({ descricao: i.descricao, valor: i.valor, tipo: 'acrescimo', fazParteCondominio: false }));

      const itensLocador = itens.flatMap(i => {
        if (i.tipoApp === 'locador') {
          return [{ descricao: i.descricao, valor: i.valor, tipo: 'acrescimo', fazParteCondominio: false }];
        }
        if (i.tipoApp === 'locatario') {
          return [{ descricao: i.descricao, valor: i.valor, tipo: 'desconto', fazParteCondominio: false }];
        }
        return [];
      });

      const totalInquilino = itensInquilino.reduce((acc, i) => acc + i.valor, 0);
      const valorRecebido = totalInquilino;
      
      const totalDescontosLocador = itensLocador.reduce((acc, i) => acc + (i.tipo === 'desconto' ? i.valor : 0), 0);
      const totalAcrescimosLocador = itensLocador.reduce((acc, i) => acc + (i.tipo === 'acrescimo' ? i.valor : 0), 0);
      const valorLiquido = valorRecebido - totalDescontosLocador + totalAcrescimosLocador;

      const cobrancaRef = await addDoc(collection(db, 'cobrancas'), {
        contratoId: selectedContrato.id,
        inquilinoId: selectedContrato.inquilinoId,
        mesReferencia: `${mesGeracao}/${anoGeracao}`,
        dataVencimento: new Date().toISOString().split('T')[0],
        valorAluguel: 0,
        valorCondominio: 0,
        valorIptu: 0,
        taxasExtras: 0,
        itensAdicionais: itensInquilino,
        valorTotal: totalInquilino,
        status: 'Pendente',
        isComplementar: true,
        complementarRepasseData: {
          proprietarioId: selectedContrato.proprietarioId,
          mesReferencia: `${mesGeracao}/${anoGeracao}`,
          valorAluguel: 0,
          valorRecebido: valorRecebido,
          taxaAdministracao: 0,
          itensAdicionais: itensLocador,
          valorLiquido: valorLiquido
        }
      });

      alert('Fechamento complementar salvo com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fechamento complementar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-[#1E2732]">Fechamento Complementar</h2>
            <p className="text-sm text-gray-500">Gere uma prestação isolada apenas com as correções.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato</label>
            <select 
              value={selectedContratoId}
              onChange={e => setSelectedContratoId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F47B20]"
            >
              <option value="">Selecione um contrato...</option>
              {contratos.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {imoveis[c.imovelId]?.endereco} ({inquilinos[c.inquilinoId]?.nome})
                </option>
              ))}
            </select>
          </div>

          {selectedContrato && (
            <div className="space-y-4">
              <h3 className="font-bold text-[#1E2732] border-b pb-2">Adicionar Valores Avulsos</h3>
              
              <div className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 p-4 rounded-xl">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Locação Salão de Festas"
                    value={novaDescricao}
                    onChange={e => setNovaDescricao(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#F47B20]"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={novoValor}
                    onChange={e => setNovoValor(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#F47B20]"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cobrar de / Repassar a</label>
                  <select 
                    value={novoTipo}
                    onChange={e => setNovoTipo(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#F47B20]"
                  >
                    <option value="ambos">Ambos (Inquilino e Locador)</option>
                    <option value="locatario">Apenas Inquilino</option>
                    <option value="locador">Apenas Locador</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddItem}
                  className="p-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#e06915] transition-colors h-[42px] px-4 font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              {itens.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 text-xs font-semibold text-gray-600">Descrição</th>
                        <th className="p-3 text-xs font-semibold text-gray-600">Aplicação</th>
                        <th className="p-3 text-xs font-semibold text-gray-600 text-right">Valor</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-0">
                          <td className="p-3 text-sm text-gray-800">{item.descricao}</td>
                          <td className="p-3 text-sm text-gray-600">
                            {item.tipoApp === 'ambos' ? 'Locatário e Locador' : item.tipoApp === 'locatario' ? 'Apenas Locatário' : 'Apenas Locador'}
                          </td>
                          <td className="p-3 text-sm text-gray-800 text-right font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                          </td>
                          <td className="p-3">
                            <button 
                              onClick={() => setItens(itens.filter(i => i.id !== item.id))}
                              className="text-red-500 hover:text-red-700"
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
            </div>
          )}
        </div>

        {selectedContrato && itens.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#F47B20] text-white rounded-xl font-bold hover:bg-[#e06915] transition-colors shadow-sm disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Fechamento Complementar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
