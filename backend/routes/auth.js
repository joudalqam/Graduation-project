const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    // Check if user already exists
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Email already exists" })
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10)

    // Create user
    const user = await User.create({
      name, email, password: hashed, phone
    })

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.status(201).json({ token, user: {
      id: user._id, name: user.name, email: user.email
    }})

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // Check password
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" })
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, user: {
      id: user._id, name: user.name, email: user.email
    }})

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router