def test_categories(client, category):
    body = client.get("/categories").json()
    assert any(c["slug"] == "dev" for c in body)


def test_tags(client, tag):
    body = client.get("/tags").json()
    assert any(t["slug"] == "nextjs" for t in body)
