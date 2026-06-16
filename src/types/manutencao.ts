export interface Prestador {
  id: string;
  nome: string;
  razaoSocial?: string;
  cpfCnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  dadosBancarios?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    chavePix?: string;
  };
  especialidades: string[]; // Elétrica, Hidráulica, etc
  notaMedia: number; // Avaliação do profissional (0-5)
  quantidadeServicos: number;
  dataCadastro: string;
}

export type StatusChamado = 'Aberto' | 'Em análise' | 'Aguardando aprovação' | 'Aguardando orçamento' | 'Prestador acionado' | 'Visita agendada' | 'Em execução' | 'Aguardando material' | 'Concluído' | 'Cancelado';

export type PrioridadeChamado = 'Baixa' | 'Média' | 'Alta' | 'Emergencial';

export interface SolicitanteChamado {
  tipo: 'Locatário' | 'Proprietário' | 'Administrador' | 'Outro';
  nome: string;
  cpfCnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
}

export interface DisponibilidadeChamado {
  dias: string[];
  horarios: string[];
  observacoes: string;
}

export interface HistoricoChamado {
  id: string;
  data: string;
  usuario: string; // Quem alterou
  acao: string; // Mudança de status, comentário, etc.
  observacao?: string;
}

export interface Chamado {
  id: string;
  numero: number;
  dataAbertura: string;
  imovelId: string;
  contratoId?: string;
  
  // Solicitante
  solicitante: SolicitanteChamado;
  
  // Classificação
  categoria: string;
  subcategoria: string;
  prioridade: PrioridadeChamado;
  
  // Descrição
  descricao: string;
  impacto: string[];
  
  // Anexos (URLs ou caminhos)
  anexos: string[];
  
  // Atendimento
  disponibilidade: DisponibilidadeChamado;
  autorizacaoEntrada: 'Acompanhada' | 'Sem presença' | 'Agendamento prévio';
  
  // Controle Interno
  responsabilidadeAparente: string;
  aprovacaoOrcamento: 'Automática' | 'Obrigatória Proprietário' | 'Obrigatória Locatário';
  valorAprovacaoAutomatica?: number;
  
  responsavelInterno: string;
  prestadorDesignadoId?: string;
  prazoAtendimentoDias?: number;
  dataPrevista?: string;
  
  status: StatusChamado;
  
  reaberto?: boolean;
  quantidadeReaberturas?: number;
  relatoConclusao?: string;
  
  orcamentos?: Orcamento[];
  ordensServico?: OrdemServico[];
  
  historico: HistoricoChamado[];
}

export interface Orcamento {
  id: string;
  chamadoId: string;
  prestadorId: string;
  valor: number;
  prazoDias: number;
  garantiaDias: number;
  escopo: string;
  status: 'Pendente' | 'Aprovado' | 'Reprovado';
  dataCadastro: string;
}

export interface OrdemServico {
  id: string;
  numero: number;
  chamadoId: string;
  prestadorId: string;
  dataPrevista: string;
  horarioAgendamento?: string;
  dataExecucao?: string;
  valorAprovado: number;
  garantiaDias: number;
  escopo: string;
  status: 'Agendado' | 'Em execução' | 'Concluído' | 'Cancelado';
}
