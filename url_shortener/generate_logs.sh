#!/bin/bash

echo "Starting URL Shortener Log Generation Script"
echo "This script will generate sample logs by interacting with the URL Shortener API"

# Base URL for the API
API_URL="http://localhost:3001/shorturls"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to create a shortened URL
create_url() {
    local url=$1
    local validity=$2
    local shortcode=$3
    
    echo -e "${YELLOW}Creating shortened URL for: ${url}${NC}"
    
    local payload="{\"url\":\"${url}\",\"validity\":${validity}"
    
    if [ -n "$shortcode" ]; then
        payload="${payload},\"shortcode\":\"${shortcode}\""
    fi
    
    payload="${payload}}"
    
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "${payload}" ${API_URL})
    
    if [[ $response == *"shortLink"* ]]; then
        shortlink=$(echo $response | grep -o '"shortLink":"[^"]*' | sed 's/"shortLink":"//')
        echo -e "${GREEN}Successfully created shortened URL: ${shortlink}${NC}"
        echo $shortlink
    else
        echo -e "${RED}Failed to create shortened URL: ${response}${NC}"
        echo ""
    fi
}

# Function to get URL statistics
get_statistics() {
    local shortcode=$1
    
    echo -e "${YELLOW}Getting statistics for shortcode: ${shortcode}${NC}"
    
    response=$(curl -s -X GET ${API_URL}/${shortcode})
    
    if [[ $response == *"totalClicks"* ]]; then
        clicks=$(echo $response | grep -o '"totalClicks":[0-9]*' | sed 's/"totalClicks"://')
        echo -e "${GREEN}URL has been clicked ${clicks} times${NC}"
    else
        echo -e "${RED}Failed to get statistics: ${response}${NC}"
    fi
}

# Function to access a shortened URL (trigger a redirect)
access_url() {
    local shortcode=$1
    
    echo -e "${YELLOW}Accessing shortened URL with shortcode: ${shortcode}${NC}"
    
    response=$(curl -s -I http://localhost:3001/${shortcode})
    
    if [[ $response == *"302"* ]]; then
        echo -e "${GREEN}Successfully redirected${NC}"
    else
        echo -e "${RED}Redirect failed: ${response}${NC}"
    fi
}

echo "======================================="
echo "GENERATING LOGS FOR MANAGER REVIEW"
echo "======================================="

echo -e "\n1. Creating valid shortened URLs..."
shortlink1=$(create_url "https://www.google.com" 30 "")
shortcode1=$(echo $shortlink1 | awk -F'/' '{print $NF}')

shortlink2=$(create_url "https://www.github.com" 60 "github")
shortcode2="github"

# Intentionally generate some errors
echo -e "\n2. Generating some error logs..."
echo -e "${YELLOW}Creating URL with invalid format (missing http://)${NC}"
create_url "invalid-url" 30 ""

echo -e "${YELLOW}Creating URL with already used shortcode${NC}"
create_url "https://www.microsoft.com" 30 "github"

# Generate statistics lookup logs
echo -e "\n3. Generating statistics lookup logs..."
get_statistics $shortcode1
get_statistics $shortcode2
get_statistics "nonexistent"

# Generate access logs
echo -e "\n4. Generating URL access logs..."
access_url $shortcode1
access_url $shortcode2
access_url "nonexistent"

# Generate load logs by creating multiple URLs quickly
echo -e "\n5. Generating high load logs with multiple requests..."
for i in {1..5}; do
    create_url "https://www.example${i}.com" 30 ""
done

echo -e "\n======================================="
echo "LOG GENERATION COMPLETE"
echo "Check the logs in the evaluation service"
echo "======================================="
