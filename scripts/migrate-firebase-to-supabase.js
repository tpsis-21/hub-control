// scripts/migrate-firebase-to-supabase.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Chave de serviço, não a anônima

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não configuradas.');
  process.exit(1);
}

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Inicializar Supabase com chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para converter nomes de campos do estilo camelCase para snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Função para converter datas do Firebase para formato ISO
function convertFirebaseDate(timestamp) {
  if (!timestamp) return null;
  
  // Se for um timestamp do Firestore
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Se for um objeto com segundos e nanossegundos
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  // Se for uma string de data
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }
  
  return null;
}

// Função para transformar um documento do Firebase para o formato do Supabase
function transformFirebaseDoc(doc, collectionName) {
  const data = { ...doc };
  const result = {};
  
  // Converter campos camelCase para snake_case
  Object.keys(data).forEach(key => {
    if (key === 'id') return; // Pular o campo id
    
    const snakeKey = camelToSnake(key);
    
    // Converter campos de data
    if (['createdAt', 'updatedAt', 'startDate', 'expirationDate', 'date'].includes(key)) {
      result[snakeKey] = convertFirebaseDate(data[key]);
    } else {
      result[snakeKey] = data[key];
    }
  });
  
  // Adicionar campos created_at e updated_at se não existirem
  if (!result.created_at) {
    result.created_at = new Date().toISOString();
  }
  if (!result.updated_at) {
    result.updated_at = new Date().toISOString();
  }
  
  return result;
}

// Função para migrar uma coleção do Firebase para o Supabase
async function migrateCollection(collectionName, supabaseTable) {
  console.log(`Migrando coleção ${collectionName} para tabela ${supabaseTable}...`);
  
  try {
    // Obter documentos do Firebase
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    
    querySnapshot.forEach(doc => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Encontrados ${documents.length} documentos na coleção ${collectionName}.`);
    
    // Salvar documentos em um arquivo JSON para backup
    const backupDir = path.join(__dirname, '../backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(backupDir, `${collectionName}.json`),
      JSON.stringify(documents, null, 2)
    );
    
    console.log(`Backup da coleção ${collectionName} salvo em ${backupDir}/${collectionName}.json`);
    
    // Inserir documentos no Supabase
    for (const doc of documents) {
      const transformedDoc = transformFirebaseDoc(doc, collectionName);
      
      const { data, error } = await supabase
        .from(supabaseTable)
        .insert(transformedDoc)
        .select();
      
      if (error) {
        console.error(`Erro ao inserir documento ${doc.id} na tabela ${supabaseTable}:`, error);
      } else {
        console.log(`Documento ${doc.id} migrado com sucesso para ${supabaseTable}.`);
      }
    }
    
    console.log(`Migração da coleção ${collectionName} concluída.`);
  } catch (error) {
    console.error(`Erro ao migrar coleção ${collectionName}:`, error);
  }
}

// Função principal para migrar todas as coleções
async function migrateAllCollections() {
  try {
    // Mapear coleções do Firebase para tabelas do Supabase
    const collectionMappings = [
      { firebase: 'planGroups', supabase: 'plan_groups' },
      { firebase: 'plans', supabase: 'plans' },
      { firebase: 'servers', supabase: 'servers' },
      { firebase: 'clients', supabase: 'clients' },
      { firebase: 'settings', supabase: 'settings' },
      // Adicione outras coleções conforme necessário
    ];
    
    // Migrar cada coleção
    for (const mapping of collectionMappings) {
      await migrateCollection(mapping.firebase, mapping.supabase);
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    process.exit(0);
  }
}

// Executar a migração
migrateAllCollections();