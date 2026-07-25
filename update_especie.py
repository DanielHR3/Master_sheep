import re

with open("app.go", "r") as f:
    content = f.read()

# 1. InitDB
content = content.replace(
    'a.db.Exec("ALTER TABLE animales ADD COLUMN abuela_materna_id TEXT")',
    'a.db.Exec("ALTER TABLE animales ADD COLUMN especie TEXT DEFAULT \'Ovino\'")\n\ta.db.Exec("ALTER TABLE animales ADD COLUMN abuela_materna_id TEXT")'
)

# 2. GetAnimales - SELECT
content = content.replace(
    "SELECT id, COALESCE(arete, ''),",
    "SELECT id, COALESCE(especie, 'Ovino'), COALESCE(arete, ''),"
)

# 2. GetAnimales - variables
content = content.replace(
    "var arete, raza, sexo,",
    "var especie, arete, raza, sexo,"
)

# 2. GetAnimales - Scan
content = content.replace(
    "err := rows.Scan(&animal.ID, &arete, &raza,",
    "err := rows.Scan(&animal.ID, &especie, &arete, &raza,"
)

# 2. GetAnimales - Assign
content = content.replace(
    "animal.Arete = arete.String",
    "animal.Especie = especie.String\n\t\tanimal.Arete = arete.String"
)

# 3. AddAnimal - INSERT
content = content.replace(
    "(id, user_id, arete,",
    "(id, user_id, especie, arete,"
)
content = content.replace(
    "VALUES (?, ?, ?,",
    "VALUES (?, ?, ?, ?,"
)

# 3. AddAnimal - Exec args
content = content.replace(
    "animal.ID, a.tenantID(), animal.Arete,",
    "animal.ID, a.tenantID(), animal.Especie, animal.Arete,"
)

# 4. UpdateAnimal - UPDATE
content = content.replace(
    "SET arete = ?,",
    "SET especie = ?, arete = ?,"
)

# 4. UpdateAnimal - Exec args
content = content.replace(
    "animal.Arete, animal.Raza,",
    "animal.Especie, animal.Arete, animal.Raza,"
)

with open("app.go", "w") as f:
    f.write(content)
