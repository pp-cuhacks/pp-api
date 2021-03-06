import express from 'express';
import bodyParser from 'body-parser';
import pgp from 'pg-promise';
import { User } from 'User';
import { v4 as uuidv4 } from 'uuid';
import GoogleOauthEntry from './oauth20-google';
import { Clinic } from 'Clinic';
import { Vaccine } from 'Vaccine';
import { Patient } from 'Patient';
import sgMail from '@sendgrid/mail';
const path = require("path");

const app = express();

sgMail.setApiKey(process.env.SG_KEY);

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
  const userId = uuidv4();
  await db.none('INSERT INTO users(user_id, email, name, role) VALUES(${id}, ${email}, ${name}, ${role})', {
    id: userId,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

async function createOrUpdatePatient(userId: string, priority: number, postal: string) {
  const result = await db.oneOrNone<Patient>('SELECT * FROM patients WHERE user_id = ${userId}', {
    userId
  });

  if (result) {
    return await updatePatientPriority(userId, priority);
  }

  await createPatient(userId, priority, postal);
}

async function createPatient(userId: string, priority: number, postal: string) {
  const patient_id = uuidv4();
  await db.none('INSERT INTO patients(patient_id, user_id, group_priority, postal_code) VALUES(${patientId}, ${userId}, ${priority}, ${postal})', {
    patientId: patient_id,
    userId,
    priority,
    postal
  });
}

async function updatePatientPriority(userId: string, priority: number) {
  await db.none('UPDATE patients SET group_priority = ${group_priority} WHERE user_id = ${userId}', {
    group_priority: priority,
    userId
  });
}

async function createOrUpdateClinic(userId: string, postal: string) {
  const result = await db.oneOrNone<Clinic>('SELECT * FROM clinics WHERE user_id = ${userId}', {
    userId
  });

  if (result) {
    return;
  }

  await createClinic(userId, postal);
}

async function createClinic(userId: string, postal: string) {
  const clinicId = uuidv4();
  await db.none('INSERT INTO clinics(clinic_id, user_id, postal_code) VALUES(${clinicId}, ${userId}, ${postal})', {
    clinicId,
    userId,
    postal
  });
}

export async function getUserById(id: string) {
  return await db.one<User>("SELECT * FROM users WHERE user_id = ${id}", { id });
}

export async function getUserByEmail(email: string) {
  return await db.one<User>("SELECT * FROM users WHERE email = ${email}", { email });
}

export async function getAllPatientUsers() {
  return await db.many<User>('SELECT * FROM patients p INNER JOIN users u ON u.user_id = p.user_id');
}

export async function getClinicById(id: string) {
  return await db.one<Clinic>("SELECT * FROM clinics WHERE clinic_id = ${id}", { id });
}

export async function getVaccinesByClinic(id: string) {
  return await db.many<Vaccine>("SELECT v.id, v.clinic_id, v.name, v.quantity FROM vaccines v INNER JOIN clinics c ON v.clinic_id = c.clinic_id");
}

export async function updateVaccinesByClinic(id: string, name: string, quantity: number) {
  return await db.none("UPDATE vaccines SET quantity = quantity + ${quantity} WHERE name = ${name} AND clinic_id = ${id}", {
    name,
    quantity,
    id
  });
}

async function sendEmails() {
  const msg = {
    to: 'chan.cy.patrick@gmail.com',
    from: 'pphacks@patchan.dev',
    subject: 'Book your COVID-19 Vaccination',
    text: 'A vaccine is available for you! http://patrickchan.me/appointmentpage',
    html: 'A vaccine is available for you! <a href="http://patrickchan.me/appointmentpage">Click here to book</a>',
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent')
      return msg;
    })
    .catch((error) => {
      console.error(error)
      throw error;
    })
}

// create a new user
app.post('/v1/user/', async (req, res) => {
  console.log('hitting post /v1/user');
  console.log('req.body: ')
  console.log(req.body);
  const user = req.body as Partial<User>;

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
      const response = await getUserById(id);
      res.status(200).send(response);
    } catch (err) {
      res.status(400).send(err);
    }
  })
  // update user with info (postal code, priority group)
  .post(async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const user = await getUserById(id);
    console.log(user);
    try {
      if (user.role === 'patient') {
        console.log(req.body);
        await createOrUpdatePatient(user.user_id, parseInt(req.body.priority), req.body.postalCode);
      } else {
        await createOrUpdateClinic(user.user_id, req.body.address);
      }
      res.send(200);
    } catch (err) {
      console.log(err);
      res.status(400).send(err);
    }
  });

app.route('/v1/clinic/:id/vaccine')
  .get(async (req, res) => {
    const id = req.params.id;
    const clinic = await getClinicById(id);
    try {
      const response = await getVaccinesByClinic(clinic.clinic_id);
      res.status(200).send(response);
    } catch (err) {
      res.status(400).send(err);
    }
  })
  .post(async (req, res) => {
    const id = req.params.id;
    try {
      await updateVaccinesByClinic(id, req.body.name, parseInt(req.body.inventory));
      res.send(204);
    } catch (err) {
      console.log(err);
      res.status(400).send(err);
    }
  });

app.get('/v1/email', async (req, res) => {
  try {
    const response = await sendEmails();
    res.send(200).send(response);
  } catch (err) {
    res.status(400).send(err);
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "..", "build/")));

app.get("/", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

// adding paths because /* breaks things
app.get("/loginpage", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});
app.get("/signuppage", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});
app.get("/userhomepage", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});
app.get("/adminhomepage", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});
app.get("/appointmentpage", (req, res) => {
  // send landing page
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

export default app;
