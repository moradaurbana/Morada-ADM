import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Imovel {
  id: string;
  codigo: string;
  tipo: 'Apartamento' | 'Casa' | 'Comercial' | 'Outro';
  endereco: string;
  nomeCondominio?: string;
  cep: string;
  area: number;
  dormitorios: number;
  vagas: number;
  valorLocacao: number;
  valorCondominio: number;
  valorIptu: number;
  iptuAtivo: boolean;
  iptuNumParcelas: number;
  iptuMesInicio: number;
  caracteristicas: string;
  status: 'Disponível' | 'Locado' | 'Inativo';
  proprietarioId: string;
  coProprietariosIds?: string[];
  createdAt: string;
}

interface Proprietario {
  id: string;
  nome: string;
}

export default function Imoveis() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<Imovel>();
  const coProprietariosIds = watch('coProprietariosIds') || [];

  const addCoProprietario = () => {
    setValue('coProprietariosIds', [...coProprietariosIds, '']);
  };

  const removeCoProprietario = (index: number) => {
    const newIds = [...coProprietariosIds];
    newIds.splice(index, 1);
    setValue('coProprietariosIds', newIds);
  };

  const updateCoProprietario = (index: number, value: string) => {
    const newIds = [...coProprietariosIds];
    newIds[index] = value;
    setValue('coProprietariosIds', newIds);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [imoveisSnap, propsSnap] = await Promise.all([
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'proprietarios'))
      ]);
      
      setImoveis(imoveisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Imovel)));
      setProprietarios(propsSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome } as Proprietario)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'imoveis');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Imovel) => {
    try {
      // Converter strings para números onde necessário
      const formattedData = {
        ...data,
        area: Number(data.area) || 0,
        dormitorios: Number(data.dormitorios) || 0,
        vagas: Number(data.vagas) || 0,
        valorLocacao: Number(data.valorLocacao) || 0,
        valorCondominio: Number(data.valorCondominio) || 0,
        valorIptu: Number(data.valorIptu) || 0,
        iptuAtivo: data.iptuAtivo || false,
        iptuNumParcelas: Number(data.iptuNumParcelas) || 10,
        iptuMesInicio: Number(data.iptuMesInicio) || 2,
        coProprietariosIds: (data.coProprietariosIds || []).filter(id => id !== '')
      };

      if (editingId) {
        await updateDoc(doc(db, 'imoveis', editingId), formattedData);
      } else {
        await addDoc(collection(db, 'imoveis'), {
          ...formattedData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      reset();
      setEditingId(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'imoveis');
    }
  };

  const handleEdit = (imovel: Imovel) => {
    reset(imovel);
    setEditingId(imovel.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'imoveis', confirmDelete));
      setConfirmDelete(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `imoveis/${confirmDelete}`);
    }
  };

  const openNewModal = () => {
    reset({ tipo: 'Apartamento', status: 'Disponível' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getProprietarioName = (id: string) => {
    return proprietarios.find(p => p.id === id)?.nome || 'Desconhecido';
  };

  const filteredImoveis = imoveis.filter(imovel => {
    const matchesSearch = imovel.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          imovel.endereco.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || imovel.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Imóveis</h1>
          <p className="text-gray-500">Gerencie o portfólio de imóveis</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Novo Imóvel
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <input 
          type="text"
          placeholder="Buscar por código ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
        />
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
        >
          <option value="Todos">Todos os Status</option>
          <option value="Disponível">Disponível</option>
          <option value="Locado">Locado</option>
          <option value="Inativo">Inativo</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredImoveis.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100">
              Nenhum imóvel encontrado.
            </div>
          ) : (
            filteredImoveis.map((imovel) => (
              <div key={imovel.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        imovel.status === 'Disponível' ? 'bg-green-100 text-green-700' :
                        imovel.status === 'Locado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {imovel.status}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">COD: {imovel.codigo}</span>
                    </div>
                    <h3 className="font-bold text-[#1E2732] text-lg">{imovel.tipo}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(imovel)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(imovel.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    <p>{imovel.endereco}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-sm border-y border-gray-100 py-3">
                    <div>
                      <p className="text-gray-500 text-xs">Área</p>
                      <p className="font-medium text-[#1E2732]">{imovel.area}m²</p>
                    </div>
                    <div className="border-x border-gray-100">
                      <p className="text-gray-500 text-xs">Quartos</p>
                      <p className="font-medium text-[#1E2732]">{imovel.dormitorios}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Vagas</p>
                      <p className="font-medium text-[#1E2732]">{imovel.vagas}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Aluguel</span>
                      <span className="font-bold text-[#1E2732]">{formatCurrency(imovel.valorLocacao)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Condomínio</span>
                      <span className="font-medium text-gray-700">{formatCurrency(imovel.valorCondominio)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                      <span className="text-xs text-gray-400">Proprietário</span>
                      <span className="text-xs font-medium text-gray-600 truncate max-w-[150px]" title={getProprietarioName(imovel.proprietarioId)}>
                        {getProprietarioName(imovel.proprietarioId)}
                        {imovel.coProprietariosIds && imovel.coProprietariosIds.length > 0 && ` (+${imovel.coProprietariosIds.length})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#1E2732]">
                {editingId ? 'Editar Imóvel' : 'Novo Imóvel'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E2732] mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Código *</label>
                    <input {...register('codigo', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" placeholder="Ex: MU-001" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo *</label>
                    <select {...register('tipo')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Status *</label>
                    <select {...register('status')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="Disponível">Disponível</option>
                      <option value="Locado">Locado</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium text-gray-700">Proprietário Principal *</label>
                    <select {...register('proprietarioId', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="">Selecione um proprietário</option>
                      {proprietarios.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Co-proprietários (Opcional)</label>
                      <button 
                        type="button" 
                        onClick={addCoProprietario}
                        className="text-xs text-[#F47B20] font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Adicionar Co-proprietário
                      </button>
                    </div>
                    {coProprietariosIds.map((id, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select 
                          value={id}
                          onChange={(e) => updateCoProprietario(index, e.target.value)}
                          className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                        >
                          <option value="">Selecione um co-proprietário</option>
                          {proprietarios.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => removeCoProprietario(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E2732] mb-3">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium text-gray-700">Endereço Completo *</label>
                    <input {...register('endereco', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">CEP</label>
                    <input {...register('cep')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-4">
                    <label className="text-sm font-medium text-gray-700">Nome do Condomínio (Opcional)</label>
                    <input {...register('nomeCondominio')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" placeholder="Ex: Condomínio Morada do Sol" />
                  </div>
                </div>
              </div>

              {/* Características */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E2732] mb-3">Características</h3>
                <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Área (m²)</label>
                    <input type="number" step="0.01" {...register('area')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Dormitórios</label>
                    <input type="number" {...register('dormitorios')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Vagas</label>
                    <input type="number" {...register('vagas')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium text-gray-700">Outras Características</label>
                    <textarea {...register('caracteristicas')} rows={2} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" placeholder="Piscina, churrasqueira, etc..."></textarea>
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div>
                <h3 className="text-lg font-semibold text-[#1E2732] mb-3">Valores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Valor Locação (R$) *</label>
                    <input type="number" step="0.01" {...register('valorLocacao', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Condomínio (R$)</label>
                    <input type="number" step="0.01" {...register('valorCondominio')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">IPTU (R$)</label>
                    <input type="number" step="0.01" {...register('valorIptu')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" {...register('iptuAtivo')} id="iptuAtivo" className="w-4 h-4 text-[#F47B20] border-gray-300 rounded focus:ring-[#F47B20]" />
                    <label htmlFor="iptuAtivo" className="text-sm font-semibold text-[#1E2732]">Ativar cobrança automática de IPTU</label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Número de Parcelas</label>
                      <input type="number" {...register('iptuNumParcelas')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" placeholder="Ex: 10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Mês de Início (1-12)</label>
                      <select {...register('iptuMesInicio')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                        <option value="1">Janeiro</option>
                        <option value="2">Fevereiro</option>
                        <option value="3">Março</option>
                        <option value="4">Abril</option>
                        <option value="5">Maio</option>
                        <option value="6">Junho</option>
                        <option value="7">Julho</option>
                        <option value="8">Agosto</option>
                        <option value="9">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    * Se ativado, o valor do IPTU será incluído automaticamente nas cobranças geradas para os meses correspondentes.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#1E2732] text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">
                  Salvar Imóvel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmDelete} 
        title="Excluir Imóvel" 
        message="Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita." 
        onConfirm={confirmDeleteAction} 
        onCancel={() => setConfirmDelete(null)} 
      />
    </div>
  );
}
