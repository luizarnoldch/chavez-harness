package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"

	"chavez-harness/api/models"
)

var ErrNotFound = errors.New("item not found")

type MemoryStore struct {
	mu    sync.RWMutex
	items map[string]models.Item
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		items: make(map[string]models.Item),
	}
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func (s *MemoryStore) List() []models.Item {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]models.Item, 0, len(s.items))
	for _, item := range s.items {
		out = append(out, item)
	}
	return out
}

func (s *MemoryStore) Get(id string) (models.Item, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.items[id]
	if !ok {
		return models.Item{}, ErrNotFound
	}
	return item, nil
}

func (s *MemoryStore) Create(title string, done bool) models.Item {
	s.mu.Lock()
	defer s.mu.Unlock()

	item := models.Item{
		ID:    newID(),
		Title: title,
		Done:  done,
	}
	s.items[item.ID] = item
	return item
}

func (s *MemoryStore) Update(id string, title string, done bool) (models.Item, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return models.Item{}, ErrNotFound
	}

	item := models.Item{
		ID:    id,
		Title: title,
		Done:  done,
	}
	s.items[id] = item
	return item, nil
}

func (s *MemoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.items[id]; !ok {
		return ErrNotFound
	}
	delete(s.items, id)
	return nil
}
