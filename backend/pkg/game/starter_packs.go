package game

import "strings"

type StarterItemDefinition struct {
	TemplateName  string `json:"template_name"`
	Rarity        string `json:"rarity"`
	SpecialEffect string `json:"-"`
}

type StarterPackDefinition struct {
	ID        string                  `json:"id"`
	Aliases   []string                `json:"-"`
	Vocation  string                  `json:"vocation"`
	Title     string                  `json:"title"`
	Subtitle  string                  `json:"subtitle"`
	KitLabel  string                  `json:"kit_label"`
	StatFocus string                  `json:"stat_focus"`
	Details   []string                `json:"details"`
	Accent    string                  `json:"accent"`
	MainHand  *StarterItemDefinition  `json:"-"`
	OffHand   *StarterItemDefinition  `json:"-"`
	Ammo      *StarterItemDefinition  `json:"-"`
	Backpack  []StarterItemDefinition `json:"-"`
}

var StarterPacks = []StarterPackDefinition{
	{
		ID: "melee", Aliases: []string{"guerreiro", "guerreira"}, Vocation: "Guerreiro",
		Title: "⚔️ Guerreiro (Melee)", Subtitle: "Combate Corpo a Corpo & Defesa Sólida",
		KitLabel: "Espada do Aprendiz + Broquel de Madeira", StatFocus: "Força (FOR) & Vitalidade (VIT)", Accent: "amber",
		Details: []string{
			"🛡️ Permite equipar um Escudo no slot OffHand para alta mitigação de dano.",
			"⚔️ Cada ponto de FOR concede +1.5 de Dano Físico Melee.",
			"💪 Robusto para aguentar hordas em regiões de nível elevado.",
		},
		MainHand: &StarterItemDefinition{TemplateName: "Espada do Aprendiz", Rarity: "Comum", SpecialEffect: "Arma melee inicial"},
		OffHand:  &StarterItemDefinition{TemplateName: "Broquel de Madeira", Rarity: "Comum", SpecialEffect: "Escudo inicial"},
	},
	{
		ID: "distance", Aliases: []string{"arqueiro", "arqueira"}, Vocation: "Arqueiro",
		Title: "🏹 Arqueiro (Distância)", Subtitle: "Ataques de Precisão & Danos Críticos",
		KitLabel: "Arco Curvo + Flechas de Madeira", StatFocus: "Destreza (DES) & Vitalidade (VIT)", Accent: "emerald",
		Details: []string{
			"🎯 Armas de distância usam o slot Ammo para munição (Flechas/Virotes).",
			"⚠️ Armas de distância ocupam 2 Mãos e desequipam o Escudo automaticamente.",
			"⚡ Cada ponto em DES concede +1.5 Dano de Distância e +0.25% de Chance Crítica.",
		},
		MainHand: &StarterItemDefinition{TemplateName: "Arco Curvo", Rarity: "Comum", SpecialEffect: "Arma de distância inicial"},
		Ammo:     &StarterItemDefinition{TemplateName: "Flechas de Madeira", Rarity: "Comum", SpecialEffect: "Munição inicial"},
	},
	{
		ID: "magic", Aliases: []string{"mago", "maga"}, Vocation: "Mago",
		Title: "🔮 Mago (Mágico)", Subtitle: "Feitiços Arcanos & Varinhas Elementais",
		KitLabel: "Varinha do Aprendiz + Livro: Bola de Fogo", StatFocus: "Inteligência (INT) & Vitalidade (VIT)", Accent: "sky",
		Details: []string{
			"✨ Varinhas e cajados atacam com Dano Mágico escalado pela sua INT.",
			"📜 Ataques mágicos e feitiços de deck evoluem a Maestria de Magia.",
			"🔥 Acompanha o Livro de Bola de Fogo para aprender o primeiro feitiço em área.",
		},
		MainHand: &StarterItemDefinition{TemplateName: "Varinha do Aprendiz", Rarity: "Comum", SpecialEffect: "Arma mágica inicial"},
		Backpack: []StarterItemDefinition{{TemplateName: "Livro: Bola de Fogo", Rarity: "Raro", SpecialEffect: "Ensina a magia Bola de Fogo"}},
	},
}

func ResolveStarterPack(packIDOrAlias string) StarterPackDefinition {
	lookup := normalizeContentKey(packIDOrAlias)
	for _, pack := range StarterPacks {
		if normalizeContentKey(pack.ID) == lookup {
			return pack
		}
		for _, alias := range pack.Aliases {
			if strings.EqualFold(strings.TrimSpace(alias), lookup) {
				return pack
			}
		}
	}
	return StarterPacks[0]
}

func ListStarterPacks() []StarterPackDefinition {
	packs := make([]StarterPackDefinition, len(StarterPacks))
	copy(packs, StarterPacks)
	return packs
}
