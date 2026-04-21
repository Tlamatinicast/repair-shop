INSERT INTO "Setting" ("key", "value")
VALUES
  ('businessPhone',  '999 190 4814'),
  ('businessDomain', 'facebook.com/ifrogsmx')
ON CONFLICT ("key") DO NOTHING;
