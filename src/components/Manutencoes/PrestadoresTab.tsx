import React, { useState } from 'react';
import { Prestador } from '../../types/manutencao';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

/* Componente placeholder detalhado para uso de Prestadores, já integrado com TS */
interface Props {
  prestadores: Prestador[];
  onAdd: (data: Partial<Prestador>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Prestador>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (p: Prestador) => void;
}

export default function PrestadoresTab({ prestadores, onAdd, onUpdate, onDelete, onEdit }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [prestadorToDelete, setPrestadorToDelete] = useState<string | null>(null);
  
  const filtered = prestadores.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.especialidades.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 animate-fade-in">
       <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou especialidade..."
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
              <th className="p-4 font-medium text-gray-500 text-sm">Contato</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Especialidades</th>
              <th className="p-4 font-medium text-gray-500 text-sm">Avaliação</th>
              <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum prestador encontrado.</td></tr>
            ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-bold text-[#1E2732]">{p.nome}</p>
                      <p className="text-xs text-gray-500">CNPJ/CPF: {p.cpfCnpj}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <Phone size={14} /> {p.telefone}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail size={14} /> {p.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.especialidades.map(e => (
                          <span key={e} className="bg-blue-50 text-blue-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            {e}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        <span className="font-medium text-[#1E2732]">{p.notaMedia.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({p.quantidadeServicos} serv.)</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onEdit?.(p)} className="p-2 text-gray-400 hover:text-[#F47B20] transition-colors" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => setPrestadorToDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
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
        isOpen={!!prestadorToDelete}
        title="Excluir Prestador"
        message="Tem certeza que deseja remover este prestador? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (prestadorToDelete) {
             onDelete(prestadorToDelete);
             setPrestadorToDelete(null);
          }
        }}
        onCancel={() => setPrestadorToDelete(null)}
      />
    </div>
  )
}
