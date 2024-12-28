Setup Guide

Prerequisites
Ensure you have the following installed:
Node.js
MySQL

Step 1: Download and Prepare the Repository
1. Download the repository from GitHub:
Parking System GitHub Repository.
2. Extract the downloaded zip file to a folder on your computer.
3. Open the Backend folder:
  - Right-click inside the folder and select Open in Terminal (or use your terminal to navigate to the folder).
4. Install the required dependencies by running the following command:
        npm install

Step 2: Import the Database
1. Open the server.js file in the Backend folder:
  - Replace the placeholder MySQL username and password with your own credentials.
  - Save the changes.
2. Launch MySQL Workbench and connect to your MySQL server.
3. Import the database:
  - In the top menu, go to Server > Data Import.
  - Select Import from Self-Contained File and browse to the .sql file in the Backend folder.
  - Choose your target schema (database name) or create a new one.
  - Click Start Import to complete the process.

Step 3: Start the Server
1. Return to the terminal window where you opened the Backend folder.
2. Start the server by running the following command:
        node server.js

Step 4: Open the Website
1. Navigate to the Frontend folder.
2. Open the index.html file in your browser.

Note: If any issues occur, ensure your MySQL connection details in server.js are correct and that the database is properly imported.