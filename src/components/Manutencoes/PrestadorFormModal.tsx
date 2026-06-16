import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Prestador } from '../../types/manutencao';

interface Props {
  onClose: () => void;
  onSave: (data: Partial<Prestador>) => Promise<void>;
  loading: boolean;
  initialData?: Partial<Prestador>;
}

const ESPECIALIDADES_OPCOES = [
  'Elétrica', 'Hidráulica', 'Pintura', 'Marcenaria', 'Serralheria', 'Ar Condicionado', 'Eletrodomésticos', 'Geral', 'Limpeza'
];

export default function PrestadorFormModal({ onClose, onSave, loading, initialData }: Props) {
  const [novaEspecialidade, setNovaEspecialidade] = useState('');
  const [formData, setFormData] = useState<Partial<Prestador>>(initialData || {
    nome: '',
    razaoSocial: '',
    cpfCnpj: '',
    telefone: '',
    whatsapp: '',
    email: '',
    endereco: '',
    dadosBancarios: {
      banco: '',
      agencia: '',
      conta: '',
      chavePix: ''
    },
    notaMedia: 0,
    especialidades: []
  });

  // Ensure dadosBancarios is initialized if using old data
  if (!formData.dadosBancarios || typeof formData.dadosBancarios === 'string') {
    formData.dadosBancarios = { banco: '', agencia: '', conta: '', chavePix: '' };
  }

  const applyCpfCnpjMask = (value: string) => {
    value = value.replace(/\D/g, "");
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      value = value.replace(/^(\d{2})(\d)/, "$1.$2");
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value.substring(0, 18);
  };

  const handleEspecialidadeToggle = (esp: string) => {
    const current = formData.especialidades || [];
    if (current.includes(esp)) {
      setFormData({ ...formData, especialidades: current.filter(e => e !== esp) });
    } else {
      setFormData({ ...formData, especialidades: [...current, esp] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-fade-in">
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
           <div>
             <h2 className="text-xl font-bold text-[#1E2732]">{initialData?.id ? 'Editar Prestador' : 'Novo Prestador'}</h2>
             <p className="text-sm text-gray-500">Cadastre ou edite as informações do prestador de serviço</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
             <X size={20} className="text-gray-500" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia / Apelido</label>
                <input 
                  type="text" 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                <input 
                  type="text" 
                  value={formData.razaoSocial}
                  onChange={e => setFormData({...formData, razaoSocial: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF</label>
                <input 
                  type="text" 
                  value={formData.cpfCnpj}
                  onChange={e => setFormData({...formData, cpfCnpj: applyCpfCnpjMask(e.target.value)})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.from(new Set([...ESPECIALIDADES_OPCOES, ...(formData.especialidades || [])])).map(esp => (
                    <label key={esp} className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${formData.especialidades?.includes(esp) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.especialidades?.includes(esp)} 
                        onChange={() => handleEspecialidadeToggle(esp)}
                      />
                      {esp}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaEspecialidade}
                    onChange={(e) => setNovaEspecialidade(e.target.value)}
                    placeholder="Outra especialidade..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (novaEspecialidade.trim()) {
                          const updated = [...(formData.especialidades || []), novaEspecialidade.trim()];
                          setFormData({ ...formData, especialidades: Array.from(new Set(updated)) });
                          setNovaEspecialidade('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (novaEspecialidade.trim()) {
                        const updated = [...(formData.especialidades || []), novaEspecialidade.trim()];
                        setFormData({ ...formData, especialidades: Array.from(new Set(updated)) });
                        setNovaEspecialidade('');
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 border text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input 
                  type="text" 
                  value={formData.telefone}
                  onChange={e => setFormData({...formData, telefone: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input 
                  type="text" 
                  value={formData.whatsapp}
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input 
                  type="text" 
                  value={formData.endereco}
                  onChange={e => setFormData({...formData, endereco: e.target.value})}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none"
                />
             </div>
             <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-700">Dados Bancários</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                    <input 
                      type="text" 
                      value={typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios.banco : ''}
                      onChange={e => setFormData({...formData, dadosBancarios: { ...(typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios : {}), banco: e.target.value }})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                      placeholder="Ex: Nubank, Bradesco..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agência</label>
                    <input 
                      type="text" 
                      value={typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios.agencia : ''}
                      onChange={e => setFormData({...formData, dadosBancarios: { ...(typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios : {}), agencia: e.target.value }})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                      placeholder="Ex: 0001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Conta (com dígito)</label>
                    <input 
                      type="text" 
                      value={typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios.conta : ''}
                      onChange={e => setFormData({...formData, dadosBancarios: { ...(typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios : {}), conta: e.target.value }})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                      placeholder="Ex: 12345-6"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Chave PIX</label>
                    <input 
                      type="text" 
                      value={typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios.chavePix : ''}
                      onChange={e => setFormData({...formData, dadosBancarios: { ...(typeof formData.dadosBancarios === 'object' ? formData.dadosBancarios : {}), chavePix: e.target.value }})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F47B20] outline-none text-sm"
                      placeholder="CPF, E-mail, Telefone..."
                    />
                  </div>
                </div>
             </div>

             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Avaliação do Prestador (1 a 5 estrelas)</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.5"
                    value={formData.notaMedia || 0}
                    onChange={e => setFormData({...formData, notaMedia: Number(e.target.value)})}
                    className="flex-1 accent-[#F47B20]"
                  />
                  <span className="font-bold text-gray-700 w-12 text-center bg-gray-100 rounded-lg py-1 px-2">{formData.notaMedia || 0}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button 
            disabled={loading || !formData.nome} 
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 bg-[#F47B20] text-white rounded-lg font-medium hover:bg-[#d96a1b] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
