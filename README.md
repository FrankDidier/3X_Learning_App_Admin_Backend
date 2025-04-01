# Education Platform Backend

This is the backend API for the Education Platform, built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Course management
- Payment processing
- Promotion and referral system
- AI-powered assistance
- Quiz and assessment system
- Admin dashboard

## Prerequisites

- Node.js (v14.x or higher)
- MongoDB (v4.x or higher)
- npm or yarn

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   ```
   cp .env.example .env
   ```
   
   Edit the `.env` file and update the values as needed.

4. Create required directories:
   ```
   mkdir -p uploads/avatars uploads/course uploads/payments
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/send-code` - Send verification code via SMS
- `GET /api/auth/me` - Get current user profile

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create a new course (teacher, admin)
- `PUT /api/courses/:id` - Update a course (teacher, admin)
- `DELETE /api/courses/:id` - Delete a course (teacher, admin)

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz by ID
- `POST /api/quizzes` - Create a new quiz (teacher, admin)
- `PUT /api/quizzes/:id` - Update a quiz (teacher, admin)
- `DELETE /api/quizzes/:id` - Delete a quiz (teacher, admin)
- `POST /api/quizzes/:id/questions` - Add a question to a quiz (teacher, admin)
- `POST /api/quizzes/:id/attempt` - Start a new quiz attempt
- `PUT /api/quizzes/attempts/:id` - Submit answers for a quiz attempt
- `GET /api/quizzes/attempts/:id` - Get a specific quiz attempt
- `GET /api/quizzes/attempts/user/:userId` - Get all quiz attempts for a user
- `GET /api/quizzes/statistics/:id` - Get quiz statistics (teacher, admin)

### Payments
- `POST /api/payments/course` - Process course payment
- `GET /api/payments/history` - Get payment history
- `GET /api/payments/:id/status` - Check payment status

### Promotions
- `GET /api/promotions/verify/:code` - Verify a promotion code
- `POST /api/promotions/generate` - Generate a referral code (teacher)

### AI Assistance
- `POST /api/ai/query` - Submit an AI query
- `GET /api/ai/history` - Get AI query history
- `POST /api/ai/generate-materials` - Generate teaching materials (teacher)

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update a user
- `DELETE /api/admin/users/:id` - Delete a user

## Project Structure

```
backend/
├── middleware/       # Middleware functions
├── models/           # Mongoose models
├── routes/           # API routes
├── utils/            # Utility functions
├── uploads/          # Uploaded files
├── server.js         # Entry point
├── package.json      # Dependencies
└── .env              # Environment variables
```

## Testing

Run tests using:
```
npm test
```

## Deployment

For production deployment:
```
npm start
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 