import app from './app';

const API_PORT = 4000;

const server = app.listen(API_PORT,
    () => { console.log(`Listening on port ${API_PORT}!`) },
);

export default server;
