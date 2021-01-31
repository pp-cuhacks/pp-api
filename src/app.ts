import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pgp from 'pg-promise';
import GoogleOauthEntry from './oauth20-google';

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

app.put('/v1/user', (req, res) => {
  const email = req.body.email;
  db.none('INSERT INTO users');
});

app.route('/v1/user/:id')
  .get((req, res) => {
    const id = req.params.id;
  })
  .post((req, res) => {

  });

app.get('/v1/user/list');

app.route('/v1/vaccine')
  .get((req, res) => {

  })
  .post((req, res) => {

  });

export default app;
