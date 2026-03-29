# AI Diet & Nutrition Planner 🥗

A beautiful and modern full-stack web application for personalized diet planning, calorie tracking, and nutritional recommendations. Built with React (Vite), Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication:** Secure sign-up and login system for individual users.
- **Calorie Tracking:** Easily log daily food intake and track nutrition.
- **Diet Recommendations:** Get personalized diet plans based on your fitness goals (weight loss, muscle gain, maintenance).
- **Progress Tracking:** Interactive charts to visualize your weight and caloric progress over time.
- **Modern UI:** A stunning, responsive, glassmorphism design that looks beautiful on any device.

## 💻 Tech Stack

- **Frontend:** React.js, Vite, React Router, Recharts, CSS (Modern UI)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Local or Atlas)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

## 🛠️ How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a MongoDB Atlas URI)

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Make sure your `backend/.env` file is set up correctly:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/diet-planner
JWT_SECRET=your_secret_key
```

### 3. Frontend Setup
Open a **new** terminal:
```bash
cd frontend
npm install
npm run dev
```
The application will be running at `http://localhost:5173`.

## 📸 Overview
Built with clean architecture, focusing on an incredible user experience with smooth animations and dynamic data visualization.
