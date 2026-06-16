import React, { useState } from 'react';
import { X, Save, Upload, AlertTriangle, Clock } from 'lucide-react';
import { Chamado, SolicitanteChamado, DisponibilidadeChamado, Orcamento, OrdemServico, Prestador } from '../../types/manutencao';
import { RelatorioEncerramentoPDF } from './RelatorioEncerramentoPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSave: (data: Partial<Chamado>) => Promise<void>;
  imoveis: Record<string, any>;
  inquilinos: Record<string, any>;
  proprietarios: Record<string, any>;
  contratos: Record<string, any>;
  prestadores: Prestador[];
  loading: boolean;
  initialData?: Partial<Chamado>;
}

const CATEGORIAS = {
  Elétrica: ['Tomadas', 'Disjuntores', 'Curto-circuito', 'Chuveiro', 'Iluminação', 'Interfone'],
  Hidráulica: ['Vazamentos', 'Torneiras', 'Chuveiros', 'Vasos sanitários', "Caixa d'água", 'Esgoto'],
  Pintura: ['Interna', 'Externa', 'Infiltrações'],
  Marcenaria: ['Portas', 'Armários', 'Janelas'],
  Serralheria: ['Portões', 'Grades', 'Corrimãos'],
  'Ar Condicionado': ['Instalação', 'Manutenção', 'Vazamento', 'Não liga'],
  Eletrodomésticos: ['Aquecedor', 'Coifa', 'Fogão', 'Forno'],
  Condomínio: ['Vazamentos externos', 'Áreas comuns', 'Elevadores'],
  Outros: ['Outros']
};

const IMPACTOS_OPCOES = [
  'Imóvel sem energia',
  'Imóvel sem água',
  'Imóvel sem internet',
  'Vazamento ativo',
  'Área interditada',
  'Sem impacto relevante'
];

