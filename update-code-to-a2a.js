import fs from 'fs';
import path from 'path';

// Files to update with their replacements
const filesToUpdate = [
  {
    path: 'routes/api/chat.js',
    replacements: [
      {
        old: 'INSERT INTO conversations',
        new: 'INSERT INTO a2a_chat_sessions'
      },
      {
        old: 'INSERT INTO messages',
        new: 'INSERT INTO a2a_chat_messages'
      },
      {
        old: 'SELECT * FROM conversations',
        new: 'SELECT * FROM a2a_chat_sessions'
      },
      {
        old: 'SELECT * FROM messages',
        new: 'SELECT * FROM a2a_chat_messages'
      },
      {
        old: 'UPDATE conversations',
        new: 'UPDATE a2a_chat_sessions'
      },
      {
        old: 'UPDATE messages',
        new: 'UPDATE a2a_chat_messages'
      },
      {
        old: 'conversation_id',
        new: 'session_id'
      },
      {
        old: '/api/conversations',
        new: '/api/threads'
      }
    ]
  },
  {
    path: 'routes/api/threads.js',
    replacements: [
      {
        old: 'INSERT INTO conversations',
        new: 'INSERT INTO a2a_chat_sessions'
      },
      {
        old: 'INSERT INTO messages',
        new: 'INSERT INTO a2a_chat_messages'
      },
      {
        old: 'SELECT * FROM conversations',
        new: 'SELECT * FROM a2a_chat_sessions'
      },
      {
        old: 'SELECT * FROM messages',
        new: 'SELECT * FROM a2a_chat_messages'
      },
      {
        old: 'conversation_id',
        new: 'session_id'
      }
    ]
  },
  {
    path: 'controllers/chatController.js',
    replacements: [
      {
        old: 'INSERT INTO conversations',
        new: 'INSERT INTO a2a_chat_sessions'
      },
      {
        old: 'INSERT INTO messages',
        new: 'INSERT INTO a2a_chat_messages'
      },
      {
        old: 'SELECT * FROM conversations',
        new: 'SELECT * FROM a2a_chat_sessions'
      },
      {
        old: 'SELECT * FROM messages',
        new: 'SELECT * FROM a2a_chat_messages'
      },
      {
        old: 'conversation_id',
        new: 'session_id'
      }
    ]
  },
  {
    path: 'services/chatWebSocketService.js',
    replacements: [
      {
        old: 'INSERT INTO conversations',
        new: 'INSERT INTO a2a_chat_sessions'
      },
      {
        old: 'INSERT INTO messages',
        new: 'INSERT INTO a2a_chat_messages'
      },
      {
        old: 'SELECT * FROM conversations',
        new: 'SELECT * FROM a2a_chat_sessions'
      },
      {
        old: 'SELECT * FROM messages',
        new: 'SELECT * FROM a2a_chat_messages'
      },
      {
        old: 'conversation_id',
        new: 'session_id'
      }
    ]
  },
  {
    path: 'public/js/a2a-persistence-manager.js',
    replacements: [
      {
        old: '/api/conversations',
        new: '/api/threads'
      }
    ]
  }
];

// Function to update a file
function updateFile(filePath, replacements) {
  console.log(`Updating ${filePath}...`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  File does not exist: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let madeChanges = false;
    
    for (const replacement of replacements) {
      if (content.includes(replacement.old)) {
        content = content.replace(new RegExp(replacement.old, 'g'), replacement.new);
        console.log(`  Replaced: ${replacement.old} -> ${replacement.new}`);
        madeChanges = true;
      }
    }
    
    if (madeChanges) {
      // Create a backup
      fs.writeFileSync(`${filePath}.bak`, fs.readFileSync(filePath));
      console.log(`  Created backup: ${filePath}.bak`);
      
      // Write the updated content
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Updated file: ${filePath}`);
      return true;
    } else {
      console.log(`  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error);
    return false;
  }
}

// Main function to update all files
function updateAllFiles() {
  console.log('Updating files to use a2a tables...');
  let updatedCount = 0;
  
  for (const file of filesToUpdate) {
    if (updateFile(file.path, file.replacements)) {
      updatedCount++;
    }
  }
  
  console.log(`\nUpdate complete. Updated ${updatedCount} files.`);
  
  if (updatedCount > 0) {
    console.log('\nNext steps:');
    console.log('1. Restart your server to apply the changes');
    console.log('2. Test creating a new conversation to ensure it uses a2a tables');
    console.log('3. Run the verification script again to confirm the fix worked');
  }
}

// Run the script
updateAllFiles();
