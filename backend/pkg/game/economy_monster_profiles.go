package game

import "sync"

var economyMonsterProfilesOnce sync.Once

// MonsterPartByMonster é o vínculo canônico entre uma criatura e seu material
// temático. Recursos de profissão nunca aparecem neste catálogo.
var MonsterPartByMonster = map[string]string{
	"forest_goblin": "part_goblin_ear", "forest_wolf": "part_wolf_fang", "forest_spider": "part_spider_silk", "forest_boss_bear": "part_bear_claw",
	"shereque_ogre": "part_ogre_wart", "shereque_donkey": "part_donkey_tooth", "shereque_boss_fiona": "part_fiona_tiara_shard",
	"chapolin_pirate": "part_pirate_hook", "chapolin_tripa": "part_tripa_belt", "chapolin_bandit": "part_bandit_mask", "chapolin_boss_alma": "part_black_soul_emblem",
	"orcruins_orc": "part_orc_tusk", "orcruins_orc_mage": "part_orc_rune", "orcruins_skeleton": "part_skeleton_bone", "orcruins_orc_archer": "part_orc_bowstring", "orcruins_berserker": "part_berserker_buckle", "orcruins_boss_skeleton": "part_skeleton_bone",
	"esgotos_ninja": "part_ninja_cloth", "esgotos_rat": "part_rat_tongue", "esgotos_boss_destroyer": "part_destroyer_blade",
	"planalto_militante": "part_militant_shirt", "planalto_patriota": "part_patriot_flag", "planalto_pulica": "part_riot_plate", "planalto_boss_xandaum": "part_xandaum_pen",
	"rogartes_dementor": "part_dementor_cloth", "rogartes_troll": "part_troll_hide", "rogartes_boss_darkmage": "part_dark_wand",
	"frozen_specter": "part_frozen_soul", "frozen_zombie": "part_zombie_frost", "frozen_golem": "part_golem_core", "frozen_chimera": "part_chimera_horn", "frozen_boss_master": "part_sanctuary_crown",
	"abyss_dragon": "part_dragon_scale", "abyss_demon": "part_demon_horn", "abyss_vampire": "part_vampire_fang", "abyss_necromancer": "part_necromancer_rune", "abyss_scorpion": "part_scorpion_stinger", "abyss_flame_lord": "part_flame_heart", "abyss_boss_avenger": "part_avenger_horn",
}

var bossTrophyByMonster = map[string]string{
	"forest_boss_bear": "trophy_forest_bear", "shereque_boss_fiona": "trophy_shereque_fiona", "chapolin_boss_alma": "trophy_chapolin_alma",
	"orcruins_boss_skeleton": "trophy_orcruins_skeleton", "esgotos_boss_destroyer": "trophy_esgotos_destroyer", "planalto_boss_xandaum": "trophy_planalto_xandaum",
	"rogartes_boss_darkmage": "trophy_rogartes_darkmage", "frozen_boss_master": "trophy_frozen_master", "abyss_boss_avenger": "trophy_abyss_avenger",
}

// applyEconomyMonsterProfiles substitui os perfis legados de matéria-prima por
// partes temáticas. As chaves antigas continuam registradas para saves e obras.
func applyEconomyMonsterProfiles() {
	monsterResourceProfileMu.Lock()
	defer monsterResourceProfileMu.Unlock()
	for monsterKey, resourceKey := range MonsterPartByMonster {
		isBoss := bossTrophyByMonster[monsterKey] != ""
		profile := MonsterResourceProfile{
			// Partes temáticas comuns: 20% de chance de dropar 1 unidade
			Drops: []ResourceDropDefinition{{ResourceKey: resourceKey, Chance: 0.20, MinQuantity: 1, MaxQuantity: 1}},
		}
		if isBoss {
			// Partes temáticas de chefe para a forja: 30% de chance de dropar 1 unidade
			profile.Drops[0].Chance = 0.30
			profile.Drops[0].MinQuantity = 1
			profile.Drops[0].MaxQuantity = 1
			// Troféu do chefe: 100% garantido como referencial histórico / de contagem de derrotas
			profile.GuaranteedDrops = append(profile.GuaranteedDrops, ResourceDropDefinition{
				ResourceKey: bossTrophyByMonster[monsterKey], Chance: 1, MinQuantity: 1, MaxQuantity: 1,
			})
			// Chefes abastecem catalisadores especiais com baixa frequência
			profile.Drops = append(profile.Drops, ResourceDropDefinition{ResourceKey: "quality_dust", Chance: 0.10, MinQuantity: 1, MaxQuantity: 1})
			if monsterKey == "frozen_boss_master" || monsterKey == "abyss_boss_avenger" {
				profile.Drops = append(profile.Drops, ResourceDropDefinition{ResourceKey: "prismatic_core", Chance: 0.05, MinQuantity: 1, MaxQuantity: 1})
			}
		}
		MonsterResourceProfileMap[monsterKey] = profile
	}
}

func init() {
	EnsureEconomyMonsterProfilesApplied()
}

func EnsureEconomyMonsterProfilesApplied() {
	economyMonsterProfilesOnce.Do(applyEconomyMonsterProfiles)
}