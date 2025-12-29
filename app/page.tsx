'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function GSAFlowV156() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<any>(null);
  const [lancamentos, setLancamentos] = useState<any[]>([]);

  // Estados de Interface
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [editNomeEmpresa, setEditNomeEmpresa] = useState('');
  const [editMeta, setEditMeta] = useState(0);
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Busca o perfil com prioridade máxima
        const { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', session.user.id).single();
        if (prof) {
          setPerfil(prof);
          setEditNomeEmpresa(prof.nome_empresa);
          setEditMeta(prof.meta_faturamento);
        }
        carregarLancamentos();
      }
      setLoading(false);
    };
    sessionInit();
  }, []);

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  // --- LÓGICA DE SEGURANÇA BLOQUEANTE ---
  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const hoje = new Date();
  const dataExpiracao = perfil?.expira_em ? new Date(perfil.expira_em) : null;
  
  // Condição de Bloqueio: Não é admin E (perfil carregado E data vencida)
  const assinaturaVencida = user && !isAdmin && perfil && (dataExpiracao && hoje > dataExpiracao);

  // LOG DE AUDITORIA CRÍTICO
  console.log("🛡️ SEGURANÇA GSA:", {
    logado: !!user,
    admin: isAdmin,
    vencimento: perfil?.expira_em,
    bloquear: assinaturaVencida
  });

  // 1. ESTADO DE CARREGAMENTO
  if (loading) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-blue-500 font-black animate-pulse italic">
      GSA FLOW: VALIDANDO ACESSO...
    </div>
  );

  // 2. TELA DE LOGIN
  if (!user) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase">GSA FLOW</h1>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}); if (error) alert(error.message); else window.location.reload(); }} className="space-y-4 mt-10">
          <input type="email" placeholder="E-mail" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20">Acessar Cockpit</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-600 text-[9px] font-black uppercase underline">{isSignUp ? 'Voltar para Login' : 'Solicitar Acesso'}</button>
      </div>
    </div>
  );

  // 3. TELA DE TRAVA (Garantido que só aparece se vencer)
  if (assinaturaVencida) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center font-sans overflow-hidden">
      <div className="bg-zinc-900 border border-red-500/40 p-10 rounded-[3.5rem] w-full max-w-md shadow-[0_0_60px_rgba(239,68,68,0.2)] backdrop-blur-xl relative z-10">
        <div className="text-7xl mb-6">🔒</div>
        <h2 className="text-3xl font-black text-red-500 uppercase italic mb-4">Assinatura Expirada</h2>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed italic font-medium">
          O Cockpit detectou o fim da sua licença em {dataExpiracao?.toLocaleDateString('pt-BR')}.
        </p>
        <a href="https://www.mercadopago.com.br" className="block bg-blue-600 hover:bg-blue-500 p-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg transition-all active:scale-95">Renovar Agora</a>
        <button onClick={() => window.location.reload()} className="mt-6 text-zinc-600 text-[10px] font-black uppercase underline block w-full tracking-widest">Já realizei o pagamento</button>
      </div>
    </div>
  );

  // 4. BLOQUEIO DE SEGURANÇA ENQUANTO PERFIL NÃO CHEGA
  if (!perfil && !isAdmin) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-blue-500 font-black animate-pulse italic">
      GSA FLOW: SINCRONIZANDO PERFIL...
    </div>
  );

  // 5. COCKPIT (Apenas se passar por todas as travas acima)
  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  return (
    <div className="min-h-screen bg-[#06080a] text-zinc-300 p-4 sm:p-8 font-sans text-sm pb-24 overflow-x-hidden">
        <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
            <h1 className="text-3xl font-black text-blue-500 italic uppercase leading-none tracking-tighter">GSA FLOW</h1>
            <div className="flex items-center gap-6">
                <button onClick={() => setMostrarConfig(true)} className="text-lg hover:rotate-90 transition-all duration-500">⚙️</button>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-[9px] font-black uppercase text-zinc-600 hover:text-red-400 transition-colors">Sair</button>
            </div>
        </header>

        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl backdrop-blur-md">
                <p className="text-blue-500 text-[9px] font-black uppercase mb-1 tracking-widest">Entradas</p>
                <h2 className="text-3xl font-black italic text-white">{formatarMoeda(totalReceitas)}</h2>
            </div>
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl backdrop-blur-md">
                <p className="text-red-500 text-[9px] font-black uppercase mb-1 tracking-widest">Saídas</p>
                <h2 className="text-3xl font-black italic text-white">{formatarMoeda(totalDespesas)}</h2>
            </div>
            <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl backdrop-blur-md">
                <p className="text-zinc-500 text-[9px] font-black uppercase mb-1 tracking-widest">Saldo Atual</p>
                <h2 className={`text-3xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroLiquido)}</h2>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-12 bg-zinc-900/20 rounded-[4rem] border border-white/5 border-dashed text-center">
             <p className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.6em] italic">Cockpit de Inteligência Ativo</p>
             <p className="text-blue-500/40 text-[9px] mt-2 font-black uppercase tracking-widest">GSA Business Intelligence - Nível Total</p>
        </div>
    </div>
  );
}