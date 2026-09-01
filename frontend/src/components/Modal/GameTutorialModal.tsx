import React, { useState, useEffect } from 'react';
import { PixelItemSprite } from '../../game/registries/PixelArtItemRegistry';

interface GameTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialChapter {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  slotKey?: string;
  weaponKey?: string;
  sections: Array<{
    title: string;
    icon: string;
    text: string;
    tip?: string;
  }>;
}

const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'combat',
    title: 'Combate & Expedições',
    badge: 'Capítulo 1',
    subtitle: 'Entenda como funcionam as expedições contínuas, monstros e chefes.',
    weaponKey: 'sword',
    sections: [
      {
        title: 'Combate Automático em Tempo Real',
        icon: '🗡️',
        text: 'Seu herói avança por estágios de combate enfrentando ondas de monstros. O combate é executado de forma contínua mesmo quando você navega pelas telas do refúgio.',
        tip: 'Ajuste sua postura de combate (Ofensiva, Defensiva ou Balanceada) conforme a dificuldade da região.',
      },
      {
        title: 'Monstros & Chefes de Área',
        icon: '👹',
        text: 'Monstros comuns dropam recursos e partes valiosas para abastecer a vila. Ao final dos estágios, você enfrentará Chefes que podem conceder manuais de construção, livros de habilidade e artefatos raros.',
      },
      {
        title: 'Troca de Regiões',
        icon: '🗺️',
        text: 'Conforme sobe de nível e aprimora seus equipamentos, desbloqueie novas regiões com criaturas mais desafiadoras e materiais avançados para a forja.',
      },
    ],
  },
  {
    id: 'equipment',
    title: 'Equipamentos & Mãos (1H vs 2H)',
    badge: 'Capítulo 2',
    subtitle: 'Domine slots, poder dos equipamentos, maestrias e a escolha entre armas de 1 mão e 2 mãos.',
    slotKey: 'chest',
    sections: [
      {
        title: 'Armas de Duas Mãos (2H) vs Uma Mão (1H)',
        icon: '⚔️⚔️',
        text: 'Armas de 2 Mãos (Arcos, Cajados Rúnicos, Montantes e Lâminas Colossais) ocupam ambas as mãos e desequipam o escudo, mas possuem DANO DE ATAQUE/MÁGICO MUITO SUPERIOR e maior chance de acerto crítico! Armas de 1 Mão permitem combinar o ataque com a defesa de um escudo.',
        tip: 'Se você busca dano ofensivo máximo, use armas de 2 Mãos. Se precisa de sobrevivência contra chefes difíceis, equipe 1 Mão + Escudo.',
      },
      {
        title: 'Maestrias & Poder',
        icon: '📊',
        text: 'O nível aumenta vida, mana e capacidade automaticamente. A arma equipada define o estilo, a maestria cresce pelo uso e os equipamentos fornecem bônus diretos como Poder Melee, Poder de Distância, Poder Mágico, HP, MP e DEF.',
      },
      {
        title: 'Raridades dos Itens',
        icon: '✨',
        text: 'Os equipamentos variam de Comum até Divino. Itens de raridade mais alta contam com bônus de poder e utilidade, vampirismo (lifesteal), crítico e bônus de ouro.',
      },
    ],
  },
  {
    id: 'camp',
    title: 'Acampamento & Construções',
    badge: 'Capítulo 3',
    subtitle: 'Desenvolva o seu refúgio para liberar benefícios permanentes e novas instalações.',
    slotKey: 'manual',
    sections: [
      {
        title: 'Cabana do Aventureiro (Alojamento)',
        icon: '🏘️',
        text: 'Aumenta a capacidade habitacional do refúgio, atraindo novos moradores com profissões variadas para trabalhar na comunidade.',
      },
      {
        title: 'Armazém de Recursos',
        icon: '📦',
        text: 'Expande o limite de armazenamento do Depósito de Recursos, permitindo estocar mais madeiras, minérios, tecidos e partes de monstros sem transbordar.',
      },
      {
        title: 'Bancada de Trabalho & Desmontagem',
        icon: '⚒️',
        text: 'Permite forjar receitas avançadas de equipamentos e desmontar peças antigas em materiais puros para reutilização.',
      },
      {
        title: 'Fonte Arcana & Fogueira',
        icon: '⛲',
        text: 'A Fogueira acelera a regeneração de vida enquanto o herói descansa no acampamento, e a Fonte Arcana amplifica consideravelmente a regeneração de mana.',
      },
      {
        title: 'Tesouraria & Folha de Pagamento',
        icon: '🏦',
        text: 'Depois de 25 de Prosperidade, cada ordem de trabalho possui salário informado antecipadamente. O valor é reservado antes da saída e pago automaticamente no retorno, inclusive após tempo offline.',
        tip: 'Você pode depositar ouro manualmente ou habilitar a reposição automática, definindo quanto ouro deve permanecer protegido com o herói.',
      },
    ],
  },
  {
    id: 'residents',
    title: 'Moradores & Coleta de Profissão',
    badge: 'Capítulo 4',
    subtitle: 'Seus moradores trabalham continuamente para abastecer o refúgio.',
    slotKey: 'bag',
    sections: [
      {
        title: 'Ordens de Trabalho Automatizadas',
        icon: '📋',
        text: 'Envie seus moradores em ordens de coleta de Pesca, Mineração, Corte de Madeira, Agricultura, Herborismo e Caça. Eles ganham experiência, recebem o salário reservado e entregam recursos direto no armazém.',
      },
      {
        title: 'Especialidades e Habilidades',
        icon: '⭐',
        text: 'Cada morador possui características próprias e evolui em suas especialidades. Quanto maior o nível da profissão do morador, maior a eficiência e a chance de colheitas abundantes.',
      },
      {
        title: 'Moradores no Cenário',
        icon: '🚶‍♂️',
        text: 'Observe seus moradores caminhando por todo o vilarejo entre os alojamentos, a fogueira, a fonte e a bancada de trabalho, mantendo o refúgio sempre ativo e produtivo.',
      },
    ],
  },
  {
    id: 'crafting',
    title: 'Oficina & Fila de Ambições',
    badge: 'Capítulo 5',
    subtitle: 'Forje equipamentos de elite ou delegue a produção para os artesãos.',
    weaponKey: 'hammer',
    sections: [
      {
        title: 'Oficina Manual em Lote',
        icon: '⚡',
        text: 'Produza itens instantaneamente combinando recursos do armazém e partes de monstros. Você pode selecionar a quantidade (1x, 5x, 10x, 25x) e adicionar Catalisadores para aumentar a chance de itens Raros, Épicos e Lendários.',
      },
      {
        title: 'Fila de Ambições Comunitárias',
        icon: '🎯',
        text: 'Defina metas de equipamentos na aba de Ambições. Os moradores artesãos forjarão essas peças automaticamente até obter a raridade desejada, guardando o resultado no Arsenal do Refúgio!',
      },
      {
        title: 'Arsenal do Assentamento',
        icon: '👑',
        text: 'Equipamentos forjados por ambições ficam salvos no Arsenal Comunitário. Basta clicar em "Levar à mochila" para equipá-los em seu herói.',
      },
    ],
  },
];

