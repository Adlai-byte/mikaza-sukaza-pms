/**
 * Diagnostic Script: Job-Task Creation Sync (Simple Version)
 * This script checks if tasks are being created when jobs are assigned to users
 */

import { createClient } from '@supabase/supabase-js';

// Hard-code credentials from your .env (temporary for debugging)
const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTI4MjksImV4cCI6MjA3NDU2ODgyOX0.MBMAqte7iI49GTE3gnFVhdsHCVb2viA6qPjftwp3RtY';

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
    const { data: tasks, error: tasksError} = await supabase
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
    console.log(`   Description: ${task.description || 'No description'}`);
    console.log(`   Assigned to: ${task.assigned_to || 'Unassigned'}`);
    console.log(`   Created by: ${task.created_by || 'Unknown'}`);
    console.log(`   Created at: ${new Date(task.created_at).toLocaleString()}`);
    console.log(`   Status: ${task.status}\n`);
  }

  // 4. Summary
  console.log('\n📈 Summary:');
  const jobsWithAssignment = jobs?.filter(j => j.assigned_to) || [];
  console.log(`   Total recent jobs: ${jobs?.length || 0}`);
  console.log(`   Jobs with assignment: ${jobsWithAssignment.length}`);
  console.log(`   Total recent tasks: ${recentTasks?.length || 0}`);

  console.log('\n✨ Diagnostic complete!\n');
}

// Run the diagnostic
diagnoseTasks().catch(console.error);
