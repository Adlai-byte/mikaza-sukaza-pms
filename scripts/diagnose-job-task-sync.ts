/**
 * Diagnostic Script: Job-Task Creation Sync
 * This script checks if tasks are being created when jobs are assigned to users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Manually load .env file
const envPath = join(process.cwd(), '.env');
const envFile = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

// Debug logging
console.log('Debug: Env vars found:');
console.log('  Keys:', Object.keys(envVars).join(', '));
console.log('  VITE_SUPABASE_URL:', envVars.VITE_SUPABASE_URL);
console.log('  VITE_SUPABASE_PUBLISHABLE_KEY:', envVars.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Found' : 'Missing');
console.log('');

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('   VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseTasks() {
  console.log('🔍 Starting Job-Task Sync Diagnostic...\n');

  // 1. Check recent jobs
  console.log('📋 Fetching recent jobs...');
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      job_id,
      title,
      assigned_to,
      created_at,
      status,
      priority
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobsError) {
    console.error('❌ Error fetching jobs:', jobsError);
    return;
  }

  console.log(`✅ Found ${jobs?.length || 0} recent jobs\n`);

  // 2. For each job with assigned_to, check if a task exists
  for (const job of jobs || []) {
    console.log(`\n🔎 Checking Job: ${job.title} (${job.job_id?.slice(0, 8)})`);
    console.log(`   Assigned to: ${job.assigned_to || 'UNASSIGNED'}`);
    console.log(`   Created at: ${new Date(job.created_at).toLocaleString()}`);

    if (!job.assigned_to) {
      console.log('   ⚠️  No user assigned - task creation not expected');
      continue;
    }

    // Find tasks with matching title and assigned user created around the same time
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        task_id,
        title,
        description,
        assigned_to,
        created_by,
        created_at,
        status,
        priority
      `)
      .eq('assigned_to', job.assigned_to)
      .ilike('title', `%${job.title}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tasksError) {
      console.error('   ❌ Error fetching tasks:', tasksError);
      continue;
    }

    if (tasks && tasks.length > 0) {
      const task = tasks[0];
      const jobTime = new Date(job.created_at).getTime();
      const taskTime = new Date(task.created_at).getTime();
      const timeDiff = Math.abs(taskTime - jobTime) / 1000; // seconds

      console.log(`   ✅ TASK FOUND:`);
      console.log(`      Task ID: ${task.task_id?.slice(0, 8)}`);
      console.log(`      Title: ${task.title}`);
      console.log(`      Description: ${task.description}`);
      console.log(`      Created by: ${task.created_by}`);
      console.log(`      Created ${timeDiff}s ${taskTime > jobTime ? 'after' : 'before'} job`);
      console.log(`      Status: ${task.status}`);
      console.log(`      Priority: ${task.priority}`);
    } else {
      console.log(`   ❌ NO TASK FOUND for this job`);
      console.log(`      Expected: Task with title containing "${job.title}"`);
      console.log(`      Assigned to: ${job.assigned_to}`);
    }
  }

  // 3. Check recent tasks
  console.log('\n\n📊 Recent Tasks Overview:');
  const { data: recentTasks, error: recentTasksError } = await supabase
    .from('tasks')
    .select(`
      task_id,
      title,
      description,
      assigned_to,
      created_by,
      created_at,
      status
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentTasksError) {
    console.error('❌ Error fetching recent tasks:', recentTasksError);
    return;
  }

  console.log(`✅ Found ${recentTasks?.length || 0} recent tasks\n`);

  for (const task of recentTasks || []) {
    console.log(`📋 ${task.title}`);
    console.log(`   Task ID: ${task.task_id?.slice(0, 8)}`);
    console.log(`   Description: ${task.description}`);
    console.log(`   Assigned to: ${task.assigned_to}`);
    console.log(`   Created by: ${task.created_by}`);
    console.log(`   Created at: ${new Date(task.created_at).toLocaleString()}`);
    console.log(`   Status: ${task.status}\n`);
  }

  // 4. Summary
  console.log('\n📈 Summary:');
  const jobsWithAssignment = jobs?.filter(j => j.assigned_to) || [];
  console.log(`   Total recent jobs: ${jobs?.length || 0}`);
  console.log(`   Jobs with assignment: ${jobsWithAssignment.length}`);
  console.log(`   Total recent tasks: ${recentTasks?.length || 0}`);

  // 5. Check if tasks table has job_id column
  console.log('\n🔍 Checking tasks table schema...');
  const { data: taskSchema, error: schemaError } = await supabase
    .from('tasks')
    .select('*')
    .limit(1)
    .single();

  if (taskSchema) {
    const hasJobId = 'job_id' in taskSchema;
    console.log(`   job_id column exists: ${hasJobId ? '✅ YES' : '❌ NO'}`);

    if (hasJobId) {
      console.log('\n   Migration has been applied!');

      // Check for tasks with job_id
      const { data: linkedTasks, error: linkedError } = await supabase
        .from('tasks')
        .select('task_id, title, job_id')
        .not('job_id', 'is', null)
        .limit(5);

      if (linkedError) {
        console.error('   Error checking linked tasks:', linkedError);
      } else {
        console.log(`   Tasks linked to jobs: ${linkedTasks?.length || 0}`);
        if (linkedTasks && linkedTasks.length > 0) {
          linkedTasks.forEach(t => {
            console.log(`      - ${t.title} (Task: ${t.task_id?.slice(0, 8)}, Job: ${t.job_id?.slice(0, 8)})`);
          });
        }
      }
    } else {
      console.log('\n   ⚠️  Migration NOT applied - tasks cannot be linked to jobs');
      console.log('   This is why tasks may not be appearing correctly');
    }
  }

  console.log('\n✨ Diagnostic complete!\n');
}

// Run the diagnostic
diagnoseTasks().catch(console.error);
