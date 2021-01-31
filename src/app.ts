import express from 'express';
import bodyParser from 'body-parser';
import pgp from 'pg-promise';
import { User } from 'User';
import { v4 as uuidv4 } from 'uuid';
import GoogleOauthEntry from './oauth20-google';
const path = require("path");

const app = express();

// Include Google OAuth2.0
GoogleOauthEntry(app);

const connection = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 30 // use up to 30 connections
};

const db = pgp()(connection);

app.use(bodyParser.json());
app.use(bodyParser.text());

export async function insertUser(user: Partial<User>) {
  await db.none('INSERT INTO users(user_id, email, name, role) VALUES(${id}, ${email}, ${name}, ${role})', {
    id: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

async function createPatient(userId: string, priority: string, postal: string) {
  await db.none('INSERT INTO patients(patient_id, user_id, group_priority, postal_code) VALUES(${patientId}, ${userId}, ${priority}, ${postal})', {
    pid: uuidv4(),
    userId,
    priority,
    postal
  });
}

async function createClinic(userId: string, address: string) {
  await db.none('INSERT INTO clinics(clinic_id, user_id, address) VALUES(${clinicId}, ${userId}, ${address})', {
    cid: uuidv4(),
    userId,
    address
  });
}

export async function getUserById(id: string) {
  return await db.one<User>('SELECT * FROM users WHERE user_id = ${id}', { id });
}

export async function getUserByEmail(email: string) {
  return await db.one<User>('SELECT * FROM users WHERE email = ${email}', { email });
}

export async function getAllPatientUsers() {
  return await db.one<User[]>('SELECT * FROM patients p INNER JOIN users u ON u.user_id = p.user_id');
}

// create a new user
app.post('/v1/user/', async (req, res) => {
  console.log('hitting post /v1/user')
  console.log(req);
  const user = req.body as Partial<User>;
  user.userId = uuidv4();

  try {
    await insertUser(user);
    res.send(204);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.get('/v1/user/list', async (req, res) => {
  try {
    const response = await getAllPatientUsers();
    res.status(200).send(response);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.route('/v1/user/:id')
  // get user information
  .get(async (req, res) => {
    const id = req.params.id;
    try {
      const response = getUserById(id);
      res.status(200).send(response);
    } catch (err) {
      res.status(400).send(err);
    }
  })
  // update user with info (postal code, priority group)
  .post(async (req, res) => {
    const id = req.params.id;
    const user = await getUserById(id);
    try {
      if (user.role === 'patient') {
        await createPatient(user.userId, req.body.priority, req.body.postalCode);
      } else {
        await createClinic(user.userId, req.body.address);
      }
      res.send(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

app.route('/v1/clinic/:id/vaccine')
  .get((req, res) => {
    const id = req.params.id;
  })
  .post((req, res) => {
    const id = req.params.id;
  });

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "..", "build/")));

app.get("/", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

export default app;
