const { Client } = require('pg');

const pgConfig = {
  host: 'db.faxzubfvjsekizeiiocg.supabase.co',
  user: 'postgres',
  password: 'tF3cfdc3FQ7fWEdB',
  database: 'postgres',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
};

async function testInsert() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('CONNECTED TO DATABASE.');

    // Let's get valid IDs from the database to ensure referential integrity
    const student = await client.query('SELECT id FROM public.students LIMIT 1;');
    const department = await client.query('SELECT id FROM public.departments LIMIT 1;');
    const stage = await client.query('SELECT id FROM public.defense_stages LIMIT 1;');
    const campus = await client.query('SELECT id FROM public.campuses LIMIT 1;');

    if (student.rowCount === 0 || department.rowCount === 0 || stage.rowCount === 0 || campus.rowCount === 0) {
      console.error('Missing setup records in database to perform insert test.');
      return;
    }

    const payload = {
      title: 'TEST PROJECT DIAGNOSTICS INSERT',
      student_id: student.rows[0].id,
      department_id: department.rows[0].id,
      current_stage_id: stage.rows[0].id,
      campus_id: campus.rows[0].id,
      academic_year: '2025-2026',
      status: 'draft'
    };

    console.log('Inserting payload:', payload);

    try {
      const res = await client.query(`
        INSERT INTO public.projects (title, student_id, department_id, current_stage_id, campus_id, academic_year, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title;
      `, [payload.title, payload.student_id, payload.department_id, payload.current_stage_id, payload.campus_id, payload.academic_year, payload.status]);

      console.log('INSERT RESULT: SUCCESS.', res.rows[0]);

      // Cleanup
      await client.query('DELETE FROM public.projects WHERE id = $1;', [res.rows[0].id]);
      console.log('Cleanup completed.');
    } catch (insertErr) {
      console.error('INSERT RESULT: FAILED.');
      console.error(insertErr);
    }

  } catch (err) {
    console.error('Diagnostics failure:', err);
  } finally {
    await client.end();
  }
}

testInsert();
