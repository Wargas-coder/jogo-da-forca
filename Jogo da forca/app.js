'use strict';
/* =========================================================
   JOGO DA FORCA — lógica
   Atenção: o login é LOCAL (localStorage). Serve para separar
   históricos por usuário, não para proteger dados de verdade.
   ========================================================= */

const $ = (id) => document.getElementById(id);
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* ---------- Armazenamento (com tratamento de erro) ---------- */
function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch (e) { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); return true; }
  catch (e) { return false; }
}

/* ---------- Utilitários ---------- */
// RN18 + RN19: tudo em maiúsculas e sem acento (ç vira C, ã vira A...)
const normaliza = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

async function hashSenha(usuario, senha) {
  const texto = 'forca:' + usuario.toLowerCase() + ':' + senha;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { // contexto sem crypto.subtle: hash simples (menos seguro)
    let h = 5381;
    for (const c of texto) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return 'djb2-' + h;
  }
}

/* ---------- Estado ---------- */
let usuario = null;                    // usuário logado
let modoCriar = false;                 // aba do login
let config = { nome: '', cat: '', nivel: '', teclado: true };
let partida = null;                    // dados da partida atual
const usados = {};                     // palavras já sorteadas por categoria|nível

/* ---------- Telas ---------- */
function mostrar(id) {
  ['tela-login', 'tela-jogador', 'tela-jogo'].forEach((t) => { $(t).hidden = (t !== id); });
}

/* =========================================================
   TELA 1 — LOGIN
   ========================================================= */
function definirModo(criar) {
  modoCriar = criar;
  $('aba-entrar').setAttribute('aria-selected', String(!criar));
  $('aba-criar').setAttribute('aria-selected', String(criar));
  $('lbl-confirma').hidden = !criar;
  $('btn-login').textContent = criar ? 'Criar conta' : 'Entrar';
  $('login-senha').autocomplete = criar ? 'new-password' : 'current-password';
  $('login-msg').textContent = '';
}

async function enviarLogin(ev) {
  ev.preventDefault();
  const nome = $('login-usuario').value.trim();
  const senha = $('login-senha').value;
  const msg = $('login-msg');
  const contas = ler('forca:contas', {});
  const chave = nome.toLowerCase();

  if (nome.length < 3) { msg.textContent = 'O usuário precisa ter ao menos 3 caracteres.'; return; }
  if (senha.length < 4) { msg.textContent = 'A senha precisa ter ao menos 4 caracteres.'; return; }

  if (modoCriar) {
    if (senha !== $('login-confirma').value) { msg.textContent = 'As senhas não conferem.'; return; }
    if (contas[chave]) { msg.textContent = 'Este usuário já existe. Use a aba Entrar.'; return; }
    contas[chave] = { nome, hash: await hashSenha(nome, senha) };
    if (!gravar('forca:contas', contas)) { msg.textContent = 'Não foi possível salvar a conta neste navegador.'; return; }
  } else {
    const conta = contas[chave];
    if (!conta || conta.hash !== await hashSenha(nome, senha)) {
      msg.textContent = 'Usuário ou senha incorretos.'; return;
    }
  }
  entrar(contas[chave].nome);
}

function entrar(nome) {
  usuario = nome;
  gravar('forca:sessao', nome);
  $('form-login').reset();
  $('login-msg').textContent = '';
  irParaJogador();
}

function sair() {
  try { localStorage.removeItem('forca:sessao'); } catch (e) { /* ignora */ }
  usuario = null; partida = null;
  definirModo(false);
  mostrar('tela-login');
}

/* =========================================================
   TELA 2 — ENTRADA DO JOGADOR
   ========================================================= */
function criarOpcao(grupo, valor, rotulo, marcado) {
  const l = document.createElement('label');
  l.innerHTML = '<input type="radio" name="' + grupo + '"><span></span>';
  const inp = l.querySelector('input');
  inp.value = valor; inp.checked = marcado;
  l.querySelector('span').textContent = rotulo;
  return l;
}

function irParaJogador() {
  const salvo = ler('forca:config:' + usuario.toLowerCase(), null);
  if (salvo) config = Object.assign(config, salvo);
  if (!config.nome) config.nome = usuario;
  if (!BANCO[config.cat]) config.cat = Object.keys(BANCO)[0];
  if (!NIVEIS[config.nivel]) config.nivel = 'facil';

  $('usuario-logado').textContent = usuario;
  $('nome-jogador').value = config.nome;
  $('chk-teclado').checked = config.teclado;
  $('setup-msg').textContent = '';

  const cats = $('opcoes-categoria'); cats.innerHTML = '';
  Object.keys(BANCO).forEach((c) => cats.appendChild(criarOpcao('cat', c, c, c === config.cat)));
  const nivs = $('opcoes-dificuldade'); nivs.innerHTML = '';
  Object.keys(NIVEIS).forEach((n) => {
    const r = NIVEIS[n].nome + ' (' + NIVEIS[n].max + ' erros)';
    nivs.appendChild(criarOpcao('nivel', n, r, n === config.nivel));
  });

  renderHistorico($('historico-setup'));
  mostrar('tela-jogador');
}

