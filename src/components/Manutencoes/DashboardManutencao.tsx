import React, { useMemo, useState } from 'react';
import { Chamado, Prestador, OrdemServico, Orcamento } from '../../types/manutencao';
import { CheckCircle, AlertCircle, Clock, Wrench, DollarSign, Filter } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface Props {
  chamados: Chamado[];
  prestadores: Prestador[];
}

const COLORS = ['#F47B20', '#1E2732', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function DashboardManutencao({ chamados, prestadores }: Props) {
  const [anoFiltro, setAnoFiltro] = useState<number>(new Date().getFullYear());

  const ordens = chamados.flatMap(c => c.ordensServico || []);
  
  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(c => new Date(c.dataAbertura).getFullYear() === anoFiltro);
  }, [chamados, anoFiltro]);

  const ordensFiltradas = useMemo(() => {
    return chamadosFiltrados.flatMap(c => c.ordensServico || []);
  }, [chamadosFiltrados]);

  const chamadosAbertos = chamadosFiltrados.filter(c => ['Aberto', 'Em análise'].includes(c.status)).length;
  const chamadosAndamento = chamadosFiltrados.filter(c => ['Aguardando orçamento', 'Aguardando aprovação', 'Aprovado', 'Agendado', 'Em execução'].includes(c.status)).length;
  const chamadosConcluidos = chamadosFiltrados.filter(c => c.status === 'Concluído').length;
  const chamadosEmergenciais = chamadosFiltrados.filter(c => c.prioridade === 'Emergencial' && c.status !== 'Concluído' && c.status !== 'Cancelado').length;

  const custoTotal = ordensFiltradas.filter(o => o.status === 'Concluído').reduce((acc, curr) => acc + curr.valorAprovado, 0);
  const prestadoresAtivos = prestadores.length;

  // Chart Data: Status
  const statusData = useMemo(() => {
    const counts = chamadosFiltrados.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [chamadosFiltrados]);

  // Chart Data: Categorias
  const categoriasData = useMemo(() => {
    const counts = chamadosFiltrados.reduce((acc, c) => {
      acc[c.categoria] = (acc[c.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [chamadosFiltrados]);

  // Chart Data: Evolução Mensal (Qtd e Custo)
  const evolucaoData = useMemo(() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = meses.map((nome, index) => ({ nome, chamados: 0, custo: 0, mesIndex: index }));

    chamadosFiltrados.forEach(c => {
      const dataAbertura = new Date(c.dataAbertura);
      const mes = dataAbertura.getMonth();
      data[mes].chamados += 1;

      c.ordensServico?.forEach(o => {
        if (o.status === 'Concluído') {
          data[mes].custo += (o.valorAprovado || 0);
        }
      });
    });

    return data;
  }, [chamadosFiltrados]);

  // Anos disponíveis para filtro
  const anosDisponiveis = useMemo(() => {
    const anos = chamados.map(c => new Date(c.dataAbertura).getFullYear());
    const uniqueAnos = Array.from(new Set([new Date().getFullYear(), ...anos])).sort((a, b) => b - a);
    return uniqueAnos;
  }, [chamados]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#1E2732] flex items-center gap-2">
          <Wrench className="text-[#F47B20]" size={20} />
          Painel Operacional
        </h2>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select 
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(Number(e.target.value))}
            className="text-sm outline-none bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-3 text-[#1E2732] font-medium"
          >
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-[#F47B20]/30 transition-all">
          <div>
            <p className="text-sm font-medium text-gray-500">Chamados Abertos</p>
            <p className="text-3xl font-black text-[#1E2732] mt-1">{chamadosAbertos}</p>
          </div>
          <div className="w-12 h-12 bg-gray-50 text-gray-400 group-hover:bg-[#F47B20]/10 group-hover:text-[#F47B20] rounded-xl flex items-center justify-center transition-all">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-amber-500/30 transition-all">
          <div>
            <p className="text-sm font-medium text-gray-500">Em Andamento</p>
            <p className="text-3xl font-black text-[#1E2732] mt-1">{chamadosAndamento}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-500/30 transition-all">
          <div>
            <p className="text-sm font-medium text-gray-500">Emergenciais</p>
            <p className="text-3xl font-black text-[#1E2732] mt-1 text-red-600">{chamadosEmergenciais}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
          <div>
            <p className="text-sm font-medium text-gray-500">Custo Total Executado</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(custoTotal)}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução Mensal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="font-bold text-[#1E2732] mb-6 text-sm uppercase tracking-wider">Volume de Manutenções x Custo (Ano {anoFiltro})</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <LineChart data={evolucaoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'custo') return [formatCurrency(value), 'Custo R$'];
                    return [value, 'Qtd. Chamados'];
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="chamados" name="Qtd. Chamados" stroke="#1E2732" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="custo" name="Custo R$" stroke="#F47B20" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Composição por Categoria */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="font-bold text-[#1E2732] mb-6 text-sm uppercase tracking-wider">Distribuição por Categoria</h3>
          <div className="flex-1 w-full flex items-center justify-center min-h-[300px]">
            {categoriasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoriasData}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoriasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value} chamados`, 'Quantidade']}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: 12, marginTop: 20 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">Nenhum dado com estas categorias para o ano.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Chamados por Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-[#1E2732] mb-6 text-sm uppercase tracking-wider">Volume por Status</h3>
          <div className="w-full min-h-[300px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#1E2732', fontWeight: 500 }} width={120} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#F47B20" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Concluído' ? '#10B981' : entry.name === 'Cancelado' ? '#EF4444' : entry.name === 'Aberto' ? '#3B82F6' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">Nenhum dado encontrado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo de Equipe / KPIs */}
         <div className="space-y-6">
            <div className="bg-[#1E2732] rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wrench size={100} />
               </div>
               <h3 className="font-bold text-[#F47B20] mb-6 text-sm uppercase tracking-wider">Métricas da Rede</h3>
               
               <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div>
                     <p className="text-gray-400 text-xs mb-1">Prestadores Ativos</p>
                     <p className="text-3xl font-bold">{prestadoresAtivos}</p>
                  </div>
                  <div>
                     <p className="text-gray-400 text-xs mb-1">Taxa de Conclusão</p>
                     <p className="text-3xl font-bold text-emerald-400">
                        {chamadosFiltrados.length > 0 ? `${Math.round((chamadosConcluidos / chamadosFiltrados.length) * 100)}%` : '0%'}
                     </p>
                  </div>
                  <div>
                     <p className="text-gray-400 text-xs mb-1">Ticket Médio (OS)</p>
                     <p className="text-3xl font-bold text-blue-400">
                        {ordensFiltradas.filter(o => o.status === 'Concluído').length > 0 
                           ? formatCurrency(custoTotal / ordensFiltradas.filter(o => o.status === 'Concluído').length) 
                           : 'R$ 0,00'}
                     </p>
                  </div>
                  <div>
                     <p className="text-gray-400 text-xs mb-1">Volume de OS</p>
                     <p className="text-3xl font-bold">{ordensFiltradas.length}</p>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-bold text-[#1E2732] mb-4 flex items-center gap-2">
               <Clock size={20} className="text-[#F47B20]" />
               Chamados Recentes (Últimos 5)
               </h3>
               <div className="space-y-3">
               {chamadosFiltrados.slice().sort((a,b) => new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime()).slice(0, 5).map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors">
                     <div>
                     <p className="font-semibold text-sm text-[#1E2732]">CH-{String(c.numero).padStart(4, '0')} - {c.categoria}</p>
                     <p className="text-xs text-gray-500 mt-0.5">{new Date(c.dataAbertura).toLocaleDateString()} • <span className="font-medium">{c.status}</span></p>
                     </div>
                     <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                     c.prioridade === 'Emergencial' ? 'bg-red-100 text-red-700' :
                     c.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' :
                     'bg-blue-100 text-blue-700'
                     }`}>
                     {c.prioridade}
                     </span>
                  </div>
               ))}
               {chamadosFiltrados.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhum chamado recente este ano.</p>
               )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

