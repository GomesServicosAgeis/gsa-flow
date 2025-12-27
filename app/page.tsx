'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORIAS_OPCOES = [
  { label: '🏷️ Geral', value: 'Geral' },
  { label: '🚀 Marketing', value: 'Marketing' },
  { label: '💻 Software/SaaS', value: 'Software' },
  { label: '🏠 Infraestrutura', value: 'Infra' },
  { label: '👤 Pessoal/Pró-labore', value: 'Pessoal' },
  { label: '🛡️ Impostos', value: 'Impostos' },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Geral');

  useEffect(() => {
    // Verificar se o usuário está logado
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) carregarDados();
    };
    checkUser();
  }, []);

  async function carregarDados() {
    const { data } = await supabase.from('lancamentos').select('*').order('data_vencimento', { ascending: false });
    if (data) setLancamentos(data);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erro no login: " + error.message);
    else window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Se não estiver logado, mostra a tela de login
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md">
          <h1 className="text-3xl font-black text-blue-500 mb-6 italic tracking-tighter">GSA FLOW</h1>
          <p className="text-zinc-400 text-xs mb-8 uppercase font-bold tracking-widest text-center">Acesso Restrito</p>
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4 outline-none text-white" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 outline-none text-white" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-xl hover:bg-blue-500 transition-all uppercase text-xs">Entrar no Sistema</button>
        </form>
      </div>
    );
  }

  // Lógica do Gráfico: Gastos por Categoria
  const gastosPorCategoria = CATEGORIAS_OPCOES
    .filter(cat => cat.value !== 'Geral' || lancamentos.some(i => i.categoria === 'Geral' && i.tipo === 'saida'))
    .map(cat => ({
      name: cat.label,
      value: lancamentos.filter(i => i.tipo === 'saida' && i.categoria === cat.value).reduce((acc, i) => acc + Number(i.valor), 0)
    })).filter(item => item.value > 0);

  const totalReceitas = lancamentos.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentos.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const saldoPrevisto = totalReceitas - totalDespesas;
  const saldoCaixa = lancamentos.reduce((acc, item) => item.status === 'agendado' ? acc : (item.tipo === 'entrada' ? acc + Number(item.valor) : acc - Number(item.valor)), 0);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-8 font-sans text-sm">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic">GSA FLOW</h1>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 px-4 py-1.5 rounded-full text-[10px] border border-zinc-800 uppercase font-bold tracking-widest text-zinc-400">Danilo Gomes</div>
          <button onClick={handleLogout} className="text-zinc-600 hover:text-white transition-all text-xs">Sair</button>
        </div>
      </header>

      {/* ... Restante do código (Gráficos, Form e Lista) permanece igual ao anterior ... */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2rem]">
            <p className="text-blue-400 text-[10px] font-black mb-2 tracking-widest">FATURAMENTO PREVISTO</p>
            <h2 className="text-5xl font-black tracking-tighter">{saldoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem]">
            <p className="text-zinc-500 text-[10px] font-black mb-2 tracking-widest">SALDO EM CAIXA</p>
            <h2 className={`text-5xl font-black tracking-tighter ${saldoCaixa >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {saldoCaixa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h2>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[250px] flex flex-col items-center">
          <p className="text-zinc-500 text-[10px] font-black uppercase mb-2">Distribuição de Despesas</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gastosPorCategoria} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                {gastosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800/50 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="flex bg-zinc-950 rounded-xl p-1">
            <button onClick={() => setNovoTipo('entrada')} className={`flex-1 rounded-lg text-[9px] font-black ${novoTipo === 'entrada' ? 'bg-blue-600' : 'text-zinc-600'}`}>RECEITA</button>
            <button onClick={() => setNovoTipo('saida')} className={`flex-1 rounded-lg text-[9px] font-black ${novoTipo === 'saida' ? 'bg-red-600' : 'text-zinc-600'}`}>DESPESA</button>
          </div>
          <input type="date" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-zinc-300" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <select className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-zinc-300" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)}>
            {CATEGORIAS_OPCOES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
          <input type="text" placeholder="Descrição" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-zinc-300 md:col-span-1" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} />
          <input type="number" placeholder="Valor" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-zinc-300 font-mono" value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <button onClick={async () => {
              if (!novaDescricao || !novoValor) return;
              const { error } = await supabase.from('lancamentos').insert([{ 
                descricao: novaDescricao, valor: Number(novoValor), tipo: novoTipo, 
                status: 'agendado', data_vencimento: novaData, categoria: novaCategoria 
              }]);
              if (!error) { setNovaDescricao(''); setNovoValor(''); carregarDados(); }
            }} 
            className="bg-blue-600 text-white font-black p-3 rounded-xl hover:bg-blue-500 transition-all text-xs uppercase">Lançar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-3 pb-20">
        {lancamentos.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-zinc-900/20 p-5 rounded-2xl border border-zinc-800 group hover:bg-zinc-900/50 transition-all">
            <div className="flex items-center gap-6">
              <span className="text-[11px] font-bold text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/30">
                {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
              <div>
                <p className="font-semibold text-zinc-200">{item.descricao}</p>
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{item.categoria}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{item.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`font-black text-xl tracking-tighter ${item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>
                {item.tipo === 'entrada' ? '+' : '-'} {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="flex gap-2">
                {item.status === 'agendado' && (
                  <button onClick={async () => {
                      await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id);
                      carregarDados();
                    }} className="bg-zinc-100 text-black text-[9px] font-black px-4 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all">CONFIRMAR</button>
                )}
                <button onClick={async () => {
                    await supabase.from('lancamentos').delete().eq('id', item.id);
                    carregarDados();
                  }} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}