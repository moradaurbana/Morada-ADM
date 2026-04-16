import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  FileText,
  DollarSign,
  Bell,
  ArrowRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, differenceInDays, setYear, getYear, addYears, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [metrics, setMetrics] = useState({
    recebidoMes: 0,
    repassadoMes: 0,
    inadimplencia: 0,
    contratosAtivos: 0,
    receitaImobiliaria: 0
  });

  const [alertSummary, setAlertSummary] = useState({ reajustes: 0, vencimentos: 0 });
  const navigate = useNavigate();

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const yearStr = selectedYear.toString();

      // Buscar contratos ativos
      const contratosRef = collection(db, 'contratos');
      const qContratos = query(contratosRef, where('status', '==', 'Ativo'));
      const contratosSnap = await getDocs(qContratos);
      const contratosAtivos = contratosSnap.size;

      // Buscar cobranças
      const cobrancasRef = collection(db, 'cobrancas');
      const cobrancasSnap = await getDocs(cobrancasRef);
      
      let recebidoAno = 0;
      let inadimplenciaAno = 0;
      const cobrancasPorMes: Record<string, { recebido: number, inadimplencia: number }> = {};
      
      cobrancasSnap.forEach(doc => {
        const data = doc.data();
        if (data.mesReferencia.endsWith('/' + yearStr)) {
          const mes = data.mesReferencia.split('/')[0];
          if (!cobrancasPorMes[mes]) cobrancasPorMes[mes] = { recebido: 0, inadimplencia: 0 };
          
          if (data.status === 'Pago') {
            recebidoAno += data.valorTotal || 0;
            cobrancasPorMes[mes].recebido += data.valorTotal || 0;
          } else if (data.status === 'Atrasado' || (data.status === 'Pendente' && new Date(data.dataVencimento) < new Date())) {
            inadimplenciaAno += data.valorTotal || 0;
            cobrancasPorMes[mes].inadimplencia += data.valorTotal || 0;
          }
        }
      });

      // Buscar repasses
      const repassesRef = collection(db, 'repasses');
      const repassesSnap = await getDocs(repassesRef);
      
      let repassadoAno = 0;
      let receitaImobiliariaAno = 0;
      const repassesPorMes: Record<string, { repassado: number, receita: number }> = {};

      repassesSnap.forEach(doc => {
        const data = doc.data();
        if (data.mesReferencia.endsWith('/' + yearStr)) {
          const mes = data.mesReferencia.split('/')[0];
          if (!repassesPorMes[mes]) repassesPorMes[mes] = { repassado: 0, receita: 0 };
          
          if (data.status === 'Pago') {
            repassadoAno += data.valorLiquido || 0;
            receitaImobiliariaAno += data.taxaAdministracao || 0;
            repassesPorMes[mes].repassado += data.valorLiquido || 0;
            repassesPorMes[mes].receita += data.taxaAdministracao || 0;
          }
        }
      });

      setMetrics({
        recebidoMes: recebidoAno,
        repassadoMes: repassadoAno,
        inadimplencia: inadimplenciaAno,
        contratosAtivos,
        receitaImobiliaria: receitaImobiliariaAno
      });

      // Prepare chart data for 12 months
      const chartDataReal = Array.from({ length: 12 }).map((_, i) => {
        const mes = (i + 1).toString().padStart(2, '0');
        return {
          name: format(new Date(selectedYear, i), 'MMM', { locale: ptBR }).replace('.', ''),
          inadimplencia: cobrancasPorMes[mes]?.inadimplencia || 0,
          receita: repassesPorMes[mes]?.receita || 0,
          contratosAtivos: contratosAtivos,
          recebido: cobrancasPorMes[mes]?.recebido || 0,
          repassado: repassesPorMes[mes]?.repassado || 0
        };
      });

      setChartData(chartDataReal);

      // Calcular Alertas (40 dias)
      const hoje = new Date();
      let reajustesAlert = 0;
      let vencimentosAlert = 0;

      contratosSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        
        // Vencimento
        const dataTermino = parseISO(data.dataTermino);
        const diasTermino = differenceInDays(dataTermino, hoje);
        if (diasTermino <= 40 && diasTermino >= -30) vencimentosAlert++;

        // Reajuste
        const dataInicio = parseISO(data.dataInicio);
        let proximoAniv = setYear(dataInicio, getYear(hoje));
        if (isBefore(proximoAniv, hoje) && differenceInDays(hoje, proximoAniv) > 30) {
          proximoAniv = addYears(proximoAniv, 1);
        }
        const diasReajuste = differenceInDays(proximoAniv, hoje);

        // Regra de supressão (mesma de Alertas.tsx)
        let jaAjustado = false;
        if (data.lastAdjustmentDate) {
          const ultimaData = parseISO(data.lastAdjustmentDate);
          if (getYear(ultimaData) === getYear(proximoAniv) || isAfter(ultimaData, subMonths(proximoAniv, 1))) {
            jaAjustado = true;
          }
        }

        const mesesDesdeInicio = Math.floor(differenceInDays(hoje, dataInicio) / 30);
        if (!jaAjustado && mesesDesdeInicio >= 11 && diasReajuste <= 40 && diasReajuste >= -30) reajustesAlert++;
      });

      setAlertSummary({ reajustes: reajustesAlert, vencimentos: vencimentosAlert });

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'dashboard_metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2732]">Dashboard Gerencial</h1>
          <p className="text-gray-500">Visão geral do ano de {selectedYear}</p>
        </div>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#F47B20]"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const year = new Date().getFullYear() - i;
            return <option key={year} value={year}>{year}</option>;
          })}
        </select>
      </div>

      {(alertSummary.reajustes > 0 || alertSummary.vencimentos > 0) && (
        <div 
          onClick={() => navigate('/alertas')}
          className="bg-white border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-orange-50/30 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-full animate-pulse">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="font-bold text-[#1E2732]">Alertas de Gestão (Próximos 40 dias)</h3>
              <p className="text-sm text-gray-500">
                Existem <span className="font-bold text-orange-600">{alertSummary.reajustes} reajustes</span> e <span className="font-bold text-red-600">{alertSummary.vencimentos} vencimentos</span> necessitando tratativa.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#F47B20] font-bold text-sm">
            Ver detalhes
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          title="Recebido no Ano" 
          value={formatCurrency(metrics.recebidoMes)} 
          icon={TrendingUp} 
          color="text-green-600" 
          bgColor="bg-green-100"
        />
        <MetricCard 
          title="Repassado" 
          value={formatCurrency(metrics.repassadoMes)} 
          icon={TrendingDown} 
          color="text-blue-600" 
          bgColor="bg-blue-100"
        />
        <MetricCard 
          title="Inadimplência" 
          value={formatCurrency(metrics.inadimplencia)} 
          icon={AlertCircle} 
          color="text-red-600" 
          bgColor="bg-red-100"
        />
        <MetricCard 
          title="Receita (Taxas)" 
          value={formatCurrency(metrics.receitaImobiliaria)} 
          icon={DollarSign} 
          color="text-[#F47B20]" 
          bgColor="bg-orange-100"
        />
        <MetricCard 
          title="Contratos Ativos" 
          value={metrics.contratosAtivos.toString()} 
          icon={FileText} 
          color="text-gray-700" 
          bgColor="bg-gray-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1E2732] mb-6">Inadimplência, Receita e Contratos Ativos ({selectedYear})</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="inadimplencia" name="Inadimplência" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receita" name="Receita" fill="#F47B20" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contratosAtivos" name="Contratos Ativos" fill="#1E2732" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1E2732] mb-6">Recebido vs Repassado ({selectedYear})</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="recebido" name="Recebido" fill="#1E2732" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repassado" name="Repassado" fill="#F47B20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bgColor }: { title: string, value: string, icon: any, color: string, bgColor: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#1E2732]">{value}</p>
    </div>
  );
}
