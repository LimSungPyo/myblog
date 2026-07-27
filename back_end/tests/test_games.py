def test_create_score_returns_entry(client):
    r = client.post("/games/2048/scores", json={"playerName": "홍길동", "score": 1024})
    assert r.status_code == 201
    d = r.json()
    assert d["gameKey"] == "2048"
    assert d["playerName"] == "홍길동"
    assert d["score"] == 1024
    assert "id" in d and "createdAt" in d


def test_create_score_validation(client):
    # 이름 필수
    assert (
        client.post(
            "/games/2048/scores", json={"playerName": "", "score": 10}
        ).status_code
        == 422
    )
    # 점수는 음수 불가
    assert (
        client.post(
            "/games/2048/scores", json={"playerName": "a", "score": -1}
        ).status_code
        == 422
    )


def test_unknown_game_key_404(client):
    assert (
        client.post(
            "/games/tetris/scores", json={"playerName": "a", "score": 1}
        ).status_code
        == 404
    )
    assert client.get("/games/tetris/scores").status_code == 404


def test_list_scores_ordered_by_score_desc(client):
    for name, score in [("low", 100), ("high", 5000), ("mid", 1000)]:
        client.post("/games/2048/scores", json={"playerName": name, "score": score})
    body = client.get("/games/2048/scores").json()
    scores = [row["score"] for row in body]
    assert scores == sorted(scores, reverse=True)
    assert body[0]["playerName"] == "high"


def test_list_scores_tie_earliest_first(client):
    first = client.post(
        "/games/2048/scores", json={"playerName": "first", "score": 500}
    ).json()
    second = client.post(
        "/games/2048/scores", json={"playerName": "second", "score": 500}
    ).json()
    body = client.get("/games/2048/scores").json()
    tied = [row for row in body if row["score"] == 500]
    assert [row["id"] for row in tied] == [first["id"], second["id"]]


def test_list_scores_respects_limit(client):
    for i in range(5):
        client.post("/games/2048/scores", json={"playerName": f"p{i}", "score": i * 10})
    body = client.get("/games/2048/scores?limit=3").json()
    assert len(body) == 3


def test_scores_are_scoped_per_game(client):
    # 현재 허용 게임은 2048뿐 → 다른 게임 점수는 섞이지 않음(허용 목록 검증)
    client.post("/games/2048/scores", json={"playerName": "only2048", "score": 42})
    body = client.get("/games/2048/scores").json()
    assert all(row["gameKey"] == "2048" for row in body)


def test_admin_list_all_scores(client, admin_headers):
    for i in range(3):
        client.post("/games/2048/scores", json={"playerName": f"p{i}", "score": i})
    r = client.get("/admin/games/scores", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_admin_can_delete_score(client, admin_headers):
    created = client.post(
        "/games/2048/scores", json={"playerName": "지울사람", "score": 999}
    ).json()
    sid = created["id"]
    assert (
        client.delete(f"/admin/games/scores/{sid}", headers=admin_headers).status_code
        == 204
    )
    body = client.get("/games/2048/scores").json()
    assert all(row["id"] != sid for row in body)


def test_admin_scores_requires_admin(client, user_headers):
    assert client.get("/admin/games/scores").status_code == 401
    assert client.get("/admin/games/scores", headers=user_headers).status_code == 403


def test_admin_delete_missing_score_404(client, admin_headers):
    assert (
        client.delete("/admin/games/scores/999999", headers=admin_headers).status_code
        == 404
    )
