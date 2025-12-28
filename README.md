# Video Upload, Sensitivity Processing, and Streaming Application

A comprehensive full-stack application for video upload, AI-powered content sensitivity analysis, and streaming with real-time progress tracking.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Features

- **Video Upload & Streaming**: Upload videos with real-time progress tracking and HLS-compatible streaming
- **AI-Powered Sensitivity Analysis**: Uses Hugging Face ML models for content moderation
  - NSFW/Adult content detection
  - Violence detection
  - Explicit language detection
  - Drug-related content detection
  - Disturbing content detection
- **YouTube URL Import**: Import videos from YouTube with automatic thumbnail analysis
- **User Authentication**: JWT-based authentication with email verification
- **Role-Based Access Control**: Viewer, Editor, and Admin roles
- **Admin Panel**: User and video management capabilities
- **Real-Time Updates**: Socket.io for live processing status updates
- **Modern UI**: Glassmorphism design with Tailwind CSS

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │      Context/State      │  │
│  │ - Dashboard │  │ - VideoCard │  │ - AuthContext           │  │
│  │ - Upload    │  │ - Layout    │  │ - SocketContext         │  │
│  │ - Library   │  │ - Progress  │  │                         │  │
│  │ - Player    │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js + Express)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │  │ Controllers │  │       Services          │  │
│  │ - /auth     │  │ - auth      │  │ - mlAnalysisService     │  │
│  │ - /videos   │  │ - video     │  │ - socketService         │  │
│  │ - /stream   │  │ - stream    │  │ - emailService          │  │
│  │ - /admin    │  │ - admin     │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Middleware │  │   Models    │  │    External APIs        │  │
│  │ - auth.js   │  │ - User      │  │ - Hugging Face          │  │
│  │ - multer    │  │ - Video     │  │ - YouTube Thumbnails    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Database)                      │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │     Users Collection    │  │     Videos Collection       │   │
│  │ - username, email       │  │ - title, description        │   │
│  │ - password (hashed)     │  │ - sensitivityDetails        │   │
│  │ - role, verified        │  │ - processingStatus          │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.21
- **Database**: MongoDB with Mongoose 8.15
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Real-Time**: Socket.io 4.8
- **ML Analysis**: @huggingface/inference
- **Video Processing**: fluent-ffmpeg

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **HTTP Client**: Axios
- **Routing**: React Router DOM 6
- **Icons**: React Icons
- **Notifications**: React Toastify

## 📦 Third-Party Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `@huggingface/inference` | ^2.8.1 | AI-powered content analysis |
| `fluent-ffmpeg` | ^2.1.3 | Video frame extraction |
| `mongoose` | ^8.15.0 | MongoDB ODM |
| `jsonwebtoken` | ^9.0.2 | JWT authentication |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `multer` | ^1.4.5 | File upload handling |
| `socket.io` | ^4.8.1 | Real-time communication |
| `nodemailer` | ^6.10.0 | Email verification |

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- FFmpeg installed (`brew install ffmpeg` on macOS)
- Hugging Face API key (free at https://huggingface.co/settings/tokens)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/Video-Upload-Sensitivity-Processing-and-Streaming-Application-Assignment.git
cd Video-Upload-Sensitivity-Processing-and-Streaming-Application-Assignment
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**
```bash
# Create .env file in backend folder
cp .env.example .env

# Edit .env with your credentials:
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

4. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

5. **Start the application**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Admin Account
- Email: `admin@streamvault.com`
- Password: `admin123`

## 📖 Usage Examples

### 1. Upload a Video
```bash
# Using curl
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "title=My Video" \
  -F "description=Video description"
```

### 2. Import from YouTube URL
```bash
curl -X POST http://localhost:5000/api/videos/import-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "title": "YouTube Video",
    "description": "Imported from YouTube"
  }'
