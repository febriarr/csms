-- Custom SQL migration file, put your code below! --

INSERT INTO "divisions" ("name")
VALUES
  ('Warehouse'),
  ('Production'),
  ('ME')
ON CONFLICT ("name") DO NOTHING;