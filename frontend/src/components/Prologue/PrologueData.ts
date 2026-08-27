import sceneValdoria from '../../assets/prologue/reino-do-avesso-01-valdoria.png';
import scenePedraClara from '../../assets/prologue/reino-do-avesso-02-pedra-clara.png';
import sceneRevolta from '../../assets/prologue/reino-do-avesso-03-revolta.png';
import sceneExilio from '../../assets/prologue/reino-do-avesso-04-exilio.png';
import sceneSobreviventes from '../../assets/prologue/reino-do-avesso-05-sobreviventes.png';
import sceneAcampamento from '../../assets/prologue/reino-do-avesso-06-acampamento.png';

export const PROLOGUE_VERSION = 1;

export interface PrologueSlide {
  id: string;
  title: string;
  lines: string[];
  image: string;
  accent: 'amber' | 'rose' | 'sky' | 'emerald';
}

export const PROLOGUE_SLIDES: PrologueSlide[] = [
  {
    id: 'valdoria',
    title: 'Reino do Avesso',
    lines: [
      'Em Valdória, tudo existia “para o bem comum”.',
      'Mas quanto mais o poder crescia, menos o povo tinha.',
      'No Reino do Avesso, o absurdo virou lei.',
    ],
    image: sceneValdoria,
    accent: 'amber',
  },
  {
    id: 'pedra-clara',
    title: 'Pedra Clara',
    lines: [
      'Você era apenas mais um entre o povo de Pedra Clara.',
      'Trabalhava, pagava impostos e tentava viver em paz.',
      'Até o Diretório tomar até o que restava.',
    ],
    image: scenePedraClara,
    accent: 'amber',
  },
  {
    id: 'revolta',
    title: 'A Revolta de Pedra Clara',
    lines: [
      'Naquela noite, o povo reagiu.',
      'O que começou como protesto virou revolta.',
      'E você ficou no meio dela.',
    ],
    image: sceneRevolta,
    accent: 'rose',
  },
  {
    id: 'derrota',
    title: 'Derrota',
    lines: [
      'A revolta fracassou.',
      'Os mortos foram chamados de agitadores.',
      'Os sobreviventes, de criminosos.',
    ],
    image: sceneExilio,
    accent: 'sky',
  },
  {
    id: 'indesejados',
    title: 'Os Indesejados',
    lines: [
      'Longe da cidade, os exilados foram deixados à própria sorte.',
      'Sem lar, sem proteção, sem volta.',
      'Restava apenas sobreviver.',
    ],
    image: sceneSobreviventes,
    accent: 'sky',
  },
  {
    id: 'novo-comeco',
    title: 'Um Novo Começo',
    lines: [
      'Se o mundo deles não tinha lugar para vocês…',
      'então um novo mundo teria que ser construído.',
      'Foi assim que nasceu seu assentamento.',
    ],
    image: sceneAcampamento,
    accent: 'emerald',
  },
];