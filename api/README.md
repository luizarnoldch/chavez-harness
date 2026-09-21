# API (Go, in-memory CRUD)

Simple REST API for `Item` resources. Data lives in memory and resets on restart.

## Run

```bash
cd api
go run .
```

Optional port (default `8080`):

```bash
PORT=28002 go run .
```

## Endpoints

| Method   | Path           | Description        |
|----------|----------------|--------------------|
| `GET`    | `/health`      | Healthcheck        |
| `GET`    | `/items`       | List items         |
| `GET`    | `/items/{id}`  | Get one item       |
| `POST`   | `/items`       | Create item        |
| `PUT`    | `/items/{id}`  | Update item        |
| `DELETE` | `/items/{id}`  | Delete item        |

## Examples

```bash
curl -s http://localhost:8080/health

curl -s -X POST http://localhost:8080/items \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk","done":false}'

curl -s http://localhost:8080/items

curl -s -X PUT http://localhost:8080/items/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy milk","done":true}'

curl -s -X DELETE http://localhost:8080/items/<id>
```
