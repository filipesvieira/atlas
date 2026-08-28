package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/atlas/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

const (
	redisPresenceSetKey = "atlas:presence:online:v1"
	redisPresencePrefix = "atlas:presence:character:v1:"
	redisPresenceTTL    = 60 * time.Second
	redisWSTicketPrefix = "atlas:ws-ticket:v1:"
)

type redisSocialBus struct {
	client *redis.Client
	ctx    context.Context
	cancel context.CancelFunc
	mu     sync.Mutex
	closed bool
}

func newRedisSocialBus(client *redis.Client) *redisSocialBus {
	ctx, cancel := context.WithCancel(context.Background())
	return &redisSocialBus{client: client, ctx: ctx, cancel: cancel}
}

func (b *redisSocialBus) Publish(topic string, event socialBusEvent) error {
	if b == nil || b.client == nil {
		return fmt.Errorf("barramento Redis indisponível")
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return b.client.Publish(b.ctx, topic, payload).Err()
}

func (b *redisSocialBus) Subscribe(topic string, handler func(socialBusEvent)) (func(), error) {
	if b == nil || b.client == nil || handler == nil {
		return nil, fmt.Errorf("assinatura social inválida")
	}
	ctx, cancel := context.WithCancel(b.ctx)
	pubsub := b.client.Subscribe(ctx, topic)
	if _, err := pubsub.Receive(ctx); err != nil {
		cancel()
		_ = pubsub.Close()
		return nil, err
	}
	channel := pubsub.Channel(redis.WithChannelSize(256))
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case message, ok := <-channel:
				if !ok {
					return
				}
				var event socialBusEvent
				if err := json.Unmarshal([]byte(message.Payload), &event); err != nil {
					log.Printf("evento social Redis inválido: %v", err)
					continue
				}
				handler(event)
			}
		}
	}()
	var once sync.Once
	return func() {
		once.Do(func() {
			cancel()
			_ = pubsub.Close()
		})
	}, nil
}

func (b *redisSocialBus) Close() error {
	if b == nil {
		return nil
	}
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return nil
	}
	b.closed = true
	b.mu.Unlock()
	b.cancel()
	// O cliente é compartilhado também pelo scheduler global. A instância que
	// criou o runtime é responsável por fechá-lo apenas se a inicialização
	// falhar; fechar o hub social não pode derrubar os demais canais.
	return nil
}

type redisSettlementSchedulerBus struct {
	client *redis.Client
	ctx    context.Context
}

func newRedisSettlementSchedulerBus(client *redis.Client) *redisSettlementSchedulerBus {
	return &redisSettlementSchedulerBus{client: client, ctx: context.Background()}
}

func (b *redisSettlementSchedulerBus) Publish(topic string, event settlementSchedulerEvent) error {
	if b == nil || b.client == nil {
		return fmt.Errorf("barramento Redis do scheduler indisponível")
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return b.client.Publish(b.ctx, topic, payload).Err()
}

func (b *redisSettlementSchedulerBus) Subscribe(topic string, handler func(settlementSchedulerEvent)) (func(), error) {
	if b == nil || b.client == nil || handler == nil {
		return nil, fmt.Errorf("assinatura do scheduler inválida")
	}
	ctx, cancel := context.WithCancel(b.ctx)
	pubsub := b.client.Subscribe(ctx, topic)
	if _, err := pubsub.Receive(ctx); err != nil {
		cancel()
		_ = pubsub.Close()
		return nil, err
	}
	channel := pubsub.Channel(redis.WithChannelSize(256))
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case message, ok := <-channel:
				if !ok {
					return
				}
				var event settlementSchedulerEvent
				if err := json.Unmarshal([]byte(message.Payload), &event); err != nil {
					log.Printf("evento Redis do scheduler inválido: %v", err)
					continue
				}
				handler(event)
			}
		}
	}()
	var once sync.Once
	return func() {
		once.Do(func() {
			cancel()
			_ = pubsub.Close()
		})
	}, nil
}

type redisPresenceStore struct {
	client *redis.Client
}

func newRedisPresenceStore(client *redis.Client) *redisPresenceStore {
	return &redisPresenceStore{client: client}
}

func redisPresenceKey(characterID string) string {
	return redisPresencePrefix + characterID
}

func redisPresenceExpiry(now time.Time) int64 {
	return now.Add(redisPresenceTTL).Unix()
}

