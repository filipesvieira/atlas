package game

import (
	"fmt"
	"math/rand"
)

// SkillContext contém os dados necessários para executar uma habilidade.
type SkillContext struct {
	Character       *CharacterData
	DerivedStats    *DerivedStats
	Equipment       *EquipmentSlots
	Monsters        []*Monster
	Random          *rand.Rand
	WeaponType      string
	MagicMasteryLvl int
}

// SkillResult representa a consequência autoritativa da execução da habilidade.
type SkillResult struct {
	DamageDealt     int
	HealingDone     int
	TargetIDs       []string
	IsCritical      bool
	AppliedStatuses []AppliedStatus
	MasteryTries    map[string]int
	LogMessage      string
	VisualKey       string
}

// SkillDefinition define os metadados e a função de execução de uma habilidade.
type SkillDefinition struct {
	Key               string                               `json:"key"`
	Name              string                               `json:"name"`
	Icon              string                               `json:"icon"`
	Description       string                               `json:"description"`
	ManaCost          int                                  `json:"mana_cost"`
	MinLevel          int                                  `json:"min_level"`
	CooldownTicks     int                                  `json:"cooldown_ticks"`
	CooldownSeconds   float64                              `json:"cooldown_seconds"`
	AllowedArchetypes []string                             `json:"allowed_archetypes"` // "melee", "distance", "magic"
	TargetType        string                               `json:"target_type"`        // "single", "area", "self"
	VisualKey         string                               `json:"visual_key"`
	CanExecute        func(ctx *SkillContext) bool         `json:"-"`
	Execute           func(ctx *SkillContext) *SkillResult `json:"-"`
}

var skillRegistry = map[string]SkillDefinition{}

// InitialCombatSkillUnlockLevel libera o kit base de combate sem depender de
// livros. Como Atlas é classless, o personagem recebe as três opções iniciais
// e usa automaticamente apenas a que corresponde à arma equipada.
const InitialCombatSkillUnlockLevel = 10

var initialCombatSkillKeys = []string{"whirlwind", "multishot", "arcane_nova"}

func hasSkill(skills []string, key string) bool {
	for _, skill := range skills {
		if skill == key {
			return true
		}
	}
	return false
}

// UnlockInitialCombatSkills é idempotente e também atualiza personagens que
// já ultrapassaram o nível 10 antes desta regra existir.
func UnlockInitialCombatSkills(char *CharacterData) []string {
	if char == nil || char.Level < InitialCombatSkillUnlockLevel {
		return nil
	}
	if char.LearnedSkills == nil {
		char.LearnedSkills = []string{}
	}
	unlocked := make([]string, 0, len(initialCombatSkillKeys))
	for _, key := range initialCombatSkillKeys {
		if !hasSkill(char.LearnedSkills, key) {
			char.LearnedSkills = append(char.LearnedSkills, key)
			unlocked = append(unlocked, key)
		}
	}
	return unlocked
}

// ActivateInitialSkillForArchetype deixa a primeira habilidade da arma atual
// pronta para uso sem substituir escolhas ativas já existentes.
func ActivateInitialSkillForArchetype(char *CharacterData, archetype string) string {
	if char == nil || char.Level < InitialCombatSkillUnlockLevel || len(char.ActiveSkills) >= 2 {
		return ""
	}
	for _, key := range initialCombatSkillKeys {
		if !hasSkill(char.LearnedSkills, key) || hasSkill(char.ActiveSkills, key) || !IsSkillAllowedForArchetype(key, archetype) {
			continue
		}
		char.ActiveSkills = append(char.ActiveSkills, key)
		return key
	}
	return ""
}

