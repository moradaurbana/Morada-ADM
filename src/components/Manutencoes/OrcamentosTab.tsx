import React, { useState } from 'react';
import { Orcamento, Chamado, Prestador } from '../../types/manutencao';
import { Search, Edit2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface Props {
  orcamentos: Orcamento[];
  chamados: Chamado[];
  prestadores: Prestador[];
  onAdd: (data: Partial<Orcamento>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Orcamento>) => Promise<void>;
}

export default function OrcamentosTab({ orcamentos, chamados, prestadores, onAdd, onUpdate }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = orcamentos.filter(o => 
    prestadores.find(p => p.id === o.prestadorId)?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar orçamentos por prestador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-medium text-gray-500 text-sm">Prestador</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Chamado</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Condições</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Valor</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
              <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
               <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum orçamento encontrado.</td></tr>
            ) : (
                filtered.map(o => {
                  const prestador = prestadores.find(p => p.id === o.prestadorId);
                  const chamado = chamados.find(c => c.id === o.chamadoId);
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-bold text-[#1E2732]">{prestador?.nome}</p>
                        <p className="text-xs text-gray-500">{new Date(o.dataCadastro).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                         <p className="text-sm font-medium text-[#1E2732]">CH-{chamado?.numero?.toString().padStart(4, '0')}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-600 mb-1">Prazo: {o.prazoDias} dias</p>
                        <p className="text-xs text-gray-500">Garantia: {o.garantiaDias} dias</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[#1E2732]">{formatCurrency(o.valor)}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          o.status === 'Aprovado' ? 'bg-green-100 text-green-700' :
                          o.status === 'Reprovado' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-[#F47B20] transition-colors" title="Ver detalhes">
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
