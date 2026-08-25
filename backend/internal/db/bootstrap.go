package db

import (
	"database/sql"
	"fmt"
)

func BootstrapStaticData(db *sql.DB) error {
	var itemCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM base_items").Scan(&itemCount); err != nil {
		return fmt.Errorf("contando itens base: %w", err)
	}

	if itemCount == 0 {
		populateItemsQuery := `
		INSERT INTO base_items (name, slot, base_atk, base_def, base_weight, tier) VALUES
		('Espada de Aço', 'mainhand', 14, 2, 35.5, 1),
		('Machado de Guerra', 'mainhand', 18, 0, 52.0, 1),
		('Arco Longo', 'mainhand', 16, 1, 22.0, 1),
		('Cajado Rúnico', 'mainhand', 20, 0, 18.5, 1),
		('Clava de Ferro', 'mainhand', 17, 1, 48.0, 1),

		('Montante de Aço Negro', 'mainhand', 30, 4, 60.0, 2),
		('Arco Élfico', 'mainhand', 25, 2, 20.0, 2),
		('Cajado do Vazio', 'mainhand', 32, 0, 15.0, 2),
		('Maça Estelar', 'mainhand', 34, 2, 70.0, 2),

		('Capacete de Couro', 'head', 0, 4, 12.0, 1),
		('Elmo Rúnico', 'head', 2, 7, 28.0, 1),
		('Coifa de Prata', 'head', 0, 10, 34.0, 2),

		('Cota de Malha', 'chest', 0, 8, 85.0, 1),
		('Peitoral de Platina', 'chest', 0, 14, 120.0, 2),
		('Robe Místico', 'chest', 4, 9, 25.0, 2),

		('Calça de Couro', 'legs', 0, 3, 18.0, 1),
		('Grevas de Aço', 'legs', 0, 6, 45.0, 1),
		('Saiote dos Magos', 'legs', 2, 4, 14.0, 1),

		('Botas de Couro', 'boots', 0, 2, 9.0, 1),
		('Botas de Ferro', 'boots', 0, 4, 22.0, 1),

		('Escudo de Madeira', 'offhand', 0, 12, 40.0, 1),
		('Escudo de Batalha', 'offhand', 0, 18, 75.0, 1),
		('Orbe Protetor', 'offhand', 0, 14, 10.0, 1),
		('Escudo do Dragão', 'offhand', 0, 25, 60.0, 2),

		('Mochila de Aventureiro', 'bag', 0, 0, 15.0, 1),
		('Bolsa Rúnica', 'bag', 0, 1, 8.0, 1),

		('Virotes Perfurantes', 'ammo', 12, 0, 3.5, 1),
		('Flechas Incendiárias', 'ammo', 15, 0, 2.0, 1),

		('Amuleto do Lobo', 'necklace', 2, 2, 1.5, 1),
		('Anel de Ouro', 'ring', 0, 3, 0.8, 1),

		('Tome: Golpe Giratório', 'skill_book', 0, 0, 25.0, 1),
		('Manual: Tiro Quádruplo', 'skill_book', 0, 0, 18.0, 1),
		('Livro: Bola de Fogo', 'skill_book', 0, 0, 22.0, 1),
		('Livro: Cura Divina', 'skill_book', 0, 0, 20.0, 1);
		`
		if _, err := db.Exec(populateItemsQuery); err != nil {
			return fmt.Errorf("populando itens base: %w", err)
		}
	}

	var monsterCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM base_monsters").Scan(&monsterCount); err != nil {
		return fmt.Errorf("contando monstros base: %w", err)
	}

	if monsterCount == 0 {
		populateMonstersQuery := `
		INSERT INTO base_monsters (name, base_health, base_attack, min_level, max_level, region_id) VALUES
		('Goblin', 40, 8, 1, 99, 'forest'),
		('Lobo Selvagem', 60, 12, 1, 99, 'forest'),
		('Aranha Gigante', 75, 14, 1, 99, 'forest'),

		('Orc Guerreiro', 150, 18, 1, 99, 'orcruins'),
		('Troll das Cavernas', 200, 22, 1, 99, 'orcruins'),
		('Orc Mago', 130, 26, 1, 99, 'orcruins'),
		('Bandido dos Ermos', 120, 20, 1, 99, 'orcruins'),

		('Esqueleto Guerreiro', 280, 32, 1, 99, 'frozen'),
		('Zumbi Congelado', 350, 28, 1, 99, 'frozen'),
		('Golem de Gelo', 500, 38, 1, 99, 'frozen'),
		('Espectro do Gelo', 240, 45, 1, 99, 'frozen'),

		('Necromante Sombrio', 450, 55, 1, 999, 'abyss'),
		('Vampiro Ancestral', 650, 70, 1, 999, 'abyss'),
		('Escorpião Infernal', 550, 60, 1, 999, 'abyss'),
		('Dragão Vermelho', 1200, 110, 1, 999, 'abyss');
		`
		if _, err := db.Exec(populateMonstersQuery); err != nil {
			return fmt.Errorf("populando monstros base: %w", err)
		}
	}
	return nil
}