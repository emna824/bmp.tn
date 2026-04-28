const express = require('express');
const request = require('supertest');

jest.mock('../models/user', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/notification', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../utils/banUtils', () => ({
  assertUserNotBanned: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const User = require('../models/user');
const Notification = require('../models/notification');
const bcrypt = require('bcryptjs');
const { assertUserNotBanned } = require('../utils/banUtils');
const userRoutes = require('../routes/userRoutes');

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mount the existing login handler under /api/auth for isolated endpoint tests.
  app.use('/api/auth', userRoutes);

  return app;
}

describe('POST /api/auth/login', () => {
  let app;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Sami Expert',
    email: 'sami@example.com',
    password: '$2a$10$hashed-password',
    role: 'expert',
    googleAuth: false,
    trade: '',
    job: 'Expert',
    isPremium: false,
    subscriptionType: null,
  };

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    Notification.countDocuments.mockResolvedValue(0);
    assertUserNotBanned.mockResolvedValue({ ok: true, user: mockUser });
  });

  it('returns 200 with the logged-in user for a valid login', async () => {
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app).post('/api/auth/login').send({
      email: mockUser.email,
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ email: mockUser.email });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Login successful',
        user: expect.any(Object),
      })
    );
  });

  it('returns 401 for an invalid password', async () => {
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app).post('/api/auth/login').send({
      email: mockUser.email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });

  it('returns 401 when the user does not exist', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });
});
