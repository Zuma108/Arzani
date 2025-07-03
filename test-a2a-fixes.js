import pool from './db.js';

async function testA2AFixes() {
  try {
    console.log('🧪 Testing A2A Fixes...');
    
    // Test 1: Test task creation and interaction logging
    console.log('1. Testing task creation and interaction logging...');
    
    const testUserId = 1;
    const testTaskId = `test_task_${Date.now()}`;
    const testInteractionId = `test_interaction_${Date.now()}`;
    
    // First create a task (this should now work due to our fixes)
    await pool.query(`
      INSERT INTO a2a_tasks (
        user_id, task_id, initial_query, task_type, status, 
        primary_agent, current_agent, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      testUserId, testTaskId, 'Test task for foreign key fix', 'test', 
      'in_progress', 'orchestrator', 'orchestrator', 
      JSON.stringify({ test: true })
    ]);
    
    console.log('✅ Task created successfully');
    
    // Now create an interaction (this should work now that task exists)
    await pool.query(`
      INSERT INTO a2a_agent_interactions (
        user_id, task_id, interaction_id, interaction_type,
        from_agent, to_agent, response_time_ms, success,
        confidence_score, reason, context_passed, outcome,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    `, [
      testUserId, testTaskId, testInteractionId, 'test',
      'orchestrator', 'broker', 100, true,
      0.95, 'Test interaction', JSON.stringify({ test: true }), 'success'
    ]);
    
    console.log('✅ Agent interaction created successfully');    // Test 2: Test session context with last_accessed
    console.log('2. Testing session context with last_accessed...');
    
    // First create a chat session
    const chatSessionResult = await pool.query(`
      INSERT INTO a2a_chat_sessions (
        user_id, session_name, agent_type, title, is_active, 
        created_at, updated_at, last_active_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NOW(), NOW())
      RETURNING id
    `, [testUserId, 'Test Session', 'orchestrator', 'Test Session']);
    
    const testSessionId = chatSessionResult.rows[0].id;
    
    await pool.query(`
      INSERT INTO a2a_session_context (
        user_id, session_id, conversation_history, shared_context,
        current_agent, session_state, last_accessed
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      testUserId, testSessionId, JSON.stringify([]), JSON.stringify({}),
      'orchestrator', 'active'
    ]);
    
    console.log('✅ Session context created successfully');
    
    // Test 3: Test thread preferences upsert function
    console.log('3. Testing thread preferences upsert...');
    
    await pool.query(`SELECT upsert_thread_preferences($1, $2)`, [
      testUserId, 
      JSON.stringify({ theme: 'dark', notifications: true })
    ]);
    
    console.log('✅ Thread preferences upserted successfully');
    
    // Test 4: Verify all test data exists
    console.log('4. Verifying test data...');
    
    const taskCheck = await pool.query(`SELECT COUNT(*) FROM a2a_tasks WHERE task_id = $1`, [testTaskId]);
    const interactionCheck = await pool.query(`SELECT COUNT(*) FROM a2a_agent_interactions WHERE task_id = $1`, [testTaskId]);
    const sessionCheck = await pool.query(`SELECT COUNT(*) FROM a2a_session_context WHERE session_id = $1`, [testSessionId]);
    const prefsCheck = await pool.query(`SELECT COUNT(*) FROM thread_preferences WHERE user_id = $1`, [testUserId]);
    
    console.log(`✅ Tasks: ${taskCheck.rows[0].count}`);
    console.log(`✅ Interactions: ${interactionCheck.rows[0].count}`);
    console.log(`✅ Sessions: ${sessionCheck.rows[0].count}`);
    console.log(`✅ Preferences: ${prefsCheck.rows[0].count}`);
      // Clean up test data
    console.log('5. Cleaning up test data...');
    await pool.query(`DELETE FROM a2a_agent_interactions WHERE task_id = $1`, [testTaskId]);
    await pool.query(`DELETE FROM a2a_tasks WHERE task_id = $1`, [testTaskId]);
    await pool.query(`DELETE FROM a2a_session_context WHERE session_id = $1`, [testSessionId]);
    await pool.query(`DELETE FROM a2a_chat_sessions WHERE id = $1`, [testSessionId]);
    await pool.query(`DELETE FROM thread_preferences WHERE user_id = $1`, [testUserId]);
    
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 All A2A Fixes Working Correctly!');
    console.log('\n📋 Summary of Fixes Applied:');
    console.log('  ✅ Fixed foreign key constraint by creating tasks before interactions');
    console.log('  ✅ Added missing last_accessed column to a2a_session_context');
    console.log('  ✅ Added missing initial_query and primary_agent columns to a2a_tasks');
    console.log('  ✅ Created thread_preferences table with proper constraints');
    console.log('  ✅ Created upsert function for thread preferences');
    console.log('  ✅ Updated API routes to use proper ordering and error handling');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testA2AFixes();