export const GameTutorialModal: React.FC<GameTutorialModalProps> = ({ isOpen, onClose }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    return localStorage.getItem('atlas_tutorial_dont_show_auto') === 'true';
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('atlas_tutorial_dont_show_auto', 'true');
    } else {
      localStorage.removeItem('atlas_tutorial_dont_show_auto');
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentChapter = TUTORIAL_CHAPTERS[activeChapterIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="pixel-card-gold rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header do Guia */}
        <div className="pixel-card-header pixel-card-header-gold px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 pixel-slot rounded flex items-center justify-center bg-slate-900 border-amber-500/40">
              <PixelItemSprite name="livro" size="sm" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-pixel-heading text-amber-300 flex items-center gap-2">
                <span>Guia do Aventureiro & Manual do Jogo</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                  v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-pixel-body">
                Aprenda tudo sobre combate, forja, acampamento e economia comunitária.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-xs"
            title="Fechar guia"
          >
            ✕
          </button>
        </div>

        {/* Abas dos Capítulos */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex gap-2 overflow-x-auto">
          {TUTORIAL_CHAPTERS.map((ch, idx) => {
            const isActive = idx === activeChapterIndex;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterIndex(idx)}
                className={`px-3 py-1.5 rounded text-xs font-pixel-body whitespace-nowrap transition flex items-center gap-2 ${
                  isActive
                    ? 'pixel-btn pixel-btn-gold text-slate-950 font-bold'
                    : 'pixel-btn pixel-btn-dark text-slate-300'
                }`}
              >
                <PixelItemSprite slotType={ch.slotKey} weaponType={ch.weaponKey} size="sm" />
                <span>{ch.title}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo Principal do Capítulo */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 font-pixel-body">
          <div className="pixel-slot p-4 rounded-xl flex items-start gap-3 bg-slate-950/80 border-amber-500/30">
            <div className="p-2 pixel-slot rounded-lg bg-slate-900 border-amber-500/40 shrink-0">
              <PixelItemSprite slotType={currentChapter.slotKey} weaponType={currentChapter.weaponKey} size="md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-pixel-heading font-bold text-amber-400">
                  {currentChapter.badge}
                </span>
                <h3 className="text-sm font-pixel-heading font-bold text-slate-100">
                  {currentChapter.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {currentChapter.subtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentChapter.sections.map((sec, i) => (
              <div
                key={i}
                className="pixel-slot p-4 rounded-xl flex flex-col justify-between gap-2.5 bg-slate-950/70"
              >
                <div>
                  <h4 className="text-xs font-pixel-heading font-bold text-slate-200 flex items-center gap-2">
                    <span>{sec.title}</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    {sec.text}
                  </p>
                </div>

                {sec.tip && (
                  <div className="mt-1 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 leading-snug flex items-start gap-1.5">
                    <span className="shrink-0">💡</span>
                    <span><strong>Dica:</strong> {sec.tip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé com Navegação e Checkbox */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 font-pixel-body">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <span>Não abrir automaticamente ao iniciar</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              disabled={activeChapterIndex === 0}
              onClick={() => setActiveChapterIndex((prev) => Math.max(0, prev - 1))}
              className="pixel-btn pixel-btn-dark px-3 py-1.5 text-xs font-pixel-heading disabled:opacity-30"
            >
              ◀ Anterior
            </button>

            {activeChapterIndex < TUTORIAL_CHAPTERS.length - 1 ? (
              <button
                onClick={() => setActiveChapterIndex((prev) => Math.min(TUTORIAL_CHAPTERS.length - 1, prev + 1))}
                className="pixel-btn pixel-btn-gold px-4 py-1.5 text-xs font-pixel-heading"
              >
                Próximo ▶
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="pixel-btn pixel-btn-emerald px-4 py-1.5 text-xs font-pixel-heading"
              >
                ✓ Entendido!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};