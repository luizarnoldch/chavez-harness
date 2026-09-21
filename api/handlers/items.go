package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"chavez-harness/api/models"
	"chavez-harness/api/store"
)

type ItemHandler struct {
	store *store.MemoryStore
}

func NewItemHandler(s *store.MemoryStore) *ItemHandler {
	return &ItemHandler{store: s}
}

func (h *ItemHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /items", h.list)
	mux.HandleFunc("GET /items/{id}", h.get)
	mux.HandleFunc("POST /items", h.create)
	mux.HandleFunc("PUT /items/{id}", h.update)
	mux.HandleFunc("DELETE /items/{id}", h.delete)
}

func (h *ItemHandler) list(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.List())
}

func (h *ItemHandler) get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	item, err := h.store.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *ItemHandler) create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateItemRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	item := h.store.Create(title, req.Done)
	writeJSON(w, http.StatusCreated, item)
}

func (h *ItemHandler) update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req models.UpdateItemRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	item, err := h.store.Update(id, title, req.Done)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update item")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *ItemHandler) delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.store.Delete(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.New("invalid JSON body")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
