package game

// A colisão permanece autoritativa no backend. Os objetos são declarados em
// arena_terrain.go e compilados uma vez em uma grade compartilhada.

type arenaMover uint8

const (
	arenaHeroMover arenaMover = iota
	arenaMonsterMover
)

func arenaTileBlockedByLayout(region string, x, y int) bool {
	return arenaTileFlagsAt(region, x, y).Has(ArenaTileSolid)
}

// canOccupyArenaTile considera tanto objetos sólidos quanto atores vivos.
// Um alvo nunca é substituído pelo ator que o persegue: eles precisam parar
// em tiles vizinhos para que ataque, fuga e separação continuem legíveis.
func (s *GameSession) canOccupyArenaTile(x, y int, mover arenaMover, ignoreMonsterID string) bool {
	if s == nil {
		return false
	}
	grid := arenaTerrainGridForRegion(s.ActiveRegion)
	if !grid.InBounds(x, y) {
		return false
	}
	if arenaTileBlockedByLayout(s.ActiveRegion, x, y) {
		return false
	}

	if mover == arenaMonsterMover && s.HeroGridX == x && s.HeroGridY == y {
		return false
	}
	for index := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[index]
		if mob.Health <= 0 || mob.ID == ignoreMonsterID {
			continue
		}
		if mob.GridX == x && mob.GridY == y {
			return false
		}
	}
	return true
}

func arenaCandidateTiles(x, y int) [][2]int {
	// A ordem dá preferência ao avanço direto, depois às alternativas
	// ortogonais e diagonais. O score do chamador decide qual delas progride.
	return [][2]int{
		{x - 1, y - 1}, {x, y - 1}, {x + 1, y - 1},
		{x - 1, y}, {x + 1, y},
		{x - 1, y + 1}, {x, y + 1}, {x + 1, y + 1},
	}
}

func (s *GameSession) stepArenaToward(x, y, targetX, targetY int, ignoreMonsterID string) (int, int) {
	width, height := s.arenaDimensions()
	directX, directY := stepGridTowardWithin(x, y, targetX, targetY, width, height)
	candidates := [][2]int{{directX, directY}}
	candidates = append(candidates, arenaCandidateTiles(x, y)...)
	mover := arenaMoverForID(ignoreMonsterID)
	if (directX != x || directY != y) && s.canOccupyArenaTile(directX, directY, mover, ignoreMonsterID) {
		return directX, directY
	}
	if path := s.arenaPathToTarget(x, y, targetX, targetY, mover, ignoreMonsterID); len(path) > 1 {
		return path[1][0], path[1][1]
	}

	bestX, bestY := x, y
	bestDistance := gridDistance(x, y, targetX, targetY)
	seen := make(map[[2]int]struct{}, len(candidates))
	for _, candidate := range candidates {
		candidateX := s.clampArenaX(candidate[0])
		candidateY := s.clampArenaY(candidate[1])
		key := [2]int{candidateX, candidateY}
		if _, exists := seen[key]; exists || (candidateX == x && candidateY == y) {
			continue
		}
		seen[key] = struct{}{}
		if !s.canOccupyArenaTile(candidateX, candidateY, mover, ignoreMonsterID) {
			continue
		}
		distance := gridDistance(candidateX, candidateY, targetX, targetY)
		if distance < bestDistance {
			bestX, bestY, bestDistance = candidateX, candidateY, distance
		}
	}
	return bestX, bestY
}

// arenaPathToTarget permanece limitado à grade da região e só é usado quando
// o passo direto foi bloqueado. O alvo pode ser uma casa ocupada pelo outro
// ator; nesse caso ele é um terminal válido, mas não pode ser atravessado como
// parte do caminho.
func (s *GameSession) arenaPathToTarget(x, y, targetX, targetY int, mover arenaMover, ignoreMonsterID string) [][2]int {
	start := [2]int{x, y}
	goal := [2]int{s.clampArenaX(targetX), s.clampArenaY(targetY)}
	queue := [][2]int{start}
	visited := map[[2]int]struct{}{start: {}}
	previous := make(map[[2]int][2]int)
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if current == goal {
			path := [][2]int{current}
			for current != start {
				current = previous[current]
				path = append(path, current)
			}
			for left, right := 0, len(path)-1; left < right; left, right = left+1, right-1 {
				path[left], path[right] = path[right], path[left]
			}
			return path
		}

		for _, candidate := range arenaCandidateTiles(current[0], current[1]) {
			next := [2]int{s.clampArenaX(candidate[0]), s.clampArenaY(candidate[1])}
			if _, exists := visited[next]; exists {
				continue
			}
			if next != goal && !s.canOccupyArenaTile(next[0], next[1], mover, ignoreMonsterID) {
				continue
			}
			if next[0] != current[0] && next[1] != current[1] {
				if arenaTileBlockedByLayout(s.ActiveRegion, next[0], current[1]) || arenaTileBlockedByLayout(s.ActiveRegion, current[0], next[1]) {
					continue
				}
			}
			visited[next] = struct{}{}
			previous[next] = current
			queue = append(queue, next)
		}
	}
	return nil
}