export default function ChamadoFormModal({ onClose, onSave, imoveis, inquilinos, proprietarios, contratos, prestadores, loading, initialData }: Props) {
  const [novoImpacto, setNovoImpacto] = useState('');
  const [isAddingNovaCategoria, setIsAddingNovaCategoria] = useState(false);
  const [isAddingNovaSubcategoria, setIsAddingNovaSubcategoria] = useState(false);
  const [formData, setFormData] = useState<Partial<Chamado>>(initialData || {
    imovelId: '',
    solicitante: { tipo: 'Locatário', nome: '', cpfCnpj: '', telefone: '', whatsapp: '', email: '' },
    categoria: '',
    subcategoria: '',
    prioridade: 'Média',
    impacto: [],
    anexos: [],
    disponibilidade: { dias: [], horarios: [], observacoes: '' },
    autorizacaoEntrada: 'Acompanhada',
    responsabilidadeAparente: 'Em análise',
    aprovacaoOrcamento: 'Obrigatória Proprietário',
    valorAprovacaoAutomatica: 0,
    descricao: '',
    status: 'Aberto',
    historico: []
  });

  const autofillSolicitante = (imovelId: string, tipo: string) => {
    let newSolicitante = { ...formData.solicitante, tipo } as SolicitanteChamado;
    
    if (!imovelId) {
      setFormData(prev => ({ ...prev, solicitante: newSolicitante }));
      return;
    }

    if (tipo === 'Locatário') {
      const activeContract = Object.values(contratos).find(c => c.imovelId === imovelId && c.status === 'Ativo');
      if (activeContract && activeContract.inquilinoId) {
        const inq = inquilinos[activeContract.inquilinoId];
        if (inq) {
          newSolicitante = {
            ...newSolicitante,
            nome: inq.nome || '',
            cpfCnpj: inq.documento || inq.cpf || inq.cnpj || '',
            telefone: inq.telefone || '',
            whatsapp: inq.whatsapp || inq.telefone || '',
            email: inq.email || ''
          };
        }
      } else {
        newSolicitante = { ...newSolicitante, nome: '', cpfCnpj: '', telefone: '', whatsapp: '', email: '' };
      }
    } else if (tipo === 'Proprietário') {
      const imovel = imoveis[imovelId];
      if (imovel && imovel.proprietarioId) {
        const prop = proprietarios[imovel.proprietarioId];
        if (prop) {
          newSolicitante = {
            ...newSolicitante,
            nome: prop.nome || '',
            cpfCnpj: prop.documento || prop.cpf || prop.cnpj || '',
            telefone: prop.telefone || '',
            whatsapp: prop.whatsapp || prop.telefone || '',
            email: prop.email || ''
          };
        }
      } else {
        newSolicitante = { ...newSolicitante, nome: '', cpfCnpj: '', telefone: '', whatsapp: '', email: '' };
      }
    } else if (tipo === 'Administrador') {
      newSolicitante = { ...newSolicitante, nome: 'Morada Urbana', cpfCnpj: '52.098.528/0001-49', telefone: '', whatsapp: '', email: '' };
    } else {
      newSolicitante = { ...newSolicitante, nome: '', cpfCnpj: '', telefone: '', whatsapp: '', email: '' };
    }

    setFormData(prev => ({ ...prev, imovelId, solicitante: newSolicitante }));
  };

  const handleImpactoToggle = (impacto: string) => {
    const current = formData.impacto || [];
    if (current.includes(impacto)) {
      setFormData({ ...formData, impacto: current.filter(i => i !== impacto) });
    } else {
      setFormData({ ...formData, impacto: [...current, impacto] });
    }
  };

  const handleDiaToggle = (dia: string) => {
    const current = formData.disponibilidade?.dias || [];
    const updated = current.includes(dia) ? current.filter(d => d !== dia) : [...current, dia];
    setFormData({ ...formData, disponibilidade: { ...formData.disponibilidade!, dias: updated } });
  };

  const handleHorarioToggle = (horario: string) => {
    const current = formData.disponibilidade?.horarios || [];
    const updated = current.includes(horario) ? current.filter(h => h !== horario) : [...current, horario];
    setFormData({ ...formData, disponibilidade: { ...formData.disponibilidade!, horarios: updated } });
  };

   const handleAddOrcamento = () => {
    const newOrcamento: Orcamento = {
      id: crypto.randomUUID(),
      chamadoId: formData.id || '',
      prestadorId: '',
      valor: 0,
      prazoDias: 0,
      garantiaDias: 0,
      escopo: '',
      status: 'Pendente',
      dataCadastro: new Date().toISOString()
    };
    setFormData(prev => ({
      ...prev,
      orcamentos: [...(prev.orcamentos || []), newOrcamento]
    }));
  };

  const handleUpdateOrcamento = (id: string, field: keyof Orcamento, value: any) => {
    setFormData(prev => ({
      ...prev,
      orcamentos: prev.orcamentos?.map(orc => orc.id === id ? { ...orc, [field]: value } : orc)
    }));
  };

  const handleRemoveOrcamento = (id: string) => {
    setFormData(prev => ({
      ...prev,
      orcamentos: prev.orcamentos?.filter(orc => orc.id !== id)
    }));
  };

  const handleAddOrdem = () => {
    const newOrdem: OrdemServico = {
      id: crypto.randomUUID(),
      numero: Math.floor(Math.random() * 10000), // temp
      chamadoId: formData.id || '',
      prestadorId: '',
      dataPrevista: '',
      valorAprovado: 0,
      garantiaDias: 0,
      escopo: '',
      status: 'Agendado'
    };
    setFormData(prev => ({
      ...prev,
      ordensServico: [...(prev.ordensServico || []), newOrdem]
    }));
  };

  const handleUpdateOrdem = (id: string, field: keyof OrdemServico, value: any) => {
    setFormData(prev => ({
      ...prev,
      ordensServico: prev.ordensServico?.map(ord => ord.id === id ? { ...ord, [field]: value } : ord)
    }));
  };

  const handleRemoveOrdem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      ordensServico: prev.ordensServico?.filter(ord => ord.id !== id)
    }));
  };

  const handleSave = () => {
    const isEditing = !!initialData?.id;
    const historicoAtual = formData.historico || [];
    
    // Only add a new history entry if we're creating or if we want to log the update logic later (for now let's just preserve it if editing)
    const novoHistorico = isEditing ? historicoAtual : [{
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        usuario: 'Usuário Logado', 
        acao: 'Abertura do chamado'
    }];
    
    onSave({
      ...formData,
      historico: novoHistorico
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
        <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-gray-50">
          <div>
             <h2 className="text-xl font-bold text-[#1E2732]">Abertura de Chamado</h2>
             <p className="text-sm text-gray-500">Registre uma nova ocorrência de manutenção</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
           
           {/* Seção 1: Identificação do Imóvel */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">1. Identificação do Imóvel</h3>
             <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Imóvel</label>
                  <select 
                    value={formData.imovelId}
                    onChange={(e) => autofillSolicitante(e.target.value, formData.solicitante?.tipo || 'Locatário')}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  >
                    <option value="">Selecione...</option>
                    {Object.values(imoveis).map((imovel: any) => (
                      <option key={imovel.id} value={imovel.id}>
                        {imovel.nomeCondominio ? `${imovel.nomeCondominio} - ` : ''}{imovel.codigo && `[${imovel.codigo}] `}{imovel.endereco}, {imovel.numero} - {imovel.bairro}
                      </option>
                    ))}
                  </select>
               </div>
               
               {formData.imovelId && imoveis[formData.imovelId] && (
                 <div className="bg-gray-50 p-4 rounded-lg flex gap-4 text-sm text-gray-700">
                    <div><span className="font-semibold text-gray-500">Condomínio:</span><br/>{imoveis[formData.imovelId].nomeCondominio || '-'}</div>
                    <div><span className="font-semibold text-gray-500">Tipo:</span><br/>{imoveis[formData.imovelId].tipo}</div>
                 </div>
               )}
             </div>
           </section>

           {/* Seção 2: Identificação do Solicitante */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">2. Identificação do Solicitante</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Relação com o Imóvel</label>
                 <select 
                   value={formData.solicitante?.tipo}
                   onChange={(e) => autofillSolicitante(formData.imovelId || '', e.target.value)}
                   className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                 >
                   <option value="Locatário">Locatário</option>
                   <option value="Proprietário">Proprietário</option>
                   <option value="Administrador">Administrador</option>
                   <option value="Outro">Outro</option>
                 </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={formData.solicitante?.nome}
                    onChange={(e) => setFormData({...formData, solicitante: {...formData.solicitante!, nome: e.target.value}})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input 
                    type="text" 
                    value={formData.solicitante?.cpfCnpj}
                    onChange={(e) => setFormData({...formData, solicitante: {...formData.solicitante!, cpfCnpj: e.target.value}})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={formData.solicitante?.telefone}
                    onChange={(e) => setFormData({...formData, solicitante: {...formData.solicitante!, telefone: e.target.value}})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input 
                    type="text" 
                    value={formData.solicitante?.whatsapp}
                    onChange={(e) => setFormData({...formData, solicitante: {...formData.solicitante!, whatsapp: e.target.value}})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  />
               </div>
               <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={formData.solicitante?.email}
                    onChange={(e) => setFormData({...formData, solicitante: {...formData.solicitante!, email: e.target.value}})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  />
               </div>
             </div>
           </section>

           {/* Seção 4: Categoria do Chamado */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">4. Categoria e Urgência</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  {!isAddingNovaCategoria ? (
                    <select 
                      value={formData.categoria}
                      onChange={(e) => {
                        if (e.target.value === 'nova_categoria') {
                          setIsAddingNovaCategoria(true);
                          setFormData({...formData, categoria: '', subcategoria: ''});
                        } else {
                          setFormData({...formData, categoria: e.target.value, subcategoria: ''});
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                    >
                      <option value="">Selecione...</option>
                      {Object.keys(CATEGORIAS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      {(formData.categoria && !Object.keys(CATEGORIAS).includes(formData.categoria)) && (
                        <option value={formData.categoria}>{formData.categoria}</option>
                      )}
                      <option value="nova_categoria">+ Adicionar Nova Categoria</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        autoFocus
                        value={formData.categoria}
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                        placeholder="Nome da categoria..."
                        className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setIsAddingNovaCategoria(false)}
                        className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg bg-gray-50"
                        title="Voltar para lista"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
                  {!isAddingNovaSubcategoria ? (
                    <select 
                      value={formData.subcategoria}
                      onChange={(e) => {
                        if (e.target.value === 'nova_subcategoria') {
                          setIsAddingNovaSubcategoria(true);
                          setFormData({...formData, subcategoria: ''});
                        } else {
                          setFormData({...formData, subcategoria: e.target.value});
                        }
                      }}
                      disabled={!formData.categoria && !isAddingNovaCategoria}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none disabled:bg-gray-100"
                    >
                      <option value="">Selecione...</option>
                      {formData.categoria && (CATEGORIAS as any)[formData.categoria]?.map((sub: string) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      {(formData.subcategoria && formData.categoria && !((CATEGORIAS as any)[formData.categoria] || []).includes(formData.subcategoria)) && (
                        <option value={formData.subcategoria}>{formData.subcategoria}</option>
                      )}
                      <option value="nova_subcategoria">+ Adicionar Nova Subcategoria</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                       <input 
                        type="text"
                        autoFocus
                        value={formData.subcategoria}
                        onChange={(e) => setFormData({...formData, subcategoria: e.target.value})}
                        placeholder="Nome da subcategoria..."
                        className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setIsAddingNovaSubcategoria(false)}
                        className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg bg-gray-50"
                        title="Voltar para lista"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grau de Urgência</label>
                  <select 
                    value={formData.prioridade}
                    onChange={(e) => setFormData({...formData, prioridade: e.target.value as any})}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  >
                    <option value="Baixa">Baixa (Manutenção preventiva)</option>
                    <option value="Média">Média (Afeta o conforto)</option>
                    <option value="Alta">Alta (Imóvel parcialmente inutilizado)</option>
                    <option value="Emergencial">Emergencial (Risco de vida/Imóvel)</option>
                  </select>
               </div>
             </div>
           </section>

           {/* Seção 5: Descrição do Problema */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">5. Descrição do Problema</h3>
             <textarea 
                rows={4}
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Ex:: O que aconteceu? Quando começou? O problema é recorrente?"
                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
             />
           </section>

           {/* Seção 7: Impacto */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">7. Impacto</h3>
             <div className="flex flex-wrap gap-2 mb-3">
               {Array.from(new Set([...IMPACTOS_OPCOES, ...(formData.impacto || [])])).map(imp => (
                 <label key={imp} className={`px-4 py-2 rounded-full border text-sm cursor-pointer transition-colors ${formData.impacto?.includes(imp) ? 'bg-orange-100 border-orange-300 text-orange-800 font-medium' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                   <input 
                     type="checkbox" 
                     className="hidden" 
                     checked={formData.impacto?.includes(imp)} 
                     onChange={() => handleImpactoToggle(imp)}
                   />
                   {imp}
                 </label>
               ))}
             </div>
             <div className="flex gap-2">
               <input
                 type="text"
                 value={novoImpacto}
                 onChange={(e) => setNovoImpacto(e.target.value)}
                 placeholder="Outro impacto..."
                 className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     if (novoImpacto.trim()) {
                       const updated = [...(formData.impacto || []), novoImpacto.trim()];
                       setFormData({ ...formData, impacto: Array.from(new Set(updated)) });
                       setNovoImpacto('');
                     }
                   }
                 }}
               />
               <button 
                 type="button"
                 onClick={() => {
                   if (novoImpacto.trim()) {
                     const updated = [...(formData.impacto || []), novoImpacto.trim()];
                     setFormData({ ...formData, impacto: Array.from(new Set(updated)) });
                     setNovoImpacto('');
                   }
                 }}
                 className="px-3 py-2 bg-gray-100 border text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
               >
                 Adicionar
               </button>
             </div>
           </section>

           {/* Seção 9 e 10: Disponibilidade e Acesso */}
           <section className="space-y-4">
             <h3 className="text-lg font-semibold text-[#1E2732] border-b pb-2">Agendamento e Acesso</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dias Disponíveis</label>
                  <div className="flex gap-2">
                    {['Segunda a Sexta', 'Sábado'].map(dia => (
                       <label key={dia} className={`px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.disponibilidade?.dias?.includes(dia) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                         <input type="checkbox" className="hidden" checked={formData.disponibilidade?.dias?.includes(dia)} onChange={() => handleDiaToggle(dia)} />
                         {dia}
                       </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horários Disponíveis</label>
                  <div className="flex gap-2">
                    {['Manhã', 'Tarde', 'Integral'].map(hor => (
                       <label key={hor} className={`px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.disponibilidade?.horarios?.includes(hor) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                         <input type="checkbox" className="hidden" checked={formData.disponibilidade?.horarios?.includes(hor)} onChange={() => handleHorarioToggle(hor)} />
                         {hor}
                       </label>
                    ))}
                  </div>
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autorização de Entrada</label>
                <select 
                  value={formData.autorizacaoEntrada}
                  onChange={(e) => setFormData({...formData, autorizacaoEntrada: e.target.value as any})}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                >
                  <option value="Acompanhada">Autorizo entrada acompanhada</option>
                  <option value="Sem presença">Autorizo entrada sem minha presença</option>
                  <option value="Agendamento prévio">Necessário agendamento prévio</option>
                </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Observações de Acesso</label>
               <input 
                  type="text"
                  value={formData.disponibilidade?.observacoes}
                  onChange={(e) => setFormData({...formData, disponibilidade: {...formData.disponibilidade!, observacoes: e.target.value}})}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                  placeholder="Ex: Pegar chave na portaria com o João"
               />
             </div>
           </section>

           {/* Seção Nova: Relato de Conclusão */}
           <section className="space-y-4">
             <h3 className="text-sm font-bold text-[#1E2732] border-b border-gray-100 pb-2">
               Relato de Conclusão do Serviço
             </h3>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Descrição detalhada dos serviços executados e conclusão
               </label>
               <textarea 
                  value={formData.relatoConclusao || ''}
                  onChange={(e) => setFormData({...formData, relatoConclusao: e.target.value})}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none min-h-[100px]"
                  placeholder="Detalhamento do que foi feito pelo prestador para ser impresso no relatório final..."
               />
             </div>
           </section>

           {/* Seção 11 e 12: Controle (Uso Interno) */}
           <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-4">
             <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
               <AlertTriangle size={16} /> Controles Internos (Imobiliária)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-yellow-900 mb-1">Responsabilidade Aparente</label>
                  {!['Em análise', 'Locatário', 'Proprietário', 'Condomínio', 'Terceiros', 'Desgaste natural', 'Manutenção de rotina', 'Outro'].includes(formData.responsabilidadeAparente || 'Em análise') ? (
                     <div className="flex gap-2">
                        <input
                           type="text"
                           value={formData.responsabilidadeAparente}
                           onChange={(e) => setFormData({...formData, responsabilidadeAparente: e.target.value})}
                           className="w-full p-2.5 bg-white border border-yellow-300 rounded-lg outline-none"
                           placeholder="Especificar responsabilidade..."
                        />
                        <button 
                           onClick={() => setFormData({...formData, responsabilidadeAparente: 'Em análise'})}
                           className="px-3 py-2 text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg"
                        >
                           <X size={16} />
                        </button>
                     </div>
                  ) : (
                     <select 
                       value={formData.responsabilidadeAparente}
                       onChange={(e) => {
                         if (e.target.value === 'Outro') {
                           setFormData({...formData, responsabilidadeAparente: ''});
                         } else {
                           setFormData({...formData, responsabilidadeAparente: e.target.value});
                         }
                       }}
                       className="w-full p-2.5 bg-white border border-yellow-300 rounded-lg outline-none"
                     >
                       <option value="Em análise">Em análise</option>
                       <option value="Locatário">Locatário</option>
                       <option value="Proprietário">Proprietário</option>
                       <option value="Condomínio">Condomínio</option>
                       <option value="Terceiros">Terceiros</option>
                       <option value="Desgaste natural">Desgaste natural</option>
                       <option value="Manutenção de rotina">Manutenção de rotina</option>
                       <option value="Outro">Outro (Especificar)</option>
                     </select>
                  )}
               </div>
               <div>
                  <label className="block text-sm font-medium text-yellow-900 mb-1">Aprovação de Orçamento</label>
                  <select 
                    value={formData.aprovacaoOrcamento}
                    onChange={(e) => setFormData({...formData, aprovacaoOrcamento: e.target.value as any})}
                    className="w-full p-2.5 bg-white border border-yellow-300 rounded-lg outline-none"
                  >
                    <option value="Obrigatória Proprietário">Obrigatória Proprietário</option>
                    <option value="Obrigatória Locatário">Obrigatória Locatário</option>
                    <option value="Automática">Aprovação automática</option>
                  </select>
               </div>
               {formData.aprovacaoOrcamento === 'Automática' && (
                  <div>
                    <label className="block text-sm font-medium text-yellow-900 mb-1">Valor Limite Automático (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.valorAprovacaoAutomatica}
                      onChange={(e) => setFormData({...formData, valorAprovacaoAutomatica: Number(e.target.value)})}
                      className="w-full p-2.5 bg-white border border-yellow-300 rounded-lg outline-none"
                    />
                  </div>
               )}
             </div>
           </div>

           {/* Orçamentos */}
           <section className="space-y-4">
             <div className="flex justify-between items-center border-b pb-2">
               <h3 className="text-lg font-semibold text-[#1E2732]">Orçamentos</h3>
               <button onClick={handleAddOrcamento} className="text-sm text-[#F47B20] font-medium hover:text-[#d96a1b] bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                 + Adicionar Orçamento
               </button>
             </div>
             
             {formData.orcamentos?.map((orc, index) => (
               <div key={orc.id} className="bg-white border rounded-xl p-4 space-y-4 shadow-sm relative">
                 <button onClick={() => handleRemoveOrcamento(orc.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500">
                   <X size={16} />
                 </button>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Prestador</label>
                     <select value={orc.prestadorId} onChange={e => handleUpdateOrcamento(orc.id, 'prestadorId', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none">
                       <option value="">Selecione um prestador</option>
                       {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Valor (R$)</label>
                     <input 
                       type="text" 
                       value={orc.valor ? orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} 
                       onChange={e => {
                         const val = e.target.value.replace(/\D/g, '');
                         const numVal = Number(val) / 100;
                         handleUpdateOrcamento(orc.id, 'valor', numVal);
                       }} 
                       className="w-full p-2.5 border rounded-lg outline-none" 
                     />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Status</label>
                     <select value={orc.status} onChange={e => handleUpdateOrcamento(orc.id, 'status', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none">
                       <option value="Pendente">Pendente</option>
                       <option value="Aprovado">Aprovado</option>
                       <option value="Reprovado">Reprovado</option>
                     </select>
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-sm text-gray-600 mb-1">Escopo</label>
                     <textarea rows={2} value={orc.escopo} onChange={e => handleUpdateOrcamento(orc.id, 'escopo', e.target.value)} className="w-full p-2 border rounded-lg outline-none" placeholder="Detalhes do orçamento..."></textarea>
                   </div>
                 </div>
               </div>
             ))}
             {(!formData.orcamentos || formData.orcamentos.length === 0) && (
               <p className="text-sm text-gray-500 italic">Nenhum orçamento cadastrado.</p>
             )}
           </section>

           {/* Ordens de Serviço */}
           <section className="space-y-4">
             <div className="flex justify-between items-center border-b pb-2">
               <h3 className="text-lg font-semibold text-[#1E2732]">Ordens de Serviço (OS)</h3>
               <button onClick={handleAddOrdem} className="text-sm text-[#F47B20] font-medium hover:text-[#d96a1b] bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                 + Adicionar OS
               </button>
             </div>
             
             {formData.ordensServico?.map((ord, index) => (
               <div key={ord.id} className="bg-white border rounded-xl p-4 space-y-4 shadow-sm relative">
                 <button onClick={() => handleRemoveOrdem(ord.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500">
                   <X size={16} />
                 </button>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Prestador</label>
                     <select value={ord.prestadorId} onChange={e => handleUpdateOrdem(ord.id, 'prestadorId', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none">
                       <option value="">Selecione um prestador</option>
                       {prestadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Status</label>
                     <select value={ord.status} onChange={e => handleUpdateOrdem(ord.id, 'status', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none">
                       <option value="Agendado">Agendado</option>
                       <option value="Em execução">Em execução</option>
                       <option value="Concluído">Concluído</option>
                       <option value="Cancelado">Cancelado</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Data Prevista</label>
                     <input type="date" value={ord.dataPrevista} onChange={e => handleUpdateOrdem(ord.id, 'dataPrevista', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Horário Agendamento</label>
                     <input type="time" value={ord.horarioAgendamento || ''} onChange={e => handleUpdateOrdem(ord.id, 'horarioAgendamento', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Data Execução</label>
                     <input type="date" value={ord.dataExecucao} onChange={e => handleUpdateOrdem(ord.id, 'dataExecucao', e.target.value)} className="w-full p-2.5 border rounded-lg outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Valor Aprovado (R$)</label>
                     <input 
                       type="text" 
                       value={ord.valorAprovado ? ord.valorAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} 
                       onChange={e => {
                         const val = e.target.value.replace(/\D/g, '');
                         const numVal = Number(val) / 100;
                         handleUpdateOrdem(ord.id, 'valorAprovado', numVal);
                       }} 
                       className="w-full p-2.5 border rounded-lg outline-none" 
                     />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-sm text-gray-600 mb-1">Escopo Aprovado</label>
                     <textarea rows={2} value={ord.escopo} onChange={e => handleUpdateOrdem(ord.id, 'escopo', e.target.value)} className="w-full p-2 border rounded-lg outline-none" placeholder="Serviço a ser realizado..."></textarea>
                   </div>
                 </div>
               </div>
             ))}
             {(!formData.ordensServico || formData.ordensServico.length === 0) && (
               <p className="text-sm text-gray-500 italic">Nenhuma OS cadastrada.</p>
             )}
           </section>

           {formData.historico && formData.historico.length > 0 && (
             <section className="space-y-4 pt-4 border-t border-gray-100 pb-8">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-bold text-[#1E2732] flex items-center gap-2">
                   <Clock size={16} className="text-[#F47B20]" />
                   Linha do Tempo / Histórico
                 </h3>
                 {formData.quantidadeReaberturas && formData.quantidadeReaberturas > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                      {formData.quantidadeReaberturas} {formData.quantidadeReaberturas === 1 ? 'Reabertura' : 'Reaberturas'} registradas
                    </span>
                 )}
               </div>
               
               <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 mt-6">
                 {formData.historico.map((entry, index) => (
                   <div key={entry.id || index} className="relative pl-6">
                     <div className="absolute -left-[9px] top-1 bg-white p-1 rounded-full border-2 border-[#F47B20] shadow-sm">
                       <div className="w-2 h-2 bg-[#F47B20] rounded-full"></div>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                       <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-[#1E2732] text-sm flex items-center gap-2">
                            {entry.acao === 'Reabertura de chamado' && <AlertTriangle size={14} className="text-red-500" />}
                            {entry.acao}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                            {new Date(entry.data).toLocaleString()}
                          </span>
                       </div>
                       <p className="text-sm text-gray-600 border-l-2 border-gray-100 pl-3 py-1 mt-2">
                         {entry.observacao || `Responsável: ${entry.usuario}`}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             </section>
           )}

        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          
          {initialData?.id && (formData.status === 'Concluído' || formData.status === 'Cancelado') && (
            <button 
              disabled={loading}
              onClick={() => {
                const historicoEntry = {
                  id: crypto.randomUUID(),
                  data: new Date().toISOString(),
                  usuario: 'Usuário Logado', 
                  acao: 'Reabertura de chamado',
                  observacao: 'O chamado foi reaberto após ter sido encerrado.'
                };
                const reopenedData = { 
                  ...formData, 
                  status: 'Em análise' as any, 
                  reaberto: true,
                  quantidadeReaberturas: (formData.quantidadeReaberturas || 0) + 1,
                  historico: [...(formData.historico || []), historicoEntry]
                };
                setFormData(reopenedData);
                onSave(reopenedData);
              }}
              className="px-4 py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center gap-2"
            >
              Reabrir Chamado
            </button>
          )}

          {initialData?.id && formData.status !== 'Concluído' && formData.status !== 'Cancelado' && (
            <button 
              disabled={loading}
              onClick={() => {
                const finishedData = { ...formData, status: 'Concluído' as any };
                setFormData(finishedData);
                onSave(finishedData);
              }}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Encerrar Chamado
            </button>
          )}
          {initialData?.id && formData.status === 'Concluído' && (
            <PDFDownloadLink
              document={
                <RelatorioEncerramentoPDF 
                  chamado={formData as Chamado} 
                  imovel={imoveis[formData.imovelId || '']}
                  prestadores={prestadores} 
                />
              }
              fileName={`Relatorio_Encerramento_CH${String(formData.numero).padStart(4, '0')}.pdf`}
              className="px-4 py-2.5 bg-[#1E2732] text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              {/* @ts-ignore */}
              {({ loading }) => (loading ? 'Gerando...' : <><Download size={18} /> Baixar Relatório</>)}
            </PDFDownloadLink>
          )}
          <button 
            disabled={loading || !formData.imovelId || !formData.categoria || !formData.descricao} 
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#F47B20] text-white rounded-lg font-medium hover:bg-[#d96a1b] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {initialData?.id ? 'Salvar Alterações' : 'Salvar Chamado'}
          </button>
        </div>
      </div>
    </div>
  );
}

