import React, { useState } from 'react';
import { OrdemServico, Chamado, Prestador } from '../../types/manutencao';
import { Search, Edit2, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface Props {
  ordens: OrdemServico[];
  chamados: Chamado[];
  prestadores: Prestador[];
  onAdd: (data: Partial<OrdemServico>) => Promise<void>;
  onUpdate: (id: string, data: Partial<OrdemServico>) => Promise<void>;
}

export default function OrdensServicoTab({ ordens, chamados, prestadores, onAdd, onUpdate }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-blue-100 text-blue-700';
      case 'Em execução': return 'bg-orange-100 text-orange-700';
      case 'Concluído': return 'bg-green-100 text-green-700';
      case 'Cancelado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filtered = ordens.filter(o => 
    o.numero.toString().includes(searchTerm) ||
    prestadores.find(p => p.id === o.prestadorId)?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por OS ou prestador..."
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
              <th className="p-4 font-medium text-gray-500 text-sm">Nº OS / Chamado</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Prestador</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Datas</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Valor / Garantia</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
              <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
               <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma ordem de serviço encontrada.</td></tr>
            ) : (
                filtered.map(o => {
                  const prestador = prestadores.find(p => p.id === o.prestadorId);
                  const chamado = chamados.find(c => c.id === o.chamadoId);
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-bold text-[#1E2732]">OS-{o.numero.toString().padStart(4, '0')}</p>
                        <p className="text-xs text-gray-500">CH-{chamado?.numero?.toString().padStart(4, '0')}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-[#1E2732]">{prestador?.nome}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-gray-600">Prev.: {new Date(o.dataPrevista).toLocaleDateString()}</p>
                        {o.dataExecucao && <p className="text-xs text-green-600 mt-1">Exec.: {new Date(o.dataExecucao).toLocaleDateString()}</p>}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[#1E2732]">{formatCurrency(o.valorAprovado)}</p>
                        <p className="text-xs text-gray-500 mt-1">{o.garantiaDias} dias cob.</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-[#F47B20] transition-colors" title="Editar">
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
