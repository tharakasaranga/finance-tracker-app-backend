
# Personal Finance Tracker - Backend

This is the backend part of the Personal Finance and Budget Tracking Application.  
It is developed using Node.js, Express.js and MongoDB.

## Tech Stack

Node.js
Express.js
MongoDB
Mongoose
Firebase Admin SDK
Express Validator
CORS
Dotenv

## Features

REST API
Firebase token verification
User-based protected routes
Category CRUD
Transaction CRUD
Budget CRUD
Dashboard summary API
MongoDB database connection

## Installing Dependencies

First go to the backend folder:

In Terminal
    cd backend
    npm install


## Create a .env file inside the backend folder.

PORT=5000
MONGO_URI=mongodb+srv://tharakasaranga755_db_user:eEVSFRXLzlkSocAY@finance-tracker-cluster.z9maht7.mongodb.net/?appName=Finance-Tracker-cluster
#MONGO_URI=mongodb://localhost:27017/finance-tracker
FIREBASE_PROJECT_ID=loginregister-e343a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@loginregister-e343a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n


Sir...I added these becuase of your easy.

# Terminal ->
    npm run dev