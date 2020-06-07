import app from "../app";

//TODO: SERVER Do 404 and error handling

const HOSTNAME = "0.0.0.0";
const PORT = parseInt(process.env.PORT) || 8081;
process.env.PORT = PORT.toString();

const server = app.listen(PORT, HOSTNAME, (): void => console.log(`Server running on: ${HOSTNAME}:${PORT}`));

//// Server error handling here ////
//// e.g.  app.on('error', onError); ////
