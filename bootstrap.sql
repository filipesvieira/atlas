CREATE TABLE IF NOT EXISTS base_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	slot VARCHAR(50) NOT NULL,
	base_atk INT NOT NULL DEFAULT 0,
	base_def INT NOT NULL DEFAULT 0,
	base_weight FLOAT NOT NULL DEFAULT 1.0,
	tier INT NOT NULL DEFAULT 1,
	special_effect VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS base_monsters (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	base_health INT NOT NULL,
	base_attack INT NOT NULL,
	min_level INT NOT NULL DEFAULT 1,
	max_level INT NOT NULL DEFAULT 999,
	region_id VARCHAR(100) NOT NULL
);

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
('Botas de Couro', 'boots', 0, 1, 9.0, 1),
('Botas de Aço', 'boots', 0, 3, 22.0, 1),
('Sandálias de Velocidade', 'boots', 0, 1, 5.0, 2),
('Escudo de Madeira', 'offhand', 0, 12, 40.0, 1),
('Escudo de Aço', 'offhand', 0, 22, 65.0, 1),
('Escudo Torre', 'offhand', 0, 35, 95.0, 2),
('Livro de Magia', 'offhand', 5, 2, 12.0, 1);

INSERT INTO base_monsters (name, base_health, base_attack, min_level, max_level, region_id) VALUES
('Goblin', 40, 8, 1, 5, 'forest'),
('Lobo Selvagem', 60, 12, 1, 5, 'forest'),
('Aranha Gigante', 75, 14, 1, 5, 'forest'),
('Orc Guerreiro', 150, 18, 5, 12, 'orcruins'),
('Troll das Cavernas', 200, 22, 5, 12, 'orcruins'),
('Orc Mago', 130, 26, 5, 12, 'orcruins'),
('Bandido dos Ermos', 120, 20, 5, 12, 'orcruins'),
('Esqueleto Guerreiro', 280, 32, 12, 20, 'frozen'),
('Zumbi Congelado', 350, 28, 12, 20, 'frozen'),
('Golem de Gelo', 500, 38, 12, 20, 'frozen'),
('Espectro do Gelo', 240, 45, 12, 20, 'frozen'),
('Necromante Sombrio', 450, 55, 20, 99, 'abyss'),
('Vampiro Ancestral', 650, 70, 20, 99, 'abyss'),
('Escorpião Infernal', 550, 60, 20, 99, 'abyss'),
('Dragão Vermelho', 1200, 110, 20, 99, 'abyss');
