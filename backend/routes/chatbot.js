const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { spawn } = require('child_process');
const User = require('../models/User');


router.post('/chat', async (req, res) => {
  const userQuery = req.body.query;

  if (!userQuery || userQuery.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a valid query.' });
  }


  const chatbotResponsePromise = new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['./backend/routes/chatbot.py', userQuery]);

    pythonProcess.stdout.on('data', (data) => {
      const responseString = data.toString();
      try {
        const responseObject = JSON.parse(responseString);
        resolve(responseObject);
      } catch (error) {
        reject(error);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data.toString()}`);
      reject(new Error('Internal server error.'));
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        reject(new Error('Internal server error.'));
      }
    });
  });

  try {
    const chatbotResponse = await chatbotResponsePromise;
    res.json(chatbotResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }


});

router.post('/userdetails', [
  body('name').isLength({ min: 5 }),
  body('email').isEmail(),
], async (req, res) => {
  // Extract name and email from the request body
  const { name, email } = req.body;

  try {
    // Check if a user with the same email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json("A User with this email address already exists!");
    }

    // Create a new user document
    user = await User.create({
      name,
      email,
    });

    // Respond with a success message
    res.status(201).json('Thank you for providing your details!');
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;