func arenaMoverForID(ignoreMonsterID string) arenaMover {
	if ignoreMonsterID != "" {
		return arenaMonsterMover
	}
	return arenaHeroMover
}

func (s *GameSession) stepArenaAway(x, y, threatX, threatY int, ignoreMonsterID string) (int, int) {
	currentDistance := gridDistance(x, y, threatX, threatY)
	width, height := s.arenaDimensions()
	directX, directY := stepGridAwayWithin(x, y, threatX, threatY, width, height)
	if (directX != x || directY != y) && s.canOccupyArenaTile(directX, directY, arenaMoverForID(ignoreMonsterID), ignoreMonsterID) {
		// A fuga sem obstáculos mantém o vetor original (inclusive a direção
		// cardinal). As alternativas abaixo só entram quando a casa direta é
		// realmente ocupada ou quando o ator está encostado no limite.
		return directX, directY
	}
	candidates := [][2]int{{directX, directY}}
	candidates = append(candidates, arenaCandidateTiles(x, y)...)

	bestX, bestY := x, y
	bestDistance := currentDistance
	seen := make(map[[2]int]struct{}, len(candidates))
	for _, candidate := range candidates {
		candidateX := s.clampArenaX(candidate[0])
		candidateY := s.clampArenaY(candidate[1])
		key := [2]int{candidateX, candidateY}
		if _, exists := seen[key]; exists || (candidateX == x && candidateY == y) {
			continue
		}
		seen[key] = struct{}{}
		if !s.canOccupyArenaTile(candidateX, candidateY, arenaMoverForID(ignoreMonsterID), ignoreMonsterID) {
			continue
		}
		distance := gridDistance(candidateX, candidateY, threatX, threatY)
		if distance > bestDistance {
			bestX, bestY, bestDistance = candidateX, candidateY, distance
		}
	}
	return bestX, bestY
}

// placeMonsterAtSpawn mantém o spawn visual espalhado, mas evita que uma
// futura decoração sólida ou duas entradas concorrentes coloquem o monstro
// dentro de uma casa/árvore ou sobre outro ator.
func (s *GameSession) placeMonsterAtSpawn(mob *Monster, index int) {
	if mob == nil {
		return
	}
	width, height := s.arenaDimensions()
	startX, startY := arenaSpawnPointWithin(width, height, index)
	queue := [][2]int{{startX, startY}}
	visited := map[[2]int]struct{}{{startX, startY}: {}}
	for len(queue) > 0 {
		point := queue[0]
		queue = queue[1:]
		if s.canOccupyArenaTile(point[0], point[1], arenaMonsterMover, mob.ID) {
			mob.GridX, mob.GridY = point[0], point[1]
			return
		}
		for _, candidate := range arenaCandidateTiles(point[0], point[1]) {
			candidateX := s.clampArenaX(candidate[0])
			candidateY := s.clampArenaY(candidate[1])
			key := [2]int{candidateX, candidateY}
			if _, exists := visited[key]; exists {
				continue
			}
			visited[key] = struct{}{}
			queue = append(queue, key)
		}
	}
	mob.GridX, mob.GridY = startX, startY
}

func (s *GameSession) nearestArenaFreeTile(startX, startY int, mover arenaMover, ignoreMonsterID string) (int, int) {
	startX, startY = s.clampArenaX(startX), s.clampArenaY(startY)
	queue := [][2]int{{startX, startY}}
	visited := map[[2]int]struct{}{{startX, startY}: {}}
	for len(queue) > 0 {
		point := queue[0]
		queue = queue[1:]
		if s.canOccupyArenaTile(point[0], point[1], mover, ignoreMonsterID) {
			return point[0], point[1]
		}
		for _, candidate := range arenaCandidateTiles(point[0], point[1]) {
			candidateX := s.clampArenaX(candidate[0])
			candidateY := s.clampArenaY(candidate[1])
			key := [2]int{candidateX, candidateY}
			if _, exists := visited[key]; exists {
				continue
			}
			visited[key] = struct{}{}
			queue = append(queue, key)
		}
	}
	return startX, startY
}

// Saves antigos podem ter uma posição visual dentro de um objeto que foi
// adicionado depois. Corrigir somente esse caso na entrada do tick evita
// deixar um ator preso, sem teleportar atores que já estão em tiles válidos.
func (s *GameSession) normalizeArenaPositions() {
	if s == nil {
		return
	}
	if !s.canOccupyArenaTile(s.HeroGridX, s.HeroGridY, arenaHeroMover, "") {
		s.HeroGridX, s.HeroGridY = s.nearestArenaFreeTile(s.HeroGridX, s.HeroGridY, arenaHeroMover, "")
	}
	for index := range s.CurrentMonsters {
		mob := &s.CurrentMonsters[index]
		if mob.Health <= 0 || s.canOccupyArenaTile(mob.GridX, mob.GridY, arenaMonsterMover, mob.ID) {
			continue
		}
		mob.GridX, mob.GridY = s.nearestArenaFreeTile(mob.GridX, mob.GridY, arenaMonsterMover, mob.ID)
	}
}