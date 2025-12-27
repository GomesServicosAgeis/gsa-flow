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
  const [metaMensal, setMetaMensal] = useState(10000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoTipo, setNovoTipo] = useState('entrada');
  const [novaCategoria, setNovaCategoria] = useState('Geral');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) carregarDados();
    };
    checkUser();
    const metaSalva = localStorage.getItem('gsa_flow_meta');
    if (metaSalva) setMetaMensal(Number(metaSalva));
  }, []);

  const salvarMeta = (valor: string) => {
    const num = Number(valor);
    setMetaMensal(num);
    localStorage.setItem('gsa_flow_meta', valor);
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-6 font-sans">
        <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-black text-blue-500 mb-2 italic tracking-tighter text-center">GSA FLOW</h1>
          <p className="text-zinc-500 text-[9px] mb-8 uppercase font-black tracking-[0.3em] text-center">Security System v2.0</p>
          <input type="email" placeholder="E-mail" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4 outline-none text-white focus:border-blue-500 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Senha" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 outline-none text-white focus:border-blue-500 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-xl hover:bg-blue-500 transition-all uppercase text-xs tracking-widest">Autenticar</button>
        </form>
      </div>
    );
  }

  // Lógica de Filtro e Cálculos
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  
  const lancamentosDoMes = lancamentos.filter(i => {
    const d = new Date(i.data_vencimento);
    return d.getUTCMonth() === mesAtual && d.getUTCFullYear() === anoAtual;
  });

  const totalReceitas = lancamentosDoMes.filter(i => i.tipo === 'entrada').reduce((acc, i) => acc + Number(i.valor), 0);
  const totalDespesas = lancamentosDoMes.filter(i => i.tipo === 'saida').reduce((acc, i) => acc + Number(i.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  
  const saldoCaixaGeral = lancamentos.reduce((acc, item) => item.status === 'agendado' ? acc : (item.tipo === 'entrada' ? acc + Number(item.valor) : acc - Number(item.valor)), 0);
  const progressoMeta = Math.min((totalReceitas / metaMensal) * 100, 100);

  const gastosPorCategoria = CATEGORIAS_OPCOES
    .map(cat => ({
      name: cat.label,
      value: lancamentosDoMes.filter(i => i.tipo === 'saida' && i.categoria === cat.value).reduce((acc, i) => acc + Number(i.valor), 0)
    })).filter(item => item.value > 0);

  const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-8 font-sans text-sm">
      <header className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <div>
            <h1 className="text-3xl font-black text-blue-500 tracking-tighter italic">GSA FLOW</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Dashboard Mensal • {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-zinc-600 hover:text-white transition-all text-[10px] font-black uppercase bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">Sair</button>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem]">
          <p className="text-blue-400 text-[9px] font-black mb-1 tracking-widest uppercase">Receita (Mês)</p>
          <h2 className="text-3xl font-black tracking-tighter">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
        <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem]">
          <p className="text-red-400 text-[9px] font-black mb-1 tracking-widest uppercase">Despesa (Mês)</p>
          <h2 className="text-3xl font-black tracking-tighter">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
          <p className="text-zinc-500 text-[9px] font-black mb-1 tracking-widest uppercase">Lucro Líquido</p>
          <h2 className={`text-3xl font-black tracking-tighter ${lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h2>
        </div>
        <div className="bg-zinc-900 border border-zinc-700/30 p-6 rounded-[2rem] border-dashed">
          <p className="text-zinc-500 text-[9px] font-black mb-1 tracking-widest uppercase">Saldo Geral</p>
          <h2 className="text-3xl font-black tracking-tighter text-zinc-300">{saldoCaixaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-800 p-8 rounded-[2rem] flex flex-col justify-center">
            <div className="flex justify-between items-end mb-4">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Progresso da Meta</p>
                {editandoMeta ? (
                    <input autoFocus type="number" className="bg-zinc-950 border border-blue-500 p-1 rounded text-right w-32 outline-none font-mono text-xs" onBlur={() => setEditandoMeta(false)} onChange={(e) => salvarMeta(e.target.value)} value={metaMensal}/>
                ) : (
                    <button onClick={() => setEditandoMeta(true)} className="text-xs font-black text-zinc-400 flex items-center gap-2">
                        Meta: {metaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ✏️
                    </button>
                )}
            </div>
            <div className="w-full bg-zinc-950 h-6 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]" style={{ width: `${progressoMeta}%` }} />
            </div>
            <p className="mt-2 text-right text-[10px] font-bold text-zinc-500 italic">{progressoMeta.toFixed(1)}% do objetivo atingido</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] h-[200px] flex flex-col items-center">
          <p className="text-zinc-500 text-[9px] font-black uppercase mb-2">Gastos por Setor</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={gastosPorCategoria} innerRadius={50} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                {gastosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
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
              await supabase.from('lancamentos').insert([{ descricao: novaDescricao, valor: Number(novoValor), tipo: novoTipo, status: 'agendado', data_vencimento: novaData, categoria: novaCategoria }]);
              setNovaDescricao(''); setNovoValor(''); carregarDados();
            }} className="bg-blue-600 text-white font-black p-3 rounded-xl hover:bg-blue-500 transition-all text-xs uppercase">Lançar</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-2 pb-20">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 ml-2">Histórico Recente</p>
        {lancamentos.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-zinc-900/10 p-4 rounded-2xl border border-zinc-800/40 group hover:bg-zinc-900/40 transition-all">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-zinc-500">{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</span>
              <div>
                <p className="font-medium text-zinc-300">{item.descricao}</p>
                <div className="flex gap-2 items-center text-[9px] font-black uppercase tracking-widest text-zinc-600">
                  <span className="text-blue-500/70">{item.categoria}</span>
                  <span>•</span>
                  <span>{item.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`font-black text-lg tracking-tighter ${item.tipo === 'entrada' ? 'text-blue-500' : 'text-red-500'}`}>
                {item.tipo === 'entrada' ? '+' : '-'} {Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="flex gap-2">
                {item.status === 'agendado' && (
                  <button onClick={async () => { await supabase.from('lancamentos').update({ status: 'confirmado' }).eq('id', item.id); carregarDados(); }} className="bg-zinc-100 text-black text-[9px] font-black px-3 py-1 rounded-full hover:bg-blue-500 hover:text-white transition-all">OK</button>
                )}
                <button onClick={async () => { await supabase.from('lancamentos').delete().eq('id', item.id); carregarDados(); }} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all text-xs">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}