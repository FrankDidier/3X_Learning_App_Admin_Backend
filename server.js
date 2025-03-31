// Add CORS configuration to allow both frontend and mobile app
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.MOBILE_APP_URL,
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8100'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this near your other routes
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});