import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Inquilino {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  profissao: string;
  tipoGarantia: 'Fiador' | 'Seguro Fiança' | 'Caução' | 'Sem Garantia';
  dadosGarantia: string;
  enderecoAnterior: string;
  createdAt: string;
}

export default function Inquilinos() {
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGarantia, setFilterGarantia] = useState<string>('Todos');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Inquilino>();

  useEffect(() => {
    fetchInquilinos();
  }, []);

  const fetchInquilinos = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'inquilinos'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inquilino));
      
      // Ordenar por nome (alfabética)
      data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
      
      setInquilinos(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'inquilinos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Inquilino) => {
    try {
      if (editingId) {
        await updateDoc(doc(db, 'inquilinos', editingId), { ...data });
      } else {
        await addDoc(collection(db, 'inquilinos'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      reset();
      setEditingId(null);
      fetchInquilinos();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'inquilinos');
    }
  };

  const handleEdit = (inquilino: Inquilino) => {
    reset(inquilino);
    setEditingId(inquilino.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'inquilinos', confirmDelete));
      setConfirmDelete(null);
      fetchInquilinos();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inquilinos/${confirmDelete}`);
    }
  };

  const openNewModal = () => {
    reset({ tipoGarantia: 'Fiador' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const filteredInquilinos = inquilinos.filter(inq => {
    const matchesSearch = inq.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inq.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGarantia = filterGarantia === 'Todos' || inq.tipoGarantia === filterGarantia;
    return matchesSearch && matchesGarantia;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Inquilinos</h1>
          <p className="text-gray-500">Gerencie os locatários do sistema</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Novo Inquilino
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <input 
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
        />
        <select 
          value={filterGarantia}
          onChange={(e) => setFilterGarantia(e.target.value)}
          className="p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
        >
          <option value="Todos">Todas as Garantias</option>
          <option value="Fiador">Fiador</option>
          <option value="Seguro Fiança">Seguro Fiança</option>
          <option value="Caução">Caução</option>
          <option value="Sem Garantia">Sem Garantia</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-medium text-gray-500 text-sm">Nome</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Documento</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Contato</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Garantia</th>
                  <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquilinos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Nenhum inquilino encontrado.</td>
                  </tr>
                ) : (
                  filteredInquilinos.map((inq) => (
                    <tr key={inq.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-[#1E2732]">{inq.nome}</p>
                        <p className="text-xs text-gray-500">{inq.email}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{inq.documento}</td>
                      <td className="p-4 text-sm text-gray-600">{inq.telefone}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          {inq.tipoGarantia}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleEdit(inq)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(inq.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#1E2732]">
                {editingId ? 'Editar Inquilino' : 'Novo Inquilino'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
                  <input {...register('nome', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  {errors.nome && <span className="text-xs text-red-500">Campo obrigatório</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">CPF / CNPJ *</label>
                  <input {...register('documento', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Profissão</label>
                  <input {...register('profissao')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                  <input {...register('telefone')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" {...register('email')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Endereço Anterior</label>
                  <input {...register('enderecoAnterior')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de Garantia</label>
                  <select {...register('tipoGarantia')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                    <option value="Fiador">Fiador</option>
                    <option value="Seguro Fiança">Seguro Fiança</option>
                    <option value="Caução">Caução</option>
                    <option value="Título de capitalização">Título de capitalização</option>
                    <option value="Sem Garantia">Sem Garantia</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Dados da Garantia (Nome do fiador, valor caução, etc)</label>
                  <textarea {...register('dadosGarantia')} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"></textarea>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#1E2732] text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">
                  Salvar Inquilino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmDelete} 
        title="Excluir Inquilino" 
        message="Tem certeza que deseja excluir este inquilino? Esta ação não pode ser desfeita." 
        onConfirm={confirmDeleteAction} 
        onCancel={() => setConfirmDelete(null)} 
      />
    </div>
  );
}
