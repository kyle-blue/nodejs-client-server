import app from "../app";

//TODO: SERVER Do 404 and error handling


const PORT = parseInt(process.env.PORT) || 8081;
process.env.PORT = PORT.toString();

app.listen(PORT, (): void => console.log(`Server running on port: ${PORT}`));

//// Server error handling here ////
//// e.g.  app.on('error', onError); ////