```

### 3. Get Video Analysis Results
```bash
curl http://localhost:5000/api/videos/VIDEO_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "video": {
    "title": "Sample Video",
    "sensitivityScore": 45,
    "sensitivityStatus": "flagged",
    "sensitivityDetails": {
      "violence": 60,
      "adult": 10,
      "language": 25,
      "drugs": 5,
      "disturbing": 15,
      "rating": "PG-13"
    }
  }
}
```

## 🧪 Testing

### Sample Test URLs

The ML analysis system has been tested with various content types:

| URL Type | Expected Detection | Result |
|----------|-------------------|--------|
| UFC/Fighting Videos | High Violence Score (55%+) | ✅ Pass |
| Music Videos | Low Scores | ✅ Pass |
| Educational Content | Low Scores | ✅ Pass |
| Gaming Videos | Varies by content | ✅ Pass |

### Running Tests
```bash
# Test video upload
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "video=@test.mp4"

# Test URL analysis
curl -X POST http://localhost:5000/api/videos/analyze-url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=TEST_ID"}'
```

## 🔧 Design Rationale

### ML Analysis Approach

1. **Dual Analysis System**: 
   - Hugging Face ML models for accurate image/video classification
   - Keyword-based fallback for text analysis (always active)

2. **Multi-Model Pipeline**:
   - `Falconsai/nsfw_image_detection` - NSFW content detection
   - `google/vit-base-patch16-224` - General image classification
   - `facebook/roberta-hate-speech-dynabench-r4-target` - Text toxicity

3. **YouTube Thumbnail Analysis**: 
   - Extracts video ID from YouTube URLs
   - Fetches high-quality thumbnails
   - Runs full ML analysis on thumbnail

### Content Rating System

| Rating | Criteria |
|--------|----------|
| G | Overall score < 25 |
| PG | Overall score 25-50 |
| PG-13 | Violence > 40 OR drugs > 40 OR overall > 50 |
| R | Adult > 50 OR overall > 70 |

## ⚠️ Assumptions & Limitations

### Assumptions
1. Videos are in standard web formats (MP4, WebM, MOV)
2. Users have stable internet for ML API calls
3. Hugging Face API is available and responsive
4. MongoDB Atlas connection is stable

### Known Limitations
1. **Thumbnail-Only Analysis for URLs**: External URLs (YouTube, etc.) are analyzed via thumbnails only, not full video content
2. **API Rate Limits**: Hugging Face free tier has rate limits
3. **Processing Time**: Large videos may take several minutes to process
4. **Language Detection**: Currently optimized for English content
5. **False Positives**: ML models may occasionally flag benign content

### Edge Cases Handled
- Invalid video formats - Returns error message
- Network failures - Graceful fallback to keyword analysis
- Missing metadata - Uses defaults
- Concurrent uploads - Queue-based processing

## 📁 Project Structure

```
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── multer.js          # File upload config
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   ├── videoController.js # Video CRUD operations
│   │   ├── streamController.js# Video streaming
│   │   └── adminController.js # Admin operations
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── errorHandler.js    # Error handling
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Video.js           # Video schema
│   ├── routes/
│   │   ├── auth.js            # Auth routes
│   │   ├── videos.js          # Video routes
│   │   ├── stream.js          # Streaming routes
│   │   └── admin.js           # Admin routes
│   ├── services/
│   │   ├── mlAnalysisService.js # ML content analysis
│   │   ├── socketService.js   # Real-time updates
│   │   └── emailService.js    # Email verification
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React context
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── App.jsx            # Main app
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/verify-email/:token` | Verify email |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload video |
| POST | `/api/videos/import-url` | Import from URL |
| GET | `/api/videos` | List all videos |
| GET | `/api/videos/:id` | Get video details |
| PUT | `/api/videos/:id` | Update video |
| DELETE | `/api/videos/:id` | Delete video |
| POST | `/api/videos/:id/reanalyze` | Re-run ML analysis |

### Streaming
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stream/:id` | Stream video |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/videos` | List all videos |
| DELETE | `/api/admin/videos/:id` | Delete video |

## 📄 License

MIT License - see LICENSE file for details.

## 👤 Author

Rajaswamy S

---

*Built with ❤️ using Node.js, React, and AI*
