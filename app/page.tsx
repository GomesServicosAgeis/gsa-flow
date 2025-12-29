'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

export default function GSAFlowV125() {
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
  const [abaAtiva, setAbaAtiva] = useState<'mes' | 'ano'>('mes');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoComprovante, setNovoComprovante] = useState('');
  const [novoParcelas, setNovoParcelas] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [editNomeEmpresa, setEditNomeEmpresa] = useState('');
  const [editMeta, setEditMeta] = useState(0);
  const [novaCatInput, setNovaCatInput] = useState('');

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
      setEditNomeEmpresa(prof.nome_empresa);
      setEditMeta(prof.meta_faturamento);
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
            data_vencimento: novaData, categoria: novaCategoria, 
            user_id: user.id, comprovante_url: novoComprovante || null
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

  async function enviarFeedback() {
    if (!feedback) return;
    setEnviandoFeedback(true);
    await supabase.from('feedbacks').insert({ user_id: user.id, user_email: user.email, mensagem: feedback });
    alert("Feedback enviado!"); setFeedback(''); setEnviandoFeedback(false);
  }

  if (loading) return <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic">GSA FLOW</div>;

  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const assinaturaVencida = !isAdmin && perfil.expira_em && new Date(perfil.expira_em) < new Date();

  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const itensAtrasadosGeral = lancamentos.filter(i => i.status !== 'confirmado' && new Date(i.data_vencimento + 'T00:00:00') < hoje);

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

  if (!user) return (/* Tela de Login */ null);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24">
      
      {/* ALERTA GLOBAL */}
      {itensAtrasadosGeral.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 bg-red-600/10 border border-red-500/30 p-4 rounded-2xl flex justify-between items-center">
           <p className="text-[10px] font-black uppercase text-red-500">⚠️ {itensAtrasadosGeral.length} pendências atrasadas.</p>
           <button onClick={() => setDataVisualizacao(new Date(itensAtrasadosGeral[0].data_vencimento + 'T00:00:00'))} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase">Resolver</button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-blue-500 italic uppercase">GSA FLOW</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="px-4 py-2 bg-zinc-900 rounded-full text-[9px] font-black uppercase text-zinc-600">Sair</button>
      </header>

      {/* CARDS */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]"><p className="text-blue-400 text-[8px] font-black uppercase">Entradas</p><h2 className="text-2xl font-black italic">R$ {totalReceitas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem]"><p className="text-red-400 text-[8px] font-black uppercase">Saídas</p><h2 className="text-2xl font-black italic">R$ {totalDespesas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-zinc-500 text-[8px] font-black uppercase">Saldo</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {lucroLiquido.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-[2rem] border-dashed text-center"><p className="text-zinc-600 text-[8px] font-black uppercase">Meta</p><h2 className="text-2xl font-black italic text-zinc-400">R$ {perfil.meta_faturamento.toLocaleString('pt-BR')}</h2></div>
      </div>

      {/* GRÁFICOS & PROGRESSO */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* 📉 BARRA DE PROGRESSO CORRIGIDA (CONTAINER MENOR E ALINHADO) */}
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2rem] flex flex-col justify-center h-full">
            <div className="flex justify-between items-end mb-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Progresso Financeiro</p>
              <p className="text-blue-500 text-xs font-black italic">{porcentagemMeta}%</p>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/50 shadow-inner">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                  style={{ width: `${Math.min(porcentagemMeta, 100)}%` }} 
                />
            </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[300px] w-full flex items-center justify-center">
          {gastosPorCategoria.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gastosPorCategoria} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                  {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-700 text-[8px] font-black uppercase tracking-widest">Sem dados no mês</p>
          )}
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className={`max-w-6xl mx-auto p-6 rounded-[2.5rem] border mb-10 shadow-2xl ${idEmEdicao ? 'bg-blue-600/10 border-blue-500' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'entrada' ? 'bg-blue-600' : 'text-zinc-600'}`}>Receita</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'saida' ? 'bg-red-600' : 'text-zinc-600'}`}>Saída</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white font-black uppercase" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {perfil.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white font-black" value={novoParcelas} onChange={e => setNovoParcelas(Number(e.target.value))}>
            <option value={1}>Único</option><option value={2}>2x</option><option value={6}>6x</option><option value={12}>12x</option>
          </select>
          <input type="text" placeholder="Link" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 text-white font-black h-12 rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">Lançar no Cockpit</button>
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="max-w-6xl mx-auto space-y-2 mb-20">
        {lancamentosDoMes.map((item) => {
          const eConfirmado = item.status === 'confirmado';
          const estaAtrasado = !eConfirmado && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          return (
            <div key={item.id} className={`flex justify-between items-center p-5 rounded-[1.8rem] border transition-all ${eConfirmado ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60' : estaAtrasado ? 'bg-red-500/10 border-red-500/40 animate-pulse-slow' : 'bg-zinc-900/10 border-zinc-800/40'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-[9px] font-mono px-3 py-1.5 rounded-lg ${estaAtrasado ? 'bg-red-500 text-white' : 'bg-zinc-800/50 text-zinc-500'}`}>{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div>
                  <p className={`font-bold ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.descricao}</p>
                  <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{item.categoria}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={`font-black text-lg ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>R$ {Number(item.valor).toLocaleString('pt-BR')}</span>
                {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest">Pagar</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* FEEDBACK */}
      <footer className="max-w-6xl mx-auto border-t border-zinc-900 pt-10">
        <div className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-3xl border border-zinc-800/50">
            <input className="flex-1 bg-transparent px-4 text-[11px] text-zinc-400 outline-none" placeholder="Feedback rápido..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <button onClick={enviarFeedback} className="bg-zinc-800 text-white px-6 py-2 rounded-2xl text-[9px] font-black uppercase">Enviar</button>
        </div>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse-red { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); } 50% { border-color: rgba(239, 68, 68, 0.9); } }
        .animate-pulse-slow { animation: pulse-red 2s infinite; }
      `}</style>
    </div>
  );
}