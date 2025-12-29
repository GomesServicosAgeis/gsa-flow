'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
// @ts-ignore
import { Parser } from 'json2csv';

export default function GSAFlowBrasilCompleto() {
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

  // Estados de Cadastro
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Freelancer');
  const [novoComprovante, setNovoComprovante] = useState('');

  // Config Perfil
  const [editNomeEmpresa, setEditNomeEmpresa] = useState('');
  const [editMeta, setEditMeta] = useState(0);
  const [novaCatInput, setNovaCatInput] = useState('');

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
      const { data: nProf } = await supabase.from('perfis_usuarios').insert({ 
        id: userId, expira_em: dataExp.toISOString() 
      }).select().single();
      if (nProf) setPerfil(nProf);
    }
    carregarLancamentos();
  }

  async function carregarLancamentos() {
    const { data } = await supabase.from('lancamentos').select('*');
    if (data) setLancamentos(data.sort((a,b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
  }

  async function atualizarPerfil() {
    await supabase.from('perfis_usuarios').update({ nome_empresa: editNomeEmpresa, meta_faturamento: editMeta, categorias: perfil.categorias }).eq('id', user.id);
    setPerfil({...perfil, nome_empresa: editNomeEmpresa, meta_faturamento: editMeta});
    setMostrarConfig(false);
  }

  const handleAuth = async (e: any) => {
    e.preventDefault();
    const { error } = isSignUp ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password});
    if (error) alert(error.message); else window.location.reload();
  };

  const salvarLancamento = async () => {
    if (!novaDescricao || !novoValor) return;
    const payload = { descricao: novaDescricao, valor: Number(novoValor), tipo: novoTipo, data_vencimento: novaData, categoria: novaCategoria, user_id: user.id, comprovante_url: novoComprovante };
    if (idEmEdicao) await supabase.from('lancamentos').update(payload).eq('id', idEmEdicao);
    else await supabase.from('lancamentos').insert(payload);
    setNovaDescricao(''); setNovoValor(''); setNovoComprovante(''); setIdEmEdicao(null); carregarLancamentos();
  };

  const exportarCSV = () => {
    try {
      const fields = ['data_vencimento', 'descricao', 'valor', 'tipo', 'categoria'];
      const parser = new Parser({ fields, delimiter: ';' });
      const csv = parser.parse(lancamentosExibidos);
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `GSA_FLOW_RELATORIO.csv`);
      link.click();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase italic">GSA FLOW</div>;

  const isAdmin = user?.email === 'gomesservicosageis@gmail.com';
  const assinaturaVencida = !isAdmin && perfil.expira_em && new Date(perfil.expira_em) < new Date();

  // --- TRAVA DE ACESSO ---
  if (user && assinaturaVencida) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="bg-zinc-900 border border-red-500/50 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
          <div className="text-5xl mb-6">🔒</div>
          <h1 className="text-2xl font-black text-red-500 uppercase italic mb-2 tracking-tighter">Acesso Suspenso</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">Sua assinatura expirou. Regularize para continuar acessando o cockpit da <strong>{perfil.nome_empresa}</strong>.</p>
          <div className="space-y-3">
            <a href="https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=eb0e8f15cbbd4be085473bca86164037" className="block bg-blue-600 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20">Assinar Mensal (Cartão)</a>
            <a href="https://mpago.li/1fcbewH" className="block bg-zinc-800 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-zinc-700 hover:bg-zinc-700">Pagar 30 dias (Pix/Boleto)</a>
          </div>
          <button onClick={() => window.location.reload()} className="mt-8 text-blue-500 text-[10px] font-black uppercase underline">Já paguei, quero entrar</button>
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 text-white text-center">
      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-black text-blue-500 mb-2 italic uppercase tracking-tighter leading-none">GSA FLOW</h1>
        <p className="text-zinc-600 text-[9px] font-bold uppercase mb-10 tracking-[0.3em]">Business Intelligence</p>
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none focus:border-blue-500 text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-white outline-none focus:border-blue-500 text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">Entrar no Cockpit</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-zinc-500 text-[9px] font-black uppercase">{isSignUp ? 'Já tem conta? Login' : 'Criar Conta Grátis'}</button>
      </div>
    </div>
  );

  // --- LÓGICA DE DADOS DO DASHBOARD ---
  const mesVis = dataVisualizacao.getMonth();
  const anoVis = dataVisualizacao.getFullYear();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const itensAtrasadosGeral = lancamentos.filter(i => i.status === 'agendado' && new Date(i.data_vencimento + 'T00:00:00') < hoje);
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento + 'T00:00:00');
    return d.getMonth() === mesVis && d.getFullYear() === anoVis;
  });
  const lancamentosExibidos = filtroCategoria === 'Todas' ? lancamentosDoMes : lancamentosDoMes.filter(i => i.categoria === filtroCategoria);

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  const gastosPorCategoria = perfil.categorias.map(cat => ({
    name: cat,
    value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat).reduce((acc, i) => acc + Number(i.valor), 0)
  })).filter(item => item.value > 0);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 sm:p-8 font-sans text-sm pb-24">
      {/* MODAL CONFIGURAÇÃO */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-black text-blue-500 uppercase italic mb-6">Configurações</h2>
            <div className="space-y-4 mb-8 text-left">
              <input type="text" placeholder="Nome da Empresa" className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-white outline-none" value={editNomeEmpresa} onChange={e => setEditNomeEmpresa(e.target.value)} />
              <input type="number" placeholder="Meta de Faturamento" className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-white outline-none" value={editMeta} onChange={e => setEditMeta(Number(e.target.value))} />
              <div className="flex gap-2">
                <input type="text" placeholder="Nova Categoria" className="flex-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-white outline-none" value={novaCatInput} onChange={e => setNovaCatInput(e.target.value)} />
                <button onClick={() => { if(novaCatInput) setPerfil({...perfil, categorias: [...perfil.categorias, novaCatInput]}); setNovaCatInput(''); }} className="bg-blue-600 px-4 rounded-xl font-black">+</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                {perfil.categorias.map(cat => (
                  <span key={cat} className="bg-zinc-800 px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-2">{cat} <button onClick={() => setPerfil({...perfil, categorias: perfil.categorias.filter(c => c !== cat)})} className="text-red-500">×</button></span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={atualizarPerfil} className="flex-1 bg-blue-600 p-3 rounded-xl font-black uppercase text-[10px]">Salvar</button>
              <button onClick={() => setMostrarConfig(false)} className="bg-zinc-800 p-3 rounded-xl font-black uppercase text-[10px]">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTAS DE ATRASO */}
      {itensAtrasadosGeral.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 bg-red-600/10 border border-red-500/30 p-4 rounded-2xl flex justify-between items-center gap-4">
           <p className="text-xs font-bold">⚠️ Olá {perfil.nome_empresa}, você tem {itensAtrasadosGeral.length} contas pendentes.</p>
           <button onClick={() => setDataVisualizacao(new Date(itensAtrasadosGeral[0].data_vencimento + 'T00:00:00'))} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Ver Agora</button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10 max-w-6xl mx-auto gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic uppercase leading-none">{perfil.nome_empresa}</h1>
            <div className="flex items-center gap-4 mt-2 text-zinc-500">
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() - 1)))}>◀</button>
                <p className="text-[10px] font-black uppercase tracking-widest min-w-[140px] text-center">{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataVisualizacao)}</p>
                <button onClick={() => setDataVisualizacao(new Date(dataVisualizacao.setMonth(dataVisualizacao.getMonth() + 1)))}>▶</button>
            </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMostrarConfig(true)} className="p-2 bg-zinc-900 rounded-full border border-zinc-800">⚙️</button>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="px-4 py-2 bg-zinc-900 rounded-full text-[9px] font-black uppercase text-zinc-600">Sair</button>
        </div>
      </header>

      {/* CARDS PRINCIPAIS */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]"><p className="text-blue-400 text-[8px] font-black uppercase">Entradas</p><h2 className="text-2xl font-black italic">R$ {totalReceitas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem]"><p className="text-red-400 text-[8px] font-black uppercase">Saídas</p><h2 className="text-2xl font-black italic">R$ {totalDespesas.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]"><p className="text-zinc-500 text-[8px] font-black uppercase">Lucro</p><h2 className={`text-2xl font-black italic ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {lucroLiquido.toLocaleString('pt-BR')}</h2></div>
        <div className="bg-zinc-900 border border-zinc-800/50 p-6 rounded-[2rem] border-dashed text-center"><p className="text-zinc-600 text-[8px] font-black uppercase">Meta</p><h2 className="text-2xl font-black italic text-zinc-400">R$ {perfil.meta_faturamento.toLocaleString('pt-BR')}</h2></div>
      </div>

      {/* GRÁFICOS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2rem] flex flex-col justify-center">
            <p className="text-blue-400 text-[10px] font-black uppercase mb-4 text-center">Progresso de Faturamento</p>
            <div className="w-full bg-zinc-950 h-5 rounded-full border border-zinc-800 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.3)]" style={{ width: `${Math.min((totalReceitas / perfil.meta_faturamento) * 100, 100)}%` }} />
            </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gastosPorCategoria} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                {gastosPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className={`max-w-6xl mx-auto p-6 rounded-[2.5rem] border mb-10 transition-all ${idEmEdicao ? 'bg-blue-600/10 border-blue-500' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="flex bg-zinc-950 rounded-xl p-1 h-12">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'entrada' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>Receita</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black uppercase ${novoTipo === 'saida' ? 'bg-red-600 text-white' : 'text-zinc-600'}`}>Saída</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white uppercase font-black outline-none" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {perfil.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="text" placeholder="Link do Comprovante" className="bg-zinc-950 p-3 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none" value={novoComprovante} onChange={e => setNovoComprovante(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white outline-none lg:col-span-1" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor R$" className="bg-zinc-950 p-4 h-12 rounded-xl border border-zinc-800 text-xs text-white font-mono outline-none" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={salvarLancamento} className="bg-blue-600 hover:bg-blue-500 text-white font-black h-12 rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20">{idEmEdicao ? 'Salvar Alteração' : 'Lançar no Cockpit'}</button>
        </div>
      </div>

      {/* LISTAGEM DE LANÇAMENTOS */}
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-4 gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
              <button onClick={() => setFiltroCategoria('Todas')} className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border ${filtroCategoria === 'Todas' ? 'bg-white text-black' : 'border-zinc-800 text-zinc-500'}`}>Todas</button>
              {perfil.categorias.map(cat => (
                <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[8px] font-black uppercase border ${filtroCategoria === cat ? 'bg-blue-600 text-white' : 'border-zinc-800 text-zinc-500'}`}>{cat}</button>
              ))}
            </div>
            <button onClick={exportarCSV} className="text-zinc-500 hover:text-white text-xl p-2 bg-zinc-900 border border-zinc-800 rounded-xl transition-all">📥</button>
        </div>

        {lancamentosExibidos.map((item) => {
          const estaAtrasado = item.status === 'agendado' && new Date(item.data_vencimento + 'T00:00:00') < hoje;
          const eConfirmado = item.status === 'confirmado';
          return (
            <div key={item.id} className={`flex flex-col sm:flex-row justify-between items-center p-5 rounded-[1.8rem] border transition-all gap-4 ${eConfirmado ? 'bg-zinc-950/20 border-zinc-900/50 opacity-60' : estaAtrasado ? 'bg-red-500/10 border-red-500/40 animate-pulse-slow' : 'bg-zinc-900/10 border-zinc-800/40 hover:bg-zinc-900/20'}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto text-left">
                <span className="text-[9px] font-mono bg-zinc-800/50 px-3 py-1.5 rounded-lg text-zinc-500">{new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate max-w-[200px] ${eConfirmado ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.descricao}</p>
                    {item.comprovante_url && <a href={item.comprovante_url} target="_blank" className="text-[10px]">📎</a>}
                  </div>
                  <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{item.categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                <span className={`font-black text-lg tracking-tighter ${eConfirmado ? 'text-zinc-700' : item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>{item.tipo === 'entrada' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR')}</span>
                <div className="flex gap-2">
                  {!eConfirmado && <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarLancamentos(); }} className="bg-white text-black text-[8px] font-black px-4 py-2 rounded-full h-8 uppercase">OK</button>}
                  <button onClick={() => { setIdEmEdicao(item.id); setNovaDescricao(item.descricao); setNovoValor(item.valor.toString()); setNovaData(item.data_vencimento); setNovoTipo(item.tipo); setNovaCategoria(item.categoria); setNovoComprovante(item.comprovante_url || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-zinc-600 hover:text-white p-2">✏️</button>
                  <button onClick={async () => { if(confirm('Remover?')) { await supabase.from('lancamentos').delete().eq('id', item.id); carregarLancamentos(); } }} className="text-zinc-800 hover:text-red-500 p-2">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{` @keyframes pulse-slow { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); } 50% { border-color: rgba(239, 68, 68, 0.8); } } .animate-pulse-slow { animation: pulse-slow 3s infinite; } .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
    </div>
  );
}