func init() {
	// 1. WHIRLWIND (Golpe Giratório) — Melee em Área (Cooldown: 3 ticks / 2.25s)
	RegisterSkill(SkillDefinition{
		Key:               "whirlwind",
		Name:              "Golpe Giratório",
		Icon:              "🌀",
		Description:       "Gira 360° desferindo 90% do dano de ataque a toda a horda inimiga.",
		ManaCost:          18,
		MinLevel:          InitialCombatSkillUnlockLevel,
		CooldownTicks:     3,
		CooldownSeconds:   2.25,
		AllowedArchetypes: []string{"melee"},
		TargetType:        "area",
		VisualKey:         "whirlwind",
		Execute: func(ctx *SkillContext) *SkillResult {
			bonusDmg := int(float64(ctx.DerivedStats.TotalAttack) * 0.90)
			if bonusDmg < 1 {
				bonusDmg = 1
			}
			targetIDs := []string{}
			totalDmg := 0
			for _, m := range ctx.Monsters {
				if m.Health > 0 {
					m.Health -= bonusDmg
					targetIDs = append(targetIDs, m.ID)
					totalDmg += bonusDmg
				}
			}
			tries := map[string]int{}
			switch ctx.WeaponType {
			case WeaponTypeAxe:
				tries["axe"] = 1
			case WeaponTypeClub:
				tries["club"] = 1
			default:
				tries["sword"] = 1
			}
			return &SkillResult{
				DamageDealt:  totalDmg,
				TargetIDs:    targetIDs,
				MasteryTries: tries,
				VisualKey:    "whirlwind",
				LogMessage:   fmt.Sprintf(" [HABILIDADE: Golpe Giratório] Custo: 18 Mana | Dano em Área: %d!", bonusDmg),
			}
		},
	})

	// 2. BRUTAL STRIKE (Golpe Brutal) — Melee Pesado Alvo Único (Cooldown: 5 ticks / 3.75s)
	RegisterSkill(SkillDefinition{
		Key:               "brutal_strike",
		Name:              "Golpe Brutal",
		Icon:              "💥",
		Description:       "Impacto corporal massivo que desfere 175% do dano de ataque no monstro primário.",
		ManaCost:          22,
		MinLevel:          8,
		CooldownTicks:     5,
		CooldownSeconds:   3.75,
		AllowedArchetypes: []string{"melee"},
		TargetType:        "single",
		VisualKey:         "brutal_strike",
		Execute: func(ctx *SkillContext) *SkillResult {
			var target *Monster
			for _, m := range ctx.Monsters {
				if m.Health > 0 {
					target = m
					break
				}
			}
			if target == nil {
				return nil
			}
			dmg := int(float64(ctx.DerivedStats.TotalAttack) * 1.75)
			if dmg < 1 {
				dmg = 1
			}
			target.Health -= dmg
			tries := map[string]int{}
			switch ctx.WeaponType {
			case WeaponTypeAxe:
				tries["axe"] = 2
			case WeaponTypeClub:
				tries["club"] = 2
			default:
				tries["sword"] = 2
			}
			return &SkillResult{
				DamageDealt:  dmg,
				TargetIDs:    []string{target.ID},
				MasteryTries: tries,
				VisualKey:    "brutal_strike",
				LogMessage:   fmt.Sprintf(" [HABILIDADE: Golpe Brutal] Custo: 22 Mana | Dano Esmagador: %d no alvo primário!", dmg),
			}
		},
	})

	// 3. MULTISHOT (Tiro Quádruplo) — Distance em Leque (Cooldown: 3 ticks / 2.25s)
	RegisterSkill(SkillDefinition{
		Key:               "multishot",
		Name:              "Tiro Quádruplo",
		Icon:              "🏹",
		Description:       "Dispara uma salva de 4 flechas velozes (80% do ataque cada) contra a horda.",
		ManaCost:          16,
		MinLevel:          InitialCombatSkillUnlockLevel,
		CooldownTicks:     3,
		CooldownSeconds:   2.25,
		AllowedArchetypes: []string{"distance"},
		TargetType:        "area",
		VisualKey:         "multishot",
		Execute: func(ctx *SkillContext) *SkillResult {
			arrowDmg := int(float64(ctx.DerivedStats.TotalAttack) * 0.80)
			if arrowDmg < 1 {
				arrowDmg = 1
			}
			targetIDs := []string{}
			totalDmg := 0
			arrowsLeft := 4
			for _, m := range ctx.Monsters {
				if m.Health > 0 && arrowsLeft > 0 {
					m.Health -= arrowDmg
					targetIDs = append(targetIDs, m.ID)
					totalDmg += arrowDmg
					arrowsLeft--
				}
			}
			return &SkillResult{
				DamageDealt:  totalDmg,
				TargetIDs:    targetIDs,
				MasteryTries: map[string]int{"distance": 1},
				VisualKey:    "multishot",
				LogMessage:   fmt.Sprintf(" [HABILIDADE: Tiro Quádruplo] Custo: 16 Mana | Salva de Flechas: %d dano total!", totalDmg),
			}
		},
	})

	// 4. SNIPER SHOT (Tiro Preciso) — Distance com Crítico Garantido (Cooldown: 6 ticks / 4.50s)
	RegisterSkill(SkillDefinition{
		Key:               "sniper_shot",
		Name:              "Tiro Preciso",
		Icon:              "🎯",
		Description:       "Disparo cirúrgico de longa distância com 160% de dano e Crítico 100% Garantido.",
		ManaCost:          24,
		MinLevel:          8,
		CooldownTicks:     6,
		CooldownSeconds:   4.50,
		AllowedArchetypes: []string{"distance"},
		TargetType:        "single",
		VisualKey:         "sniper_shot",
		Execute: func(ctx *SkillContext) *SkillResult {
			var target *Monster
			for _, m := range ctx.Monsters {
				if m.Health > 0 {
					target = m
					break
				}
			}
			if target == nil {
				return nil
			}
			baseDmg := int(float64(ctx.DerivedStats.TotalAttack) * 1.60)
			critDmg := int(float64(baseDmg) * 1.50)
			if critDmg < 1 {
				critDmg = 1
			}
			target.Health -= critDmg
			return &SkillResult{
				DamageDealt:  critDmg,
				TargetIDs:    []string{target.ID},
				IsCritical:   true,
				MasteryTries: map[string]int{"distance": 2},
				VisualKey:    "sniper_shot",
				LogMessage:   fmt.Sprintf(" [HABILIDADE: Tiro Preciso] Custo: 24 Mana | ⚡ CRÍTICO GARANTIDO: %d de dano perfurante!", critDmg),
			}
		},
	})

	// 5. FIREBALL (Bola de Fogo) — Magia Concentrada de Alto Dano (Cooldown: 4 ticks / 3.00s)
	RegisterSkill(SkillDefinition{
		Key:               "fireball",
		Name:              "Bola de Fogo",
		Icon:              "🔥",
		Description:       "Conjura uma orbe ígnea incandescente que explode causando dano mágico concentrado.",
		ManaCost:          20,
		MinLevel:          12,
		CooldownTicks:     4,
		CooldownSeconds:   3.00,
		AllowedArchetypes: []string{"magic"},
		TargetType:        "single",
		VisualKey:         "fireball",
		Execute: func(ctx *SkillContext) *SkillResult {
			var target *Monster
			for _, m := range ctx.Monsters {
				if m.Health > 0 {
					target = m
					break
				}
			}
			if target == nil {
				return nil
			}
			magicDmg := 35 + int(float64(ctx.MagicMasteryLvl)*2.5) + (ctx.Character.Level / 3) + int(float64(ctx.DerivedStats.EffectiveINT)*0.6)
			target.Health -= magicDmg
			return &SkillResult{
				DamageDealt:  magicDmg,
				TargetIDs:    []string{target.ID},
				MasteryTries: map[string]int{"magic": 2},
				VisualKey:    "fireball",
				LogMessage:   fmt.Sprintf(" [MAGIA: Bola de Fogo] Custo: 20 Mana | Explosão Ígnea: %d de Dano Mágico!", magicDmg),
			}
		},
	})

	// 6. ICE SHARD (Estilhaço de Gelo) — Magia com Debuff de Slow (Cooldown: 5 ticks / 3.75s)
	RegisterSkill(SkillDefinition{
		Key:               "ice_shard",
		Name:              "Estilhaço de Gelo",
		Icon:              "❄️",
		Description:       "Dispara estilhaços glaciais causando dano mágico e aplicando Lentidão (Slow 30%) por 4 ticks.",
		ManaCost:          20,
		MinLevel:          20,
		CooldownTicks:     5,
		CooldownSeconds:   3.75,
		AllowedArchetypes: []string{"magic"},
		TargetType:        "single",
		VisualKey:         "ice_shard",
		Execute: func(ctx *SkillContext) *SkillResult {
			var target *Monster
			for _, m := range ctx.Monsters {
				if m.Health > 0 {
					target = m
					break
				}
			}
			if target == nil {
				return nil
			}
			magicDmg := 25 + int(float64(ctx.MagicMasteryLvl)*2.0) + (ctx.Character.Level / 4) + int(float64(ctx.DerivedStats.EffectiveINT)*0.4)
			target.Health -= magicDmg
			return &SkillResult{
				DamageDealt: magicDmg,
				TargetIDs:   []string{target.ID},
				AppliedStatuses: []AppliedStatus{
					{TargetID: target.ID, Key: "slow", Ticks: 4, Magnitude: 0.30},
				},
				MasteryTries: map[string]int{"magic": 2},
				VisualKey:    "ice_shard",
				LogMessage:   fmt.Sprintf(" [MAGIA: Estilhaço de Gelo] Custo: 20 Mana | %d Dano Mágico + ❄️ LENTIDÃO (-30%% Vel)!", magicDmg),
			}
		},
	})

	// 7. ARCANE NOVA (Nova Arcana) — Magia Inicial em Área (Cooldown: 6 ticks / 4.50s)
	RegisterSkill(SkillDefinition{
		Key:               "arcane_nova",
		Name:              "Nova Arcana",
		Icon:              "✦",
		Description:       "Libera uma explosão arcana que atinge até 4 inimigos próximos com dano mágico moderado.",
		ManaCost:          24,
		MinLevel:          InitialCombatSkillUnlockLevel,
		CooldownTicks:     6,
		CooldownSeconds:   4.50,
		AllowedArchetypes: []string{"magic"},
		TargetType:        "area",
		VisualKey:         "arcane_nova",
		Execute: func(ctx *SkillContext) *SkillResult {
			damagePerTarget := 18 + int(float64(ctx.MagicMasteryLvl)*1.8) + (ctx.Character.Level / 3) + int(float64(ctx.DerivedStats.EffectiveINT)*0.5)
			if damagePerTarget < 1 {
				damagePerTarget = 1
			}
			targetIDs := make([]string, 0, 4)
			totalDamage := 0
			for _, monster := range ctx.Monsters {
				if monster.Health <= 0 || len(targetIDs) >= 4 {
					continue
				}
				monster.Health -= damagePerTarget
				targetIDs = append(targetIDs, monster.ID)
				totalDamage += damagePerTarget
			}
			if len(targetIDs) == 0 {
				return nil
			}
			return &SkillResult{
				DamageDealt:  totalDamage,
				TargetIDs:    targetIDs,
				MasteryTries: map[string]int{"magic": 2},
				VisualKey:    "arcane_nova",
				LogMessage:   fmt.Sprintf(" [MAGIA: Nova Arcana] Custo: 24 Mana | %d de dano em %d alvo(s)!", totalDamage, len(targetIDs)),
			}
		},
	})

	// 8. DIVINE HEAL (Cura Divina) — Magia Sagrada de Suporte com Gatilho Inteligente (Cooldown: 7 ticks / 5.25s)
	RegisterSkill(SkillDefinition{
		Key:               "divine_heal",
		Name:              "Cura Divina",
		Icon:              "✨",
		Description:       "Invoca a luz dos deuses restaurando HP com base em INT quando a vida cai para 70% ou menos.",
		ManaCost:          28,
		MinLevel:          8,
		CooldownTicks:     7,
		CooldownSeconds:   5.25,
		AllowedArchetypes: []string{"magic", "melee", "distance", "wanderer"}, // Suporte universal
		TargetType:        "self",
		VisualKey:         "divine_heal",
		CanExecute: func(ctx *SkillContext) bool {
			// Gatilho Inteligente: Só consome mana e executa se o herói estiver ferido (HP <= 70%)
			if ctx.Character.MaxHealth <= 0 {
				return false
			}
			return (float64(ctx.Character.Health) / float64(ctx.Character.MaxHealth)) <= 0.70
		},
		Execute: func(ctx *SkillContext) *SkillResult {
			healAmount := 60 + int(float64(ctx.DerivedStats.EffectiveINT)*1.8) + (ctx.Character.Level * 2)
			ctx.Character.Health += healAmount
			if ctx.Character.Health > ctx.Character.MaxHealth {
				ctx.Character.Health = ctx.Character.MaxHealth
			}
			return &SkillResult{
				HealingDone:  healAmount,
				TargetIDs:    []string{"hero"},
				MasteryTries: map[string]int{"magic": 3},
				VisualKey:    "divine_heal",
				LogMessage:   fmt.Sprintf(" [FEITIÇO: Cura Divina] Custo: 28 Mana | ✨ +%d HP Sagrado!", healAmount),
			}
		},
	})
}

