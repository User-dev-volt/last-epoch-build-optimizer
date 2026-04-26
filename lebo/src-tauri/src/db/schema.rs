// TODO (Story 1.2): Define SQLite schema migration SQL strings
// Tables: classes, masteries, passive_nodes, passive_edges,
//         skills, skill_nodes, skill_edges, data_meta, builds

pub const SCHEMA_VERSION: &str = "1";

pub const CREATE_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS data_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS masteries (
    id          TEXT PRIMARY KEY,
    class_id    TEXT NOT NULL REFERENCES classes(id),
    name        TEXT NOT NULL,
    description TEXT,
    playstyle   TEXT,
    damage_type_tags TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS passive_nodes (
    id          TEXT PRIMARY KEY,
    mastery_id  TEXT NOT NULL REFERENCES masteries(id),
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    x           REAL NOT NULL DEFAULT 0,
    y           REAL NOT NULL DEFAULT 0,
    max_points  INTEGER NOT NULL DEFAULT 1,
    tags        TEXT NOT NULL DEFAULT '[]',
    effects     TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS passive_edges (
    from_node_id TEXT NOT NULL REFERENCES passive_nodes(id),
    to_node_id   TEXT NOT NULL REFERENCES passive_nodes(id),
    PRIMARY KEY (from_node_id, to_node_id)
);

CREATE TABLE IF NOT EXISTS skills (
    id           TEXT PRIMARY KEY,
    mastery_id   TEXT NOT NULL REFERENCES masteries(id),
    name         TEXT NOT NULL,
    description  TEXT,
    damage_types TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS skill_nodes (
    id          TEXT PRIMARY KEY,
    skill_id    TEXT NOT NULL REFERENCES skills(id),
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    x           REAL NOT NULL DEFAULT 0,
    y           REAL NOT NULL DEFAULT 0,
    max_points  INTEGER NOT NULL DEFAULT 1,
    tags        TEXT NOT NULL DEFAULT '[]',
    effects     TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS skill_edges (
    from_node_id TEXT NOT NULL REFERENCES skill_nodes(id),
    to_node_id   TEXT NOT NULL REFERENCES skill_nodes(id),
    PRIMARY KEY (from_node_id, to_node_id)
);

CREATE TABLE IF NOT EXISTS builds (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    class_id             TEXT NOT NULL,
    mastery_id           TEXT NOT NULL,
    passive_allocations  TEXT NOT NULL DEFAULT '{}',
    skill_allocations    TEXT NOT NULL DEFAULT '{}',
    equipped_skills      TEXT NOT NULL DEFAULT '[]',
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
);
"#;