func (s *redisPresenceStore) Register(characterID, ownerToken string, now time.Time) (int, error) {
	if s == nil || s.client == nil || characterID == "" || ownerToken == "" {
		return 0, fmt.Errorf("presença Redis inválida")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, redisPresenceKey(characterID), ownerToken, redisPresenceTTL)
	pipe.ZAdd(ctx, redisPresenceSetKey, redis.Z{Score: float64(redisPresenceExpiry(now)), Member: characterID})
	pipe.ZRemRangeByScore(ctx, redisPresenceSetKey, "-inf", strconv.FormatInt(now.Unix(), 10))
	count := pipe.ZCard(ctx, redisPresenceSetKey)
	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}
	return int(count.Val()), nil
}

const refreshRedisPresenceScript = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return -1
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('ZADD', KEYS[2], ARGV[3], ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[5])
return redis.call('ZCARD', KEYS[2])
`

func (s *redisPresenceStore) Refresh(characterID, ownerToken string, now time.Time) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	value, err := s.client.Eval(ctx, refreshRedisPresenceScript,
		[]string{redisPresenceKey(characterID), redisPresenceSetKey},
		ownerToken,
		strconv.FormatInt(int64(redisPresenceTTL/time.Second), 10),
		strconv.FormatInt(redisPresenceExpiry(now), 10),
		characterID,
		strconv.FormatInt(now.Unix(), 10),
	).Int64()
	if err != nil {
		return 0, err
	}
	if value < 0 {
		return 0, fmt.Errorf("presença da sessão foi substituída")
	}
	return int(value), nil
}

const unregisterRedisPresenceScript = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('DEL', KEYS[1])
  redis.call('ZREM', KEYS[2], ARGV[2])
end
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[3])
return redis.call('ZCARD', KEYS[2])
`

func (s *redisPresenceStore) Unregister(characterID, ownerToken string, now time.Time) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	value, err := s.client.Eval(ctx, unregisterRedisPresenceScript,
		[]string{redisPresenceKey(characterID), redisPresenceSetKey},
		ownerToken, characterID, strconv.FormatInt(now.Unix(), 10),
	).Int64()
	if err != nil {
		return 0, err
	}
	return int(value), nil
}

type redisWSTicketStore struct {
	client *redis.Client
}

func newRedisWSTicketStore(client *redis.Client) *redisWSTicketStore {
	return &redisWSTicketStore{client: client}
}

func (s *redisWSTicketStore) Store(ticket string, record wsTicketRecord, ttl time.Duration) error {
	payload, err := json.Marshal(record)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return s.client.Set(ctx, redisWSTicketPrefix+ticket, payload, ttl).Err()
}

func (s *redisWSTicketStore) Consume(ticket string, now time.Time) (wsTicketRecord, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	payload, err := s.client.GetDel(ctx, redisWSTicketPrefix+ticket).Bytes()
	if err == redis.Nil {
		return wsTicketRecord{}, false, nil
	}
	if err != nil {
		return wsTicketRecord{}, false, err
	}
	var record wsTicketRecord
	if err := json.Unmarshal(payload, &record); err != nil || !record.ExpiresAt.After(now) {
		return wsTicketRecord{}, false, nil
	}
	return record, true, nil
}

func initializeMultiplayerRuntime(cfg *config.Config) error {
	if cfg == nil {
		return fmt.Errorf("configuração Redis ausente")
	}
	client := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr, Password: cfg.RedisPassword, DB: cfg.RedisDB})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	err := client.Ping(ctx).Err()
	cancel()
	if err != nil {
		_ = client.Close()
		if cfg.RedisRequired {
			return fmt.Errorf("Redis é obrigatório em %s: %w", cfg.Environment, err)
		}
		log.Printf("⚠️ Redis indisponível; multiplayer permanece local neste ambiente: %v", err)
		return nil
	}

	bus := newRedisSocialBus(client)
	hub, err := newWorldChatHubWithDependencies(dbChatRepository{}, bus, newRedisPresenceStore(client))
	if err != nil {
		_ = bus.Close()
		_ = client.Close()
		return fmt.Errorf("inicializar barramento social Redis: %w", err)
	}
	if err := configureSettlementSchedulerBus(newRedisSettlementSchedulerBus(client)); err != nil {
		_ = hub.Close()
		_ = client.Close()
		return fmt.Errorf("inicializar barramento do scheduler Redis: %w", err)
	}
	previousHub := multiplayerHub
	multiplayerHub = hub
	wsTickets = newRedisWSTicketStore(client)
	if previousHub != nil {
		_ = previousHub.Close()
	}
	log.Printf("🟢 Multiplayer Redis ativo (%s): chat, presença global e tickets WebSocket compartilhados", cfg.RedisAddr)
	return nil
}