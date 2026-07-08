const { Client } = require('pg');

const HOST = 'aws-1-ap-southeast-2.pooler.supabase.com';
const USER = 'postgres.faxzubfvjsekizeiiocg';
const DATABASE = 'postgres';
const PORT = 6543;
const PASSWORD = 'tF3cfdc3FQ7fWEdB';

const collegesData = [
  { name: 'College of Education', code: 'COE' },
  { name: 'College of Business and Management', code: 'CBM' },
  { name: 'College of Engineering and Computational Sciences', code: 'CECS' },
  { name: 'College of Arts and Humanities', code: 'CAH' },
  { name: 'College of Science', code: 'COS' }
];

const programsData = {
  'COE': [
    { name: 'Bachelor of Elementary Education', code: 'BEEd', level: 'Undergraduate' },
    { name: 'Bachelor of Secondary Education', code: 'BSEd', level: 'Undergraduate', majors: ['English', 'Filipino', 'Mathematics', 'Science', 'Social Studies', 'Values Education'] },
    { name: 'Doctor of Philosophy in English Language Education', code: 'PhD ELE', level: 'Doctoral' },
    { name: 'Doctor of Philosophy in Mathematics Education', code: 'PhD MathEd', level: 'Doctoral' },
    { name: 'Master of Arts in Education - English', code: 'MAEd English', level: 'Graduate' },
    { name: 'Master of Arts in Education - Science Education', code: 'MAEd SciEd', level: 'Graduate' },
    { name: 'Master of Arts in Education - Mathematics Education', code: 'MAEd MathEd', level: 'Graduate' },
    { name: 'Master of Arts in Education - Instructional Management', code: 'MAEd IM', level: 'Graduate' }
  ],
  'CBM': [
    { name: 'Bachelor of Science in Accountancy', code: 'BSA', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Business Administration - Financial Management', code: 'BSBA FM', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Office Administration', code: 'BSOA', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Entrepreneurship', code: 'BSEntrep', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Economics', code: 'BSEcon', level: 'Undergraduate' },
    { name: 'Master in Business Administration', code: 'MBA', level: 'Graduate' }
  ],
  'CECS': [
    { name: 'Bachelor of Science in Civil Engineering', code: 'BSCE', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Sanitary Engineering', code: 'BSSE', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Computer Science', code: 'BSCS', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Mathematics', code: 'BSMath', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Information Technology', code: 'BSIT', level: 'Undergraduate' },
    { name: 'Bachelor of Engineering Technology', code: 'BET', level: 'Undergraduate', majors: ['Electrical Engineering Technology'] },
    { name: 'Bachelor of Engineering Technology in Mechanical Engineering Technology', code: 'BET MET', level: 'Undergraduate', majors: ['Automotive Technology', 'Refrigeration and Airconditioning Technology'] }
  ],
  'CAH': [
    { name: 'Bachelor of Arts in Communication', code: 'BAComm', level: 'Undergraduate' },
    { name: 'Master in Public Administration', code: 'MPA', level: 'Graduate' }
  ],
  'COS': [
    { name: 'Bachelor of Science in Biology', code: 'BSBio', level: 'Undergraduate' },
    { name: 'Bachelor of Science in Geology', code: 'BSGeol', level: 'Undergraduate' }
  ]
};

async function seed() {
  const client = new Client({ host: HOST, user: USER, password: PASSWORD, database: DATABASE, port: PORT, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    
    // Get campus
    const { rows: campuses } = await client.query('SELECT id FROM campuses LIMIT 1');
    const campusId = campuses[0].id;
    
    // Get levels
    const { rows: levels } = await client.query('SELECT id, name FROM academic_levels');
    const levelMap = {};
    levels.forEach(l => levelMap[l.name] = l.id);

    console.log('Seeding official academic structure...');
    
    for (const c of collegesData) {
      // Upsert College
      let collegeRes = await client.query('SELECT id FROM colleges WHERE name = $1', [c.name]);
      let collegeId;
      if (collegeRes.rows.length === 0) {
        const insertRes = await client.query(
          'INSERT INTO colleges (campus_id, name, code) VALUES ($1, $2, $3) RETURNING id',
          [campusId, c.name, c.code]
        );
        collegeId = insertRes.rows[0].id;
        console.log(`Inserted College: ${c.name}`);
      } else {
        collegeId = collegeRes.rows[0].id;
      }
      
      const progs = programsData[c.code] || [];
      for (const p of progs) {
        // Upsert Program
        let progRes = await client.query('SELECT id FROM programs WHERE name = $1 OR code = $2', [p.name, p.code]);
        let progId;
        if (progRes.rows.length === 0) {
          const pInsert = await client.query(
            'INSERT INTO programs (college_id, academic_level_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id',
            [collegeId, levelMap[p.level], p.name, p.code]
          );
          progId = pInsert.rows[0].id;
          console.log(`  Inserted Program: ${p.name}`);
        } else {
          progId = progRes.rows[0].id;
          // Update it to correct college and level
          await client.query('UPDATE programs SET college_id = $1, academic_level_id = $2 WHERE id = $3', [collegeId, levelMap[p.level], progId]);
        }
        
        // Upsert Majors
        if (p.majors) {
          for (const m of p.majors) {
             const mRes = await client.query('SELECT id FROM majors WHERE program_id = $1 AND name = $2', [progId, m]);
             if (mRes.rows.length === 0) {
                await client.query('INSERT INTO majors (program_id, name) VALUES ($1, $2)', [progId, m]);
                console.log(`    Inserted Major: ${m}`);
             }
          }
        }
      }
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await client.end();
  }
}
seed();