function iniciarPelaConfig() {
  const nome = $('nome-jogador').value.trim();
  const cat = document.querySelector('input[name=cat]:checked');
  const nivel = document.querySelector('input[name=nivel]:checked');
  if (!nome) { $('setup-msg').textContent = 'Informe o nome do jogador.'; return; }
  if (!cat || !nivel) { $('setup-msg').textContent = 'Escolha a categoria e a dificuldade.'; return; }
  config = { nome, cat: cat.value, nivel: nivel.value, teclado: $('chk-teclado').checked };
  gravar('forca:config:' + usuario.toLowerCase(), config);
  novaPartida();
  mostrar('tela-jogo');
}

/* =========================================================
   TELA 3 — PARTIDA
   ========================================================= */
// RF05 / RN21: sorteia respeitando categoria e nível, sem repetir até esgotar
function sortearPalavra() {
  const lista = BANCO[config.cat][config.nivel];
  const chave = config.cat + '|' + config.nivel;
  if (!usados[chave] || usados[chave].length >= lista.length) usados[chave] = [];
  const livres = lista.filter((w) => !usados[chave].includes(w.p));
  const w = livres[Math.floor(Math.random() * livres.length)];
  usados[chave].push(w.p);
  return w;
}

function novaPartida() {
  const w = sortearPalavra();
  partida = {
    palavra: w.p, dica: w.d, alvo: normaliza(w.p),
    max: NIVEIS[config.nivel].max,
    certas: new Set(), erradas: new Set(),
    estado: 'andamento', pontos: 0,
  };
  $('j-nome').textContent = config.nome;
  $('j-cat').textContent = config.cat;
  $('j-dif').textContent = NIVEIS[config.nivel].nome;
  $('j-dica').textContent = w.d;
  $('j-max').textContent = partida.max;
  montarTeclado();
  renderPartida();
  renderHistorico($('historico-jogo'));
}

function montarTeclado() {
  const t = $('teclado');
  t.hidden = !config.teclado;                         // RF12 / RN17
  t.innerHTML = '';
  ALFABETO.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = l; b.dataset.letra = l;
    b.setAttribute('aria-label', 'Letra ' + l);
    b.addEventListener('click', () => tentar(l));     // RN16: mesma função do teclado físico
    t.appendChild(b);
  });
}

// RF14 a RF24, RN05 a RN11: única porta de entrada para qualquer tentativa
function tentar(letra) {
  if (!partida || partida.estado !== 'andamento') return;   // RN11 / RN24
  letra = normaliza(letra);
  if (!/^[A-Z]$/.test(letra)) return;
  if (partida.certas.has(letra) || partida.erradas.has(letra)) return; // RN05

  if (partida.alvo.includes(letra)) partida.certas.add(letra);
  else partida.erradas.add(letra);

  const todas = [...partida.alvo].every((c) => partida.certas.has(c));
  if (todas) finalizar('vitoria');
  else if (partida.erradas.size >= partida.max) finalizar('derrota');
  renderPartida();
}

function finalizar(resultado) {
  partida.estado = resultado;                         // RN23: estado final único
  const restam = partida.max - partida.erradas.size;
  partida.pontos = resultado === 'vitoria' ? NIVEIS[config.nivel].base + restam * 10 : 0;
  registrarHistorico(resultado);
}

function renderPartida() {
  const p = partida;
  const erros = p.erradas.size;
  $('j-erros').textContent = erros;
  $('j-rest').textContent = p.max - erros;
  $('j-pontos').textContent = p.pontos;

  // Boneco: mostra as primeiras "erros" partes (sequência igual nos 3 níveis)
  for (let i = 0; i < 10; i++) $('p' + i).classList.toggle('visivel', i < erros);

  // Palavra (RF08/RF30): revela letra original (com acento) quando acertada
  const area = $('palavra'); area.innerHTML = '';
  [...p.palavra].forEach((c) => {
    const s = document.createElement('span');
    const norm = normaliza(c);
    if (p.certas.has(norm)) s.textContent = c;
    else if (p.estado === 'derrota') { s.textContent = c; s.className = 'perdida'; }
    else s.textContent = '';
    area.appendChild(s);
  });
  area.setAttribute('aria-label', 'Palavra com ' + p.palavra.length + ' letras');

  $('l-certas').textContent = [...p.certas].sort().join(', ') || '—';
  $('l-erradas').textContent = [...p.erradas].sort().join(', ') || '—';

  // Estado da partida (RF25) — texto + ícone, não só cor
  const st = $('status');
  st.className = 'status ' + (p.estado === 'andamento' ? '' : p.estado);
  if (p.estado === 'andamento') st.textContent = '✎ Partida em andamento';
  else if (p.estado === 'vitoria') st.textContent = '★ Você venceu! A palavra era ' + p.palavra + '. +' + p.pontos + ' pontos';
  else st.textContent = '✘ Você perdeu. A palavra era ' + p.palavra + '.';

  // Teclado virtual: disponível / correta / incorreta (RN15)
  document.querySelectorAll('#teclado button').forEach((b) => {
    const l = b.dataset.letra;
    const certa = p.certas.has(l), errada = p.erradas.has(l);
    b.className = certa ? 'certa' : errada ? 'errada' : '';
    b.disabled = certa || errada || p.estado !== 'andamento';
    b.setAttribute('aria-label', 'Letra ' + l + (certa ? ', correta' : errada ? ', incorreta' : ''));
  });
}

