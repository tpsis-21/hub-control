-- Verificar triggers que podem estar causando recursão
SELECT 
    'TRIGGERS NA TABELA PROFILES' as tipo,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- Verificar funções que fazem referência à tabela profiles
SELECT 
    'FUNÇÕES QUE REFERENCIAM PROFILES' as tipo,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_definition ILIKE '%profiles%'
ORDER BY routine_name;

-- Verificar views que fazem referência à tabela profiles
SELECT 
    'VIEWS QUE REFERENCIAM PROFILES' as tipo,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
    AND view_definition ILIKE '%profiles%'
ORDER BY table_name;

-- Verificar se há constraints que podem estar causando problemas
SELECT 
    'CONSTRAINTS DA TABELA PROFILES' as tipo,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'profiles'
    AND table_schema = 'public'
ORDER BY constraint_type, constraint_name;