// RegisterSkill adiciona uma definição ao registro global.
func RegisterSkill(def SkillDefinition) {
	skillRegistry[def.Key] = def
}

// GetSkillDefinition retorna a definição de uma habilidade registrada.
func GetSkillDefinition(key string) (SkillDefinition, bool) {
	def, exists := skillRegistry[key]
	return def, exists
}

// ListAllSkills retorna todas as habilidades registradas para o catálogo público.
func ListAllSkills() []SkillDefinition {
	skills := make([]SkillDefinition, 0, len(skillRegistry))
	for _, def := range skillRegistry {
		skills = append(skills, def)
	}
	return skills
}

// IsSkillAllowedForArchetype verifica se a habilidade é compatível com o arquétipo atual.
func IsSkillAllowedForArchetype(skillKey, archetype string) bool {
	def, exists := skillRegistry[skillKey]
	if !exists {
		return false
	}
	for _, allowed := range def.AllowedArchetypes {
		if allowed == archetype {
			return true
		}
	}
	return false
}

// FilterActiveSkillsForArchetype filtra as habilidades ativas para manter apenas as compatíveis.
func FilterActiveSkillsForArchetype(activeSkills []string, archetype string) []string {
	valid := make([]string, 0, len(activeSkills))
	for _, key := range activeSkills {
		if IsSkillAllowedForArchetype(key, archetype) {
			valid = append(valid, key)
		}
	}
	return valid
}