/* =========================================================
   HISTÓRICO (por usuário)
   ========================================================= */
const chaveHist = () => 'forca:historico:' + usuario.toLowerCase();

function registrarHistorico(resultado) {
  const h = ler(chaveHist(), []);
  h.unshift({
    nome: config.nome, cat: config.cat, nivel: NIVEIS[config.nivel].nome,
    palavra: partida.palavra, resultado, erros: partida.erradas.size,
    pontos: partida.pontos, data: new Date().toISOString(),
  });
  gravar(chaveHist(), h.slice(0, 200));               // limite para não crescer sem fim
  renderHistorico($('historico-jogo'));
}

function renderHistorico(el) {
  const h = ler(chaveHist(), []);
  const v = h.filter((x) => x.resultado === 'vitoria').length;
  const d = h.length - v;
  const pts = h.reduce((s, x) => s + (x.pontos || 0), 0);
  const taxa = h.length ? Math.round((v / h.length) * 100) : 0;

  el.innerHTML = '<h3>Histórico</h3>' +
    '<div class="placar"><div class="v"><b>' + v + '</b>vitórias</div>' +
    '<div class="d"><b>' + d + '</b>derrotas</div><div><b>' + taxa + '%</b>acertos</div></div>' +
    '<p>Pontos acumulados: <b>' + pts + '</b></p>';

  if (!h.length) {
    el.insertAdjacentHTML('beforeend', '<p>Nenhuma partida ainda. Jogue a primeira!</p>');
    return;
  }
  const ul = document.createElement('ul');
  h.slice(0, 10).forEach((x) => {
    const li = document.createElement('li');
    const ok = x.resultado === 'vitoria';
    const marca = document.createElement('span');
    marca.className = ok ? 'ok' : 'x';
    marca.textContent = ok ? '✔ Vitória' : '✘ Derrota';
    const det = document.createElement('small');        // textContent: evita injetar HTML
    det.textContent = x.palavra + ' · ' + x.cat + ' · ' + x.nivel + ' · ' + x.erros + ' erro(s)' +
      (ok ? ' · ' + x.pontos + ' pts' : '');
    li.append(marca, det);
    ul.appendChild(li);
  });
  el.appendChild(ul);

  const limpar = document.createElement('button');
  limpar.type = 'button'; limpar.className = 'link'; limpar.textContent = 'Limpar histórico';
  limpar.addEventListener('click', () => {
    if (confirm('Apagar todo o histórico desta conta?')) {
      gravar(chaveHist(), []);
      renderHistorico($('historico-setup'));
      renderHistorico($('historico-jogo'));
    }
  });
  el.appendChild(limpar);
}

/* =========================================================
   EVENTOS
   ========================================================= */
$('aba-entrar').addEventListener('click', () => definirModo(false));
$('aba-criar').addEventListener('click', () => definirModo(true));
$('form-login').addEventListener('submit', enviarLogin);
$('btn-sair').addEventListener('click', sair);
$('btn-iniciar').addEventListener('click', iniciarPelaConfig);
$('btn-novo').addEventListener('click', novaPartida);                 // RF32
$('btn-config').addEventListener('click', irParaJogador);

// RF10: teclado físico (ignora atalhos e digitação em campos de texto)
document.addEventListener('keydown', (ev) => {
  if ($('tela-jogo').hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.target && ev.target.tagName === 'INPUT') return;
  if (ev.key.length === 1) tentar(ev.key);
});

/* Início: retoma a sessão, se existir uma conta válida */
(function iniciar() {
  const sessao = ler('forca:sessao', null);
  const contas = ler('forca:contas', {});
  if (sessao && contas[String(sessao).toLowerCase()]) { usuario = sessao; irParaJogador(); }
  else mostrar('tela-login');
})();
