'use strict';
/* Regras por nível (RN04) e pontuação base (RF33). */
const NIVEIS = {
  facil:   { nome: 'Fácil',   max: 6,  base: 100 },
  medio:   { nome: 'Médio',   max: 8,  base: 150 },
  dificil: { nome: 'Difícil', max: 10, base: 200 },
};

/* Banco: 3 categorias x (5 fáceis + 5 médias + 5 difíceis) = 45 (RN22).
   Para acrescentar palavras ou categorias, basta editar este arquivo.
   Acentos são permitidos: o jogo compara sem acento (RN19). */
const BANCO = {
  Animais: {
    facil: [
      { p: 'GATO',   d: 'Mia, caça ratos e dorme boa parte do dia.' },
      { p: 'VACA',   d: 'Dá leite e vive no pasto.' },
      { p: 'PEIXE',  d: 'Respira debaixo d\'água com guelras.' },
      { p: 'COELHO', d: 'Orelhas longas, pula e adora cenoura.' },
      { p: 'PATO',   d: 'Faz "quá" e gosta de lagoa.' },
    ],
    medio: [
      { p: 'GIRAFA',   d: 'O pescoço mais alto da savana.' },
      { p: 'ELEFANTE', d: 'Maior animal terrestre, tem tromba.' },
      { p: 'GOLFINHO', d: 'Mamífero marinho, inteligente e brincalhão.' },
      { p: 'PINGUIM',  d: 'Ave que não voa, mas nada muito bem.' },
      { p: 'CAMELO',   d: 'Atravessa o deserto com corcovas.' },
    ],
    dificil: [
      { p: 'ORNITORRINCO', d: 'Mamífero australiano que põe ovos e tem bico de pato.' },
      { p: 'RINOCERONTE',  d: 'Grande herbívoro com chifre sobre o nariz.' },
      { p: 'HIPOPÓTAMO',   d: 'Passa o dia na água; o nome vem do grego "cavalo do rio".' },
      { p: 'TAMANDUÁ',     d: 'Língua comprida, come formigas e cupins.' },
      { p: 'CHINCHILA',    d: 'Roedor andino de pelagem muito macia.' },
    ],
  },
  Alimentos: {
    facil: [
      { p: 'ARROZ',  d: 'Par inseparável do feijão no prato brasileiro.' },
      { p: 'FEIJÃO', d: 'Grão cozido em caldo escuro.' },
      { p: 'LEITE',  d: 'Líquido branco que vem da vaca.' },
      { p: 'BOLO',   d: 'Doce assado que costuma ter velinhas.' },
      { p: 'QUEIJO', d: 'Derivado do leite, pode ser minas ou prato.' },
    ],
    medio: [
      { p: 'BANANA',    d: 'Fruta amarela com casca que escorrega.' },
      { p: 'MACARRÃO',  d: 'Massa que combina com molho.' },
      { p: 'CHOCOLATE', d: 'Vem do cacau.' },
      { p: 'MELANCIA',  d: 'Fruta verde por fora, vermelha por dentro, muito aguada.' },
      { p: 'LASANHA',   d: 'Massa em camadas com molho e queijo.' },
    ],
    dificil: [
      { p: 'ESCONDIDINHO', d: 'Purê por cima, recheio escondido embaixo.' },
      { p: 'BRIGADEIRO',   d: 'Doce de festa infantil, enrolado em granulado.' },
      { p: 'BERINJELA',    d: 'Legume roxo e brilhante.' },
      { p: 'BETERRABA',    d: 'Raiz de cor intensa que tinge tudo de vermelho-arroxeado.' },
      { p: 'ESPAGUETE',    d: 'Massa longa e fina, de origem italiana.' },
    ],
  },
  Profissões: {
    facil: [
      { p: 'MÉDICO',   d: 'Cuida da saúde e usa estetoscópio.' },
      { p: 'PILOTO',   d: 'Conduz aviões.' },
      { p: 'PEDREIRO', d: 'Levanta paredes com tijolo e massa.' },
      { p: 'JUIZ',     d: 'Decide quem tem razão em um julgamento.' },
      { p: 'GARI',     d: 'Mantém as ruas limpas.' },
    ],
    medio: [
      { p: 'ENGENHEIRO', d: 'Projeta pontes, prédios e máquinas.' },
      { p: 'PROFESSOR',  d: 'Ensina em uma sala de aula.' },
      { p: 'DENTISTA',   d: 'Cuida de cáries e sorrisos.' },
      { p: 'ADVOGADO',   d: 'Defende clientes perante a lei.' },
      { p: 'JORNALISTA', d: 'Apura e conta as notícias.' },
    ],
    dificil: [
      { p: 'FISIOTERAPEUTA',  d: 'Ajuda a recuperar movimentos após lesões.' },
      { p: 'NUTRICIONISTA',   d: 'Monta planos alimentares.' },
      { p: 'FONOAUDIÓLOGO',   d: 'Trata da fala, da voz e da audição.' },
      { p: 'PSICOPEDAGOGO',   d: 'Atua nas dificuldades de aprendizagem.' },
      { p: 'ELETROTÉCNICO',   d: 'Profissional técnico de instalações e sistemas elétricos.' },
    ],
  },
};
