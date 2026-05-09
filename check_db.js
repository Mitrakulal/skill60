/**
 * Database Diagnostic Tool
 */
process.env.VITE_SUPABASE_URL = 'https://kavjilnsferoufxlqgab.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_f6R77U6z5uh8rlKoTvgU5g_2iWYByr3';

async function checkDatabase() {
  const { supabase } = await import('./src/lib/supabase.js');
  
  console.log('🔍 Database Integrity Check...');
  console.log('-----------------------------------');

  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: sessionCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
  const { count: attendanceCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
  const { data: recentLogs } = await supabase.from('import_log').select('*').order('uploaded_at', { ascending: false }).limit(1);

  console.log(`👥 Total Students:   ${studentCount || 0}`);
  console.log(`📅 Total Sessions:   ${sessionCount || 0}`);
  console.log(`✅ Attendance Rows:  ${attendanceCount || 0}`);

  if (recentLogs && recentLogs.length > 0) {
    console.log(`\n📄 Last Import Log:`);
    console.log(`   Filename:      ${recentLogs[0].filename}`);
    console.log(`   Imported Rows: ${recentLogs[0].imported_rows}`);
    console.log(`   Skipped Rows:  ${recentLogs[0].skipped_rows}`);
    console.log(`   Status:        ${recentLogs[0].status}`);
    console.log(`   Warnings:      ${recentLogs[0].warnings || 'None'}`);
  }

  if ((attendanceCount || 0) === 0 && (sessionCount || 0) > 0) {
    console.log('\n❌ DIAGNOSIS: Attendance table is EMPTY.');
  } else if ((attendanceCount || 0) > 0) {
    console.log('\n✨ DIAGNOSIS: Data exists in DB!');
  }
}

checkDatabase();
