# Video Upload, Sensitivity Processing, and Streaming Application

## Project Overview
A comprehensive full-stack application for video upload, content sensitivity analysis, and streaming with real-time progress tracking.

## Tech Stack
- **Backend**: Node.js, Express.js, MongoDB with Mongoose ODM
- **Frontend**: React + Vite, Tailwind CSS
- **Real-Time**: Socket.io
- **Authentication**: JWT
- **File Handling**: Multer

## Project Structure
```
manga/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── vite.config.js
└── uploads/
```

## Development Guidelines
- Follow RESTful API conventions
- Use proper error handling
- Implement RBAC (Viewer, Editor, Admin)
- Use environment variables for configuration
