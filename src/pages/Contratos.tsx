import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format, differenceInDays, parseISO, setYear, getYear, isBefore, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Contrato {
  id: string;
  codigo: string;
  imovelId: string;
  proprietarioId: string;
  inquilinoId: string;
  dataInicio: string;
  dataTermino: string;
  prazoMeses: number;
  tipoGarantia: string;
  valorAluguel: number;
  indiceReajuste: 'IGP-M' | 'IPCA' | 'INPC' | 'Outro';
  diaVencimento: number;
  taxaAdministracao: number;
  taxasAdicionais: string;
  status: 'Ativo' | 'Encerrado' | 'Inadimplente';
  coInquilinosIds?: string[];
  coProprietariosIds?: string[];
  createdAt: string;
}

interface ReferenceData {
  id: string;
  nome?: string;
  codigo?: string;
  endereco?: string;
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [imoveis, setImoveis] = useState<ReferenceData[]>([]);
  const [proprietarios, setProprietarios] = useState<ReferenceData[]>([]);
  const [inquilinos, setInquilinos] = useState<ReferenceData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<Contrato>();
  const coInquilinosIds = watch('coInquilinosIds') || [];
  const coProprietariosIds = watch('coProprietariosIds') || [];

  const addCoInquilino = () => {
    setValue('coInquilinosIds', [...coInquilinosIds, '']);
  };

  const removeCoInquilino = (index: number) => {
    const newIds = [...coInquilinosIds];
    newIds.splice(index, 1);
    setValue('coInquilinosIds', newIds);
  };

