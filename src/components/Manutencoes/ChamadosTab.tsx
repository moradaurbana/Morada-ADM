import React, { useState } from 'react';
import { Chamado } from '../../types/manutencao';
import { Search, Edit2, AlertCircle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

interface Props {
  chamados: Chamado[];
  imoveis: Record<string, any>;
  inquilinos: Record<string, any>;
  proprietarios: Record<string, any>;
  onAdd: (data: Partial<Chamado>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Chamado>) => Promise<void>;
  onEdit?: (chamado: Chamado) => void;
  onDelete?: (id: string) => void;
}

export default function ChamadosTab({ chamados, imoveis, inquilinos, proprietarios, onAdd, onUpdate, onEdit, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [chamadoToDelete, setChamadoToDelete] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-gray-100 text-gray-700';
      case 'Em análise': return 'bg-blue-100 text-blue-700';
      case 'Aguardando orçamento': return 'bg-purple-100 text-purple-700';
      case 'Aguardando aprovação': return 'bg-amber-100 text-amber-700';
      case 'Aprovado': return 'bg-green-100 text-green-700';
      case 'Agendado': return 'bg-indigo-100 text-indigo-700';
      case 'Em execução': return 'bg-orange-100 text-orange-700';
      case 'Concluído': return 'bg-green-100 text-green-700 border border-green-200';
      case 'Cancelado':
      case 'Reprovado':
      case 'Suspenso': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch(prioridade) {
      case 'Emergencial': return 'text-red-600 bg-red-50 border border-red-100';
      case 'Alta': return 'text-orange-600 bg-orange-50 border border-orange-100';
      case 'Média': return 'text-blue-600 bg-blue-50 border border-blue-100';
      case 'Baixa': return 'text-gray-600 bg-gray-50 border border-gray-100';
      default: return '';
    }
  };

  const filtered = chamados.filter(c => 
    c.categoria.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.numero.toString().includes(searchTerm) ||
    imoveis[c.imovelId]?.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número, categoria ou endereço..."
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
              <th className="p-4 font-medium text-gray-500 text-sm">Nº / Data</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Imóvel / Envolvidos</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Categoria / Prioridade</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
              <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum chamado encontrado.</td></tr>
            ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-bold text-[#1E2732]">CH-{c.numero.toString().padStart(4, '0')}</p>
                      <p className="text-xs text-gray-500">{new Date(c.dataAbertura).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-[#1E2732]">{imoveis[c.imovelId]?.endereco}</p>
                      <p className="text-xs text-gray-500 mt-1">Prop: {proprietarios[imoveis[c.imovelId]?.proprietarioId]?.nome}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#1E2732] mb-1">{c.categoria}</p>
                      <div className="flex items-center gap-1">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPrioridadeBadge(c.prioridade)}`}>
                           {c.prioridade}
                         </span>
                         {c.reaberto && (
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200" title="Chamado reincidente / reaberto">
                             REABERTO
                           </span>
                         )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onEdit?.(c)} className="p-2 text-gray-400 hover:text-[#F47B20] transition-colors" title="Visualizar/Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => setChamadoToDelete(c.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog 
        isOpen={!!chamadoToDelete}
        title="Excluir Chamado"
        message="Tem certeza que deseja excluir permanentemente este chamado? Esta ação não poderá ser desfeita e removerá também todos os históricos, orçamentos e ordens de serviço vinculadas a ele."
        onConfirm={() => {
          if (chamadoToDelete) {
             onDelete?.(chamadoToDelete);
             setChamadoToDelete(null);
          }
        }}
        onCancel={() => setChamadoToDelete(null)}
      />
    </div>
  )
}
