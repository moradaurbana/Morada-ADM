import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus } from 'lucide-react';
import { Chamado, Prestador, OrdemServico, Orcamento } from '../types/manutencao';

import DashboardManutencao from '../components/Manutencoes/DashboardManutencao';
import ChamadosTab from '../components/Manutencoes/ChamadosTab';
import PrestadoresTab from '../components/Manutencoes/PrestadoresTab';
import ChamadoFormModal from '../components/Manutencoes/ChamadoFormModal';
import PrestadorFormModal from '../components/Manutencoes/PrestadorFormModal';
import ManutencoesRelatoriosTab from '../components/Manutencoes/ManutencoesRelatoriosTab';

export default function GestaoManutencoes() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chamados' | 'prestadores' | 'relatorios'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Entities from existing collections
  const [imoveis, setImoveis] = useState<Record<string, any>>({});
  const [inquilinos, setInquilinos] = useState<Record<string, any>>({});
  const [proprietarios, setProprietarios] = useState<Record<string, any>>({});
  const [contratos, setContratos] = useState<Record<string, any>>({});
  
  // Specific data for maintenance
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [imovSnap, inqSnap, propSnap, contSnap] = await Promise.all([
        getDocs(collection(db, 'imoveis')),
        getDocs(collection(db, 'inquilinos')),
        getDocs(collection(db, 'proprietarios')),
        getDocs(collection(db, 'contratos'))
      ]);

      const imovMap: Record<string, any> = {};
      imovSnap.forEach(d => { imovMap[d.id] = { id: d.id, ...d.data() }; });
      setImoveis(imovMap);

      const inqMap: Record<string, any> = {};
      inqSnap.forEach(d => { inqMap[d.id] = { id: d.id, ...d.data() }; });
      setInquilinos(inqMap);

      const propMap: Record<string, any> = {};
      propSnap.forEach(d => { propMap[d.id] = { id: d.id, ...d.data() }; });
      setProprietarios(propMap);

      const contMap: Record<string, any> = {};
      contSnap.forEach(d => { contMap[d.id] = { id: d.id, ...d.data() }; });
      setContratos(contMap);

      const prestSnap = await getDocs(collection(db, 'prestadores'));
      setPrestadores(prestSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prestador)));

      const chamadosSnap = await getDocs(collection(db, 'chamados_manutencao'));
      setChamados(chamadosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chamado)));

    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.LIST, 'gestao_manutencoes');
    } finally {
      setLoading(false);
    }
  };

  const [isAddChamadoModalOpen, setIsAddChamadoModalOpen] = useState(false);
  const [editingChamado, setEditingChamado] = useState<Chamado | null>(null);
  const [isAddPrestadorModalOpen, setIsAddPrestadorModalOpen] = useState(false);
  const [editingPrestador, setEditingPrestador] = useState<Prestador | null>(null);

  // Example handlers for basic implementation
  const handleAddChamado = async (data: Partial<Chamado>) => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'chamados_manutencao'), {
        ...data,
        numero: chamados.length + 1,
        dataAbertura: new Date().toISOString(),
        status: data.status || 'Aberto',
      });
      setIsAddChamadoModalOpen(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chamado');
      setLoading(false);
    }
  };

  const handleUpdateChamado = async (id: string, data: Partial<Chamado>) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'chamados_manutencao', id), data);
      setIsAddChamadoModalOpen(false);
      setEditingChamado(null);
      fetchData();
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'chamado');
       setLoading(false);
    }
  };

  const onEditChamado = (chamado: Chamado) => {
    setEditingChamado(chamado);
    setIsAddChamadoModalOpen(true);
  };

  const handleDeleteChamado = async (id: string) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'chamados_manutencao', id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'chamado');
      setLoading(false);
    }
  };

  const handleAddPrestador = async (data: Partial<Prestador>) => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'prestadores'), {
        ...data,
        notaMedia: 0,
        quantidadeServicos: 0,
        dataCadastro: new Date().toISOString()
      });
      setIsAddPrestadorModalOpen(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prestador');
      setLoading(false);
    }
  };
  
  const handleUpdatePrestador = async (id: string, data: Partial<Prestador>) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'prestadores', id), data);
      setIsAddPrestadorModalOpen(false);
      setEditingPrestador(null);
      fetchData();
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, 'prestador');
       setLoading(false);
    }
  };
  
  const onEditPrestador = (prestador: Prestador) => {
    setEditingPrestador(prestador);
    setIsAddPrestadorModalOpen(true);
  };
  
  const handleDeletePrestador = async (id: string) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'prestadores', id));
      fetchData();
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, 'prestador');
       setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Serviços e Reparos</h1>
          <p className="text-gray-500">Controle integrado de serviços, chamados e ordens de serviço</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'chamados' && (
            <button onClick={() => { setEditingChamado(null); setIsAddChamadoModalOpen(true); }} className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium">
              <Plus size={18} /> Novo Chamado
            </button>
          )}
          {activeTab === 'prestadores' && (
            <button onClick={() => { setEditingPrestador(null); setIsAddPrestadorModalOpen(true); }} className="bg-[#F47B20] text-white px-4 py-2 rounded-lg hover:bg-[#d96a1b] transition-colors flex items-center gap-2 font-medium">
              <Plus size={18} /> Novo Prestador
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'dashboard' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Visão Geral
          {activeTab === 'dashboard' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'chamados' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('chamados')}
        >
          Chamados
          {activeTab === 'chamados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'prestadores' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('prestadores')}
        >
          Prestadores
          {activeTab === 'prestadores' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
        <button
          className={`pb-3 px-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'relatorios' ? 'text-[#F47B20]' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('relatorios')}
        >
          Relatórios
          {activeTab === 'relatorios' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F47B20] rounded-t-full" />}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 font-medium animate-pulse">Carregando dados...</div>
      ) : (
        <div className="mt-4">
          {activeTab === 'dashboard' && <DashboardManutencao chamados={chamados} prestadores={prestadores} />}
          {activeTab === 'chamados' && <ChamadosTab chamados={chamados} imoveis={imoveis} inquilinos={inquilinos} proprietarios={proprietarios} onAdd={handleAddChamado} onUpdate={handleUpdateChamado} onEdit={onEditChamado} onDelete={handleDeleteChamado} />}
          {activeTab === 'prestadores' && <PrestadoresTab prestadores={prestadores} onAdd={handleAddPrestador} onUpdate={handleUpdatePrestador} onDelete={handleDeletePrestador} onEdit={onEditPrestador} />}
          {activeTab === 'relatorios' && <ManutencoesRelatoriosTab />}
        </div>
      )}

      {isAddChamadoModalOpen && (
        <ChamadoFormModal 
          onClose={() => { setIsAddChamadoModalOpen(false); setEditingChamado(null); }}
          onSave={editingChamado ? (data) => handleUpdateChamado(editingChamado.id, data) : handleAddChamado}
          imoveis={imoveis}
          inquilinos={inquilinos}
          proprietarios={proprietarios}
          contratos={contratos}
          prestadores={prestadores}
          loading={loading}
          initialData={editingChamado || undefined}
        />
      )}

      {isAddPrestadorModalOpen && (
        <PrestadorFormModal 
          onClose={() => { setIsAddPrestadorModalOpen(false); setEditingPrestador(null); }}
          onSave={editingPrestador ? (data) => handleUpdatePrestador(editingPrestador.id, data) : handleAddPrestador}
          loading={loading}
          initialData={editingPrestador || undefined}
        />
      )}
    </div>
  );
}
