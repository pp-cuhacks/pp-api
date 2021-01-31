import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pgp, { QueryFile } from 'pg-promise';
import { User } from 'User';
import uuid from 'uuid';

const app = express();

const connection = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 30 // use up to 30 connections
};

const db = pgp()(connection);

app.use(cors);
app.use(bodyParser.json());
app.use(bodyParser.text());

async function insertUser(user: Partial<User>) {
  await db.none('INSERT INTO users(user_id, email, password, name, role) VALUES(${id}, ${email}, ${pass}, ${name}, ${role})', {
    id: user.userId,
    email: user.email,
    pass: user.password,
    name: user.name,
    role: user.role,
  });
}

async function insertPatient(userId: string, priority: string, postal: string) {
  await db.none('INSERT INTO patients(patient_id, user_id, group_priority, postal_code) VALUES(${patientId}, ${userId}, ${priority}, ${postal})', {
    pid: uuid(),
    userId,
    priority,
    postal
  });
}

async function insertClinic(userId: string, address: string) {
  await db.none('INSERT INTO clinics(clinic_id, user_id, address) VALUES(${clinicId}, ${userId}, ${address})', {
    cid: uuid(),
    userId,
    address
  });
}

function importSql(filePath: string) {
  return new QueryFile(filePath, { minify: true });
}

const queries = {
  addPatient: importSql('./queries/addPatient.sql'),
  addClinic: importSql('./queries/addClinic.sql'),
};

// create a new user
app.put('/v1/user', async (req, res) => {
  const user = req.body as Partial<User>;
  user.userId = uuid();

  try {
    await insertUser(user);
    res.send(204);
  } catch (err) {
    res.send(400, err);
  }
});

app.route('/v1/user/:id')
  // get user information
  .get(async (req, res) => {
    const id = req.params.id;
    try {
      const response = await db.one('SELECT * FROM users WHERE user_id = ${id}', { id });
      res.send(200, response);
    } catch (err) {
      res.send(400, err);
    }
  })
  // update user with info (postal code, priority group)
  .post((req, res) => {
    const id = req.params.id;
  });

app.get('/v1/user/list');

app.route('/v1/clinic/:id/vaccine')
  .get((req, res) => {
    const id = req.params.id;
  })
  .post((req, res) => {
    const id = req.params.id;
  });

export default app;
