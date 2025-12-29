'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

export default function GSAFlowV128() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState({ 
    nome_empresa: 'GSA FLOW', 
    meta_faturamento: 10000, 
    categorias: ['Freelancer', 'Pessoal', 'Transporte', 'Fixos', 'Contas'],
    expira_em: null as string | null
  });

  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoComprovante, setNovoComprovante] = useState('');
  const [novoParcelas, setNovoParcelas] = useState(1);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  useEffect(() => {
    const sessionInit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) carregarDadosSaaS(session.user.id);
      setLoading(false);
    };
    sessionInit();
  }, []);

  async function carregarDadosSaaS(userId: string) {
    let { data: prof } = await supabase.from('perfis_usuarios').select('*').eq('id', userId).single();
    if (prof) {
      setPerfil(prof);
    } else {
      const dataExp = new Date(); dataExp.setDate(dataExp.getDate() + 3);
      const { data: nProf } = await supabase.from('perfis_usuarios').insert({ id: userId, expira_em: dataExp.toISOString() }).select().single();
      if (nProf) setPerfil(nProf);
    }
    carregarLancamentos();
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const valLimpo = Number(novoValor.toString().replace(',', '.'));
    const dataBase = new Date(novaData + 'T00:00:00');

    if (idEmEdicao) {
        await supabase.from('lancamentos').update({ 
            descricao: novaDescricao, valor: valLimpo, tipo: novoTipo, 
            data_vencimento: novaData, categoria: novaCategoria, user_id: user.id
        }).eq('id', idEmEdicao);
    } else {
        const novos = [];
        for (let i = 0; i < novoParcelas; i++) {
            const d = new Date(dataBase); d.setMonth(dataBase.getMonth() + i);
            novos.push({
                descricao: `${novaDescricao} ${novoParcelas > 1 ? `(${i + 1}/${novoParcelas})` : ''}`.trim(),
                valor: valLimpo, tipo: novoTipo, data_vencimento: d.toISOString().split('T')[0],
                categoria: novaCategoria, user_id: user.id, status: 'agendado'
            });
        }
        await supabase.from('lancamentos').insert(novos);
    }
    setNovaDescricao(''); setNovoValor(''); setIdEmEdicao(null); setNovoParcelas(1); carregarLancamentos();
  };

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const porcentagemMeta = perfil.meta_faturamento > 0 ? Math.round((totalReceitas / perfil.meta_faturamento) * 100) : 0;

  const gastosPorCategoria = perfil.categorias.map(cat => ({
    name: cat,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat).reduce((acc, i) => acc + (Number(i.valor) || 0), 0)
  })).filter(item => item.value > 0);

  const dadosCincoMeses = Array.from({ length: 5 }, (_, i) => {
    const offset = i - 2;
    const dataRef = new Date(anoVis, mesVis + offset, 1);
    const mIdx = dataRef.getMonth();
    const aIdx = dataRef.getFullYear();
    const mesItems = lancamentos.filter(l => {
        const d = new Date(l.data_vencimento + 'T00:00:00');
        return d.getMonth() === mIdx && d.getFullYear() === aIdx;
    });
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(dataRef),
      receita: mesItems.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + (Number(l.valor) || 0), 0),
      despesa: mesItems.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
    };
  });

  if (!user && !loading) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md">
        <h1 className="text-4xl font-black text-blue-500 mb-10 italic uppercase tracking-tighter">GSA FLOW</h1>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}); if (error) alert(error.message); else window.location.reload(); }} className="space-y-4">
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">{isSignUp ? 'Criar Conta' : 'Entrar'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-500 text-[9px] font-black uppercase">{isSignUp ? 'Login' : 'Criar Conta'}</button>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic">GSA FLOW</div>;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-7xl mx-auto gap-4">
        <h1 className="text-3xl font-black text-blue-500 italic uppercase">GSA FLOW</h1>
        <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase">
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() - 1)))}>◀</button>
                <span className="min-w-[120px] text-center">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</span>
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() + 1)))}>▶</button>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="px-4 py-2 bg-zinc-900 rounded-full text-[9px] font-black uppercase text-zinc-600 border border-zinc-800">Sair</button>
        </div>
      </header>

      {/* CARDS VALORES SUPERIORES */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-blue-400 text-[8px] font-black uppercase mb-1">Entradas</p><h2 className="text-2xl font-black italic">R$ {totalReceitas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-red-400 text-[8px] font-black uppercase mb-1">Saídas</p><h2 className="text-2xl font-black italic">R$ {totalDespesas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-zinc-500 text-[8px] font-black uppercase mb-1">Saldo</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {lucroLiquido.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] border-dashed text-center"><p className="text-zinc-600 text-[8px] font-black uppercase mb-1">Meta</p><h2 className="text-2xl font-black italic text-zinc-400">R$ {perfil.meta_faturamento.toLocaleString('pt-BR')}</h2></div>
      </div>

      {/* 🚀 TRIPLE COCKPIT (FIXO E ESTÁVEL) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* BLOCO 1: BATERIA */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] h-[320px] flex flex-col items-center justify-between shadow-xl">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Battery Status</p>
            <div className="relative w-16 h-48 bg-zinc-950 rounded-2xl border-2 border-zinc-800 overflow-hidden shadow-inner">
                <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-700 to-blue-400 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.6)]"
                    style={{ height: `${Math.min(porcentagemMeta, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg font-black italic mix-blend-difference">{porcentagemMeta}%</span>
                </div>
            </div>
            <p className="text-blue-500 text-[8px] font-black uppercase tracking-widest italic">Meta Mensal</p>
        </div>

        {/* BLOCO 2: TENDÊNCIA */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] h-[320px] shadow-xl flex flex-col">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-4 text-center">Fluxo 5 Meses</p>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosCincoMeses}>
                        <Tooltip cursor={{fill: '#18181b'}} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                        <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} stroke="#52525b" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* BLOCO 3: CATEGORIAS */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] h-[320px] shadow-xl flex flex-col items-center">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-4 text-center">Categorias</p>
            <div className="flex-1 w-full">
                {gastosPorCategoria.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={gastosPorCategoria} innerRadius={50} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                                {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '9px' }} />
                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '8px', fontWeight: 'black', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-800 text-[8px] font-black uppercase">Vazio</div>
                )}
            </div>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className={`max-w-7xl mx-auto p-6 rounded-[2.5rem] border mb-10 shadow-2xl transition-all ${idEmEdicao ? 'bg-blue-600/10 border-blue-500' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'entrada' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Receita</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'saida' ? 'bg-red-600 text-white' : 'text-zinc-600'}`}>Saída</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white font-black uppercase outline-none" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {perfil.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white font-black" value={novoParcelas} onChange={e => setNovoParcelas(Number(e.target.value))}>
            <option value={1}>Único</option><option value={2}>2x</option><option value={6}>6x</option><option value={12}>12x</option>
          </select>
          <input type="text" placeholder="Comprovante" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none focus:border-blue-500" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor R$" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none font-mono" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 text-white font-black h-12 rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">Lançar no Cockpit</button>
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="max-w-7xl mx-auto space-y-2 mb-20">
        {lancamentosDoMes.map((item) => {
          const eConfirmado = item.status === 'confirmado';
          const estaAtrasado = !eConfirmado && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          return (
            <div key={item.id} className={`flex justify-between items-center p-5 rounded-[1.8rem] border transition-all ${eConfirmado ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60' : estaAtrasado ? 'bg-red-500/10 border-red-500/40 animate-pulse-slow' : 'bg-zinc-900/10 border-zinc-800/40'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-[9px] font-mono px-3 py-1.5 rounded-lg ${estaAtrasado ? 'bg-red-500 text-white' : 'bg-zinc-800/50 text-zinc-500'}`}>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div>
                  <p className={`font-bold ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.descricao}</p>
                  <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">{item.categoria}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={`font-black text-lg ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>R$ {Number(item.valor).toLocaleString('pt-BR')}</span>
                {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">Pagar</button>}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse-red { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); } 50% { border-color: rgba(239, 68, 68, 0.9); } }
        .animate-pulse-slow { animation: pulse-red 2s infinite; }
      `}</style>
    </div>
  );
}