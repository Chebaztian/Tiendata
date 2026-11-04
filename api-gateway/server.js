'use strict';

require('dotenv').config();

const { createApp } = require('./src/app');

const port = Number(process.env.PORT || 3000);

// Las URLs de servicios se leen de process.env dentro de createServicesConfig,
// así que basta con instanciar la app sin argumentos para producción.
const app = createApp();

app.listen(port, () => {
  console.log(`🌐 API Gateway TIENDATA escuchando en el puerto ${port}`);
});
