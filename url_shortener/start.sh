#!/bin/bash

# Navigate to the project directory
cd /d/22L31A05C0/url_shortener

# Echo messages for logs
echo "Starting setup process for URL Shortener application..."
echo "Installing backend dependencies..."

# Navigate to backend and install dependencies
cd backend
npm install

# Intentionally add a small delay to simulate setup time and generate logs
echo "Configuring backend environment..."
sleep 2

# Start the backend server in the background
echo "Starting backend server..."
npm start &

# Add a delay to ensure backend starts before frontend
echo "Waiting for backend to initialize..."
sleep 5

# Navigate back to frontend directory
cd ..

# Start the frontend
echo "Starting frontend application..."
npm start

# This will keep the script running as long as npm start is running
wait
