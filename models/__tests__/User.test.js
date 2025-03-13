const mongoose = require('mongoose');
const User = require('../User');

describe('User Model Test', () => {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '1234567890'
  };

  it('should create a new user successfully', async () => {
    const validUser = new User(userData);
    const savedUser = await validUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.phone).toBe(userData.phone);
    expect(savedUser.password).not.toBe(userData.password); // Password should be hashed
  });

  it('should fail to save user without required fields', async () => {
    const userWithoutRequiredField = new User({ name: 'Test User' });
    let err;
    try {
      await userWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should not save user with invalid email', async () => {
    const userWithInvalidEmail = new User({
      ...userData,
      email: 'invalid-email'
    });
    let err;
    try {
      await userWithInvalidEmail.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should update reward points correctly', async () => {
    const user = new User(userData);
    await user.save();

    const pointsToAdd = 100;
    await user.addRewardPoints(pointsToAdd, 'order-123');

    expect(user.rewardPoints).toBe(pointsToAdd);
    expect(user.pointHistory).toHaveLength(1);
    expect(user.pointHistory[0].points).toBe(pointsToAdd);
    expect(user.pointHistory[0].orderId).toBe('order-123');
  });

  it('should update membership tier based on points', async () => {
    const user = new User(userData);
    await user.save();

    await user.addRewardPoints(5000, 'order-123'); // Should upgrade to Silver
    expect(user.membershipTier).toBe('Silver');

    await user.addRewardPoints(10000, 'order-124'); // Should upgrade to Gold
    expect(user.membershipTier).toBe('Gold');
  });
});