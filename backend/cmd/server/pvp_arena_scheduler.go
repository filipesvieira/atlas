package main

import (
	"context"
	"log"
	"time"

	"github.com/atlas/backend/internal/db"
	"github.com/atlas/backend/pkg/game"
)

const pvpArenaLeadershipRetry = 5 * time.Second

// startPvPArenaScheduler mantém uma única simulação de duelo no cluster. As
// sessões WebSocket podem permanecer em outras réplicas: os deltas seguem pelo
// stream social e cada gateway só entrega para suas conexões locais.
func startPvPArenaScheduler() {
	go func() {
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			leadership, acquired, err := db.TryAcquirePvPArenaLeadership(ctx)
			cancel()
			if err != nil {
				log.Printf("arena PvP: erro ao disputar liderança: %v", err)
				time.Sleep(pvpArenaLeadershipRetry)
				continue
			}
			if !acquired {
				time.Sleep(pvpArenaLeadershipRetry)
				continue
			}
			log.Printf("🟣 Scheduler global de arenas PvP assumido por esta réplica")
			runPvPArenaLeader(leadership)
			releaseCtx, releaseCancel := context.WithTimeout(context.Background(), 3*time.Second)
			if err := leadership.Release(releaseCtx); err != nil {
				log.Printf("arena PvP: erro ao liberar liderança: %v", err)
			}
			releaseCancel()
		}
	}()
}

func runPvPArenaLeader(leadership *db.PvPArenaLeadership) {
	ticker := time.NewTicker(game.PvPCombatTickInterval)
	defer ticker.Stop()
	instances := map[string]*game.PvPCombatInstance{}
	lastRefresh := time.Time{}
	lastPing := time.Time{}

	for now := range ticker.C {
		if lastPing.IsZero() || now.Sub(lastPing) >= 3*time.Second {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			err := leadership.Ping(ctx)
			cancel()
			if err != nil {
				log.Printf("arena PvP: liderança perdida: %v", err)
				return
			}
			lastPing = now
		}
		if lastRefresh.IsZero() || now.Sub(lastRefresh) >= time.Second {
			if !refreshPvPArenaInstances(instances) {
				// Sem refresh confiável, não avançamos memória que talvez não
				// consiga persistir; a próxima líder retomará o último pulso.
				continue
			}
			lastRefresh = now
		}
		for matchID, instance := range instances {
			snapshot := instance.Tick(now.UTC())
			runtime := instance.RuntimeState()
			runtime.Snapshot = snapshot
			if err := db.PersistPvPCombatRuntime(runtime, now.UTC()); err != nil {
				log.Printf("arena PvP: erro ao persistir %s: %v", matchID, err)
				delete(instances, matchID)
				continue
			}
			participants := make([]string, 0, len(snapshot.Actors))
			for _, actor := range snapshot.Actors {
				participants = append(participants, actor.CharacterID)
			}
			if err := multiplayerHub.publishPvPCombat(participants, snapshot); err != nil {
				log.Printf("arena PvP: estado persistido, mas não foi publicado para %s: %v", matchID, err)
			}
			if snapshot.Status == game.PvPMatchCompleted || snapshot.Status == game.PvPMatchCancelled {
				delete(instances, matchID)
			}
		}
	}
}

func refreshPvPArenaInstances(instances map[string]*game.PvPCombatInstance) bool {
	if paired, err := db.MatchPvPQueue(time.Now().UTC(), 10); err != nil {
		log.Printf("arena PvP: erro no matchmaking: %v", err)
		return false
	} else {
		for _, match := range paired {
			for _, participant := range match.Participants {
				if err := multiplayerHub.publishPvPMatch(participant.CharacterID, match); err != nil {
					log.Printf("arena PvP: match encontrado %s, mas aviso falhou para %s: %v", match.ID, participant.CharacterID, err)
				}
			}
		}
	}
	if expired, err := db.ExpireReadyPvPMatches(time.Now().UTC()); err != nil {
		log.Printf("arena PvP: erro ao expirar confirmações pendentes: %v", err)
		return false
	} else if expired > 0 {
		log.Printf("arena PvP: %d confirmação(ões) expirada(s)", expired)
	}
	matches, err := db.ListActivePvPMatches(100)
	if err != nil {
		log.Printf("arena PvP: erro ao carregar partidas ativas: %v", err)
		return false
	}
	activeIDs := make(map[string]struct{}, len(matches))
	for _, match := range matches {
		activeIDs[match.ID] = struct{}{}
		if _, exists := instances[match.ID]; exists {
			continue
		}
		var instance *game.PvPCombatInstance
		if match.RuntimeState != nil && match.RuntimeState.Snapshot.Tick > 0 {
			instance, err = game.RestorePvPCombatInstance(match, *match.RuntimeState)
		} else {
			instance, err = game.NewPvPCombatInstance(match)
		}
		if err != nil {
			log.Printf("arena PvP: partida %s inválida e não foi iniciada: %v", match.ID, err)
			continue
		}
		instances[match.ID] = instance
	}
	for matchID := range instances {
		if _, active := activeIDs[matchID]; !active {
			delete(instances, matchID)
		}
	}
	return true
}
