import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {isValidEmail, isValidPassword} from '../validation.js';

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const {firstName, lastName} = req.body;
    let {email, password} = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({error: 'First name, last name, email and password are required.'});
    }

    email = String(email).trim().toLowerCase();
    password = String(password);

    if (email === '' || password === '') {
      return res.status(400).json({error: 'Email and password cannot be empty.'});
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({error: 'Invalid email format.'});
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include a letter and a number.',
      });
    }

    const existing = await User.findOne({email});
    if (existing) {
      return res.status(409).json({error: 'Email already registered.'});
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({firstName, lastName, email, passwordHash});

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName},
    });
  } catch (err) {
    console.error(err);
    if (err?.code === 11000) {
      return res.status(409).json({error: 'Email already registered.'});
    }
    return res.status(500).json({error: 'Server error.'});
  }
});

// POST /auth/login ✅ NEW
router.post('/login', async (req, res) => {
  try {
    let {email, password} = req.body;

    if (email == null || password == null) {
      return res.status(400).json({error: 'Email and password are required.'});
    }

    email = String(email).trim().toLowerCase();
    password = String(password);

    if (email === '' || password === '') {
      return res.status(400).json({error: 'Email and password cannot be empty.'});
    }

    const user = await User.findOne({email});
    if (!user) {
      return res.status(401).json({error: 'Invalid email or password.'});
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({error: 'Invalid email or password.'});
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({error: 'Server config issue.'});
    }

    const token = jwt.sign(
        {id: user.id},
        process.env.JWT_SECRET,
        {expiresIn: '7d'},
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({error: 'Server error.'});
  }
});

export default router;

