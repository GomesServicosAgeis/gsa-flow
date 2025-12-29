'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function GSAFlowV150() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);

  // Estados de Interface
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoParcelas, setNovoParcelas] = useState(1);
  const [novoComprovante, setNovoComprovante] = useState('');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [editNomeEmpresa, setEditNomeEmpresa] = useState('');
  const [editMeta, setEditMeta] = useState(0);
  const [novaCatInput, setNovaCatInput] = useState('');

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log("🔍 Iniciando busca de perfil para:", session.user.id);
        
        const { data: prof, error } = await supabase
          .from('perfis_usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) console.error("❌ Erro Supabase:", error.message);

        if (prof) {
          console.log("✅ Dados recebidos do banco:", prof);
          setPerfil(prof);
          setEditNomeEmpresa(prof.nome_empresa);
          setEditMeta(prof.meta_faturamento);
        } else {
          console.log("⚠️ Criando novo perfil trial...");
          const dataExp = new Date(); dataExp.setDate(dataExp.getDate() + 3);
          const { data: nProf } = await supabase.from('perfis_usuarios').insert({ 
            id: session.user.id, 
            expira_em: dataExp.toISOString(),
            nome_empresa: 'Nova Empresa GSA',
            categorias: ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'],
            meta_faturamento: 10000
          }).select().single();
          if (nProf) setPerfil(nProf);
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

  // --- LÓGICA DE TRAVA TOTAL ---
  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const hoje = new Date();
  const dataExpiracao = perfil?.expira_em ? new Date(perfil.expira_em) : null;
  
  // SE NÃO FOR ADMIN:
  // 1. Se o perfil ainda não carregou mas o loading acabou -> Bloqueia.
  // 2. Se a data de hoje for maior que a expiração -> Bloqueia.
  const deveBloquear = user && !isAdmin && (!dataExpiracao || hoje > dataExpiracao);

  console.log("📊 STATUS DA TRAVA:", {
    usuario: user?.email,
    isAdmin,
    dataExpiracao: perfil?.expira_em,
    bloquear: deveBloquear
  });

  if (loading) return <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic tracking-widest">GSA FLOW</div>;

  // --- RENDER DA TRAVA ---
  if (deveBloquear) {
    return (
      <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center font-sans overflow-hidden">
        <div className="bg-zinc-900 border border-red-500/40 p-10 rounded-[3.5rem] w-full max-w-md shadow-[0_0_60px_rgba(239,68,68,0.2)] backdrop-blur-xl relative z-10">
          <div className="text-7xl mb-6">🔒</div>
          <h2 className="text-3xl font-black text-red-500 uppercase italic mb-4 tracking-tighter">Acesso Expirado</h2>
          <p className="text-zinc-500 text-sm mb-10 leading-relaxed font-medium italic">
            A licença para <strong>{perfil?.nome_empresa || 'este cockpit'}</strong> expirou. <br/>
            Vencimento: {dataExpiracao ? dataExpiracao.toLocaleDateString('pt-BR') : 'Pendente'}.
          </p>
          <div className="space-y-4">
            <a href="https://www.mercadopago.com.br" className="block bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95">Renovar Agora</a>
            <button onClick={() => window.location.reload()} className="text-zinc-600 text-[10px] font-black uppercase underline hover:text-white transition-colors">Confirmar Pagamento</button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN ---
  if (!user) return (
    <div className="min-h-screen bg-[#06080a] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase tracking-tighter leading-none">GSA FLOW</h1>
        <p className="text-zinc-600 text-[9px] font-bold uppercase mb-10 tracking-[0.4em]">Business Intelligence</p>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}); if (error) alert(error.message); else window.location.reload(); }} className="space-y-4 text-left">
          <input type="email" placeholder="E-mail" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 text-white outline-none focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20">{isSignUp ? 'Criar Conta' : 'Acessar Cockpit'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-600 text-[9px] font-black uppercase tracking-widest">{isSignUp ? 'Já tem conta? Login' : 'Novo por aqui? Criar Acesso'}</button>
      </div>
    </div>
  );

  // --- RENDER COCKPIT (CASO NÃO ESTEJA BLOQUEADO) ---
  return (
    <div className="min-h-screen bg-[#06080a] text-zinc-300 p-4 sm:p-8 font-sans text-sm pb-24 overflow-x-hidden">
        {/* TODO O CÓDIGO DO COCKPIT QUE VOCÊ JÁ TEM - HEADER, CARDS, GRÁFICOS, LISTAGEM */}
        <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
             <h1 className="text-3xl font-black text-blue-500 italic uppercase leading-none tracking-tighter">GSA FLOW</h1>
             <div className="flex gap-4">
                <button onClick={() => setMostrarConfig(true)} className="text-lg">⚙️</button>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-[9px] font-black uppercase">Sair</button>
             </div>
        </header>
        <div className="max-w-7xl mx-auto text-center py-20 bg-zinc-900/20 rounded-[3rem] border border-white/5">
            <p className="text-blue-500 font-black italic text-xl">COCKPIT ATIVO: {perfil?.nome_empresa}</p>
            <p className="text-zinc-600 text-[10px] mt-4 uppercase tracking-widest">Bem-vindo, Danilo Sam. Sistema operando em nível total.</p>
        </div>
        {/* Adicione aqui o restante dos seus gráficos e formulários da versão anterior */}
    </div>
  );
}