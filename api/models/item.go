package models

type Item struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type CreateItemRequest struct {
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type UpdateItemRequest struct {
	Title string `json:"title"`
	Done  bool   `json:"done"`
}
