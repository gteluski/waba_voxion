-- Habilitar Row Level Security (RLS) nas tabelas caso ainda não esteja habilitado
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POLITICAS PARA CONVERSATIONS
-- =========================================================================

-- SELECT
DROP POLICY IF EXISTS "Authenticated users can read conversations" ON conversations;
CREATE POLICY "Authenticated users can read conversations"
ON conversations FOR SELECT
TO authenticated
USING (true);


-- =========================================================================
-- POLITICAS PARA LEADS
-- =========================================================================

-- SELECT
DROP POLICY IF EXISTS "Authenticated users can read leads" ON leads;
CREATE POLICY "Authenticated users can read leads"
ON leads FOR SELECT
TO authenticated
USING (true);

-- INSERT
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
CREATE POLICY "Authenticated users can insert leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
CREATE POLICY "Authenticated users can update leads"
ON leads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- =========================================================================
-- POLITICAS PARA CAMPAIGNS
-- =========================================================================

-- SELECT
DROP POLICY IF EXISTS "Authenticated users can read campaigns" ON campaigns;
CREATE POLICY "Authenticated users can read campaigns"
ON campaigns FOR SELECT
TO authenticated
USING (true);

-- INSERT
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON campaigns;
CREATE POLICY "Authenticated users can insert campaigns"
ON campaigns FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON campaigns;
CREATE POLICY "Authenticated users can update campaigns"
ON campaigns FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