  const updateCoInquilino = (index: number, value: string) => {
    const newIds = [...coInquilinosIds];
    newIds[index] = value;
    setValue('coInquilinosIds', newIds);
  };

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
      const [contratosSnap, imoveisSnap, propsSnap, inqsSnap] = await Promise.all([
        getDocs(collection(db, 'contratos')),
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'inquilinos'))
      ]);
      
      const fetchedContratos = contratosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contrato));
      // Ordenar por código em ordem crescente
      fetchedContratos.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }));
      
      const propsData = propsSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome } as ReferenceData));
      const inqsData = inqsSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome } as ReferenceData));
      const imosData = imoveisSnap.docs.map(doc => ({ id: doc.id, codigo: doc.data().codigo, endereco: doc.data().endereco } as ReferenceData));

      // Ordenar proprietários e inquilinos por nome (alfabética)
      propsData.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
      inqsData.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
      // Ordenar imóveis por código (ascendente)
      imosData.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' }));

      setContratos(fetchedContratos);
      setImoveis(imosData);
      setProprietarios(propsData);
      setInquilinos(inqsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'contratos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Contrato) => {
    try {
      const formattedData = {
        ...data,
        prazoMeses: Number(data.prazoMeses) || 0,
        valorAluguel: Number(data.valorAluguel) || 0,
        diaVencimento: Number(data.diaVencimento) || 1,
        taxaAdministracao: Number(data.taxaAdministracao) || 0,
        coInquilinosIds: (data.coInquilinosIds || []).filter(id => id !== ''),
        coProprietariosIds: (data.coProprietariosIds || []).filter(id => id !== '')
      };

      if (editingId) {
        await updateDoc(doc(db, 'contratos', editingId), formattedData);
      } else {
        await addDoc(collection(db, 'contratos'), {
          ...formattedData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      reset();
      setEditingId(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'contratos');
    }
  };

  const handleEdit = (contrato: Contrato) => {
    reset({
      ...contrato,
      dataInicio: contrato.dataInicio ? contrato.dataInicio.split('T')[0] : '',
      dataTermino: contrato.dataTermino ? contrato.dataTermino.split('T')[0] : '',
    });
    setEditingId(contrato.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'contratos', confirmDelete));
      setConfirmDelete(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contratos/${confirmDelete}`);
    }
  };

  const openNewModal = () => {
    // Gerar próximo código CT-xxxx
    let nextCodigo = 'CT-0001';
    if (contratos.length > 0) {
      const codigos = contratos
        .map(c => {
          const match = c.codigo.match(/CT-(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      
      if (codigos.length > 0) {
        const maxCodigo = Math.max(...codigos);
        nextCodigo = `CT-${(maxCodigo + 1).toString().padStart(4, '0')}`;
      }
    }

    reset({ 
      codigo: nextCodigo,
      status: 'Ativo', 
      indiceReajuste: 'IGP-M', 
      diaVencimento: 5, 
      taxaAdministracao: 10 
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getNome = (id: string, list: ReferenceData[]) => {
    return list.find(item => item.id === id)?.nome || 'Desconhecido';
  };

  const getImovelInfo = (id: string) => {
    const imovel = imoveis.find(item => item.id === id);
    return imovel ? `${imovel.codigo} - ${imovel.endereco}` : 'Desconhecido';
  };

  const filteredContratos = contratos.filter(contrato => {
    const imovelInfo = getImovelInfo(contrato.imovelId).toLowerCase();
    const inquilinoNome = getNome(contrato.inquilinoId, inquilinos).toLowerCase();
    const proprietarioNome = getNome(contrato.proprietarioId, proprietarios).toLowerCase();
    
    const matchesSearch = contrato.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          imovelInfo.includes(searchTerm.toLowerCase()) ||
                          inquilinoNome.includes(searchTerm.toLowerCase()) ||
                          proprietarioNome.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || contrato.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Contratos</h1>
          <p className="text-gray-500">Gestão de contratos de locação</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <input 
          type="text"
          placeholder="Buscar por contrato, imóvel, inquilino ou proprietário..."
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
          <option value="Ativo">Ativo</option>
          <option value="Encerrado">Encerrado</option>
          <option value="Inadimplente">Inadimplente</option>
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
                  <th className="p-4 font-medium text-gray-500 text-sm">Contrato</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Imóvel</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Inquilino / Proprietário</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Valores</th>
                  <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                  <th className="p-4 font-medium text-gray-500 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContratos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum contrato encontrado.</td>
                  </tr>
                ) : (
                  filteredContratos.map((contrato) => (
                    <tr key={contrato.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="font-medium text-[#1E2732]">{contrato.codigo}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {contrato.dataInicio ? format(new Date(contrato.dataInicio), 'dd/MM/yyyy') : ''} a {contrato.dataTermino ? format(new Date(contrato.dataTermino), 'dd/MM/yyyy') : ''}
                        </p>
                        
                        {/* Alertas Rápidos na Tabela */}
                        <div className="mt-2 space-y-1">
                          {(() => {
                            const hoje = new Date();
                            const alerts = [];
                            
                            // Vencimento
                            const dTermino = contrato.dataTermino ? parseISO(contrato.dataTermino) : null;
                            if (dTermino) {
                              const diff = differenceInDays(dTermino, hoje);
                              if (diff <= 40 && diff >= -30) {
                                alerts.push(
                                  <div key="venc" className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    diff <= 15 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                  }`}>
                                    <Clock size={10} /> 
                                    {diff < 0 ? `Vencido há ${Math.abs(diff)}d` : `Vence em ${diff}d`}
                                  </div>
                                );
                              }
                            }

                            // Reajuste
                            const dInicio = contrato.dataInicio ? parseISO(contrato.dataInicio) : null;
                            if (dInicio) {
                              let proximo = setYear(dInicio, getYear(hoje));
                              if (isBefore(proximo, hoje) && differenceInDays(hoje, proximo) > 30) {
                                proximo = addYears(proximo, 1);
                              }
                              const diffR = differenceInDays(proximo, hoje);
                              const meses = Math.floor(differenceInDays(hoje, dInicio) / 30);
                              if (meses >= 11 && diffR <= 40 && diffR >= -30) {
                                alerts.push(
                                  <div key="reaj" className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    diffR <= 15 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                  }`}>
                                    <AlertTriangle size={10} /> 
                                    {diffR < 0 ? `Reajuste atrasado ${Math.abs(diffR)}d` : `Reajuste em ${diffR}d`}
                                  </div>
                                );
                              }
                            }
                            return alerts;
                          })()}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700 truncate max-w-[200px]" title={getImovelInfo(contrato.imovelId)}>
                          {getImovelInfo(contrato.imovelId)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-[#1E2732] truncate max-w-[150px]" title={getNome(contrato.inquilinoId, inquilinos)}>
                          I: {getNome(contrato.inquilinoId, inquilinos)}
                          {contrato.coInquilinosIds && contrato.coInquilinosIds.length > 0 && ` (+${contrato.coInquilinosIds.length})`}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]" title={getNome(contrato.proprietarioId, proprietarios)}>
                          P: {getNome(contrato.proprietarioId, proprietarios)}
                          {contrato.coProprietariosIds && contrato.coProprietariosIds.length > 0 && ` (+${contrato.coProprietariosIds.length})`}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-[#1E2732]">{formatCurrency(contrato.valorAluguel)}</p>
                        <p className="text-xs text-gray-500">Venc: dia {contrato.diaVencimento}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          contrato.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                          contrato.status === 'Inadimplente' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {contrato.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleEdit(contrato)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(contrato.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#1E2732]">
                {editingId ? 'Editar Contrato' : 'Novo Contrato'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Coluna 1 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[#1E2732] border-b pb-2">Dados Principais</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Código *</label>
                      <input 
                        {...register('codigo', { required: true })} 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none bg-gray-50" 
                        placeholder="Ex: CT-001"
                        readOnly={!editingId}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Status *</label>
                      <select {...register('status')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                        <option value="Ativo">Ativo</option>
                        <option value="Encerrado">Encerrado</option>
                        <option value="Inadimplente">Inadimplente</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Imóvel *</label>
                    <select {...register('imovelId', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="">Selecione um imóvel</option>
                      {imoveis.map(i => (
                        <option key={i.id} value={i.id}>{i.codigo} - {i.endereco}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Proprietário Principal *</label>
                    <select {...register('proprietarioId', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="">Selecione um proprietário</option>
                      {proprietarios.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
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

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Inquilino Principal *</label>
                    <select {...register('inquilinoId', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                      <option value="">Selecione um inquilino</option>
                      {inquilinos.map(i => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Co-inquilinos (Opcional)</label>
                      <button 
                        type="button" 
                        onClick={addCoInquilino}
                        className="text-xs text-[#F47B20] font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Adicionar Co-inquilino
                      </button>
                    </div>
                    {coInquilinosIds.map((id, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select 
                          value={id}
                          onChange={(e) => updateCoInquilino(index, e.target.value)}
                          className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                        >
                          <option value="">Selecione um co-inquilino</option>
                          {inquilinos.map(i => (
                            <option key={i.id} value={i.id}>{i.nome}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => removeCoInquilino(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[#1E2732] border-b pb-2">Prazos e Valores</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Data Início *</label>
                      <input type="date" {...register('dataInicio', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Data Término *</label>
                      <input type="date" {...register('dataTermino', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Prazo (Meses)</label>
                      <input type="number" {...register('prazoMeses')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Dia Vencimento *</label>
                      <input type="number" min="1" max="31" {...register('diaVencimento', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Valor Aluguel (R$) *</label>
                      <input type="number" step="0.01" {...register('valorAluguel', { required: true })} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Taxa Adm. (%)</label>
                      <input type="number" step="0.00001" {...register('taxaAdministracao')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Índice Reajuste</label>
                      <select {...register('indiceReajuste')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none">
                        <option value="IGP-M">IGP-M</option>
                        <option value="IPCA">IPCA</option>
                        <option value="INPC">INPC</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Tipo Garantia</label>
                      <input {...register('tipoGarantia')} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-[#1E2732] text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmDelete} 
        title="Excluir Contrato" 
        message="Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita." 
        onConfirm={confirmDeleteAction} 
        onCancel={() => setConfirmDelete(null)} 
      />
    </div>
  );
}
