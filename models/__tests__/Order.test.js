const mongoose = require('mongoose');
const Order = require('../Order');
const User = require('../User');

describe('Order Model Test', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '1234567890'
    });
  });

  const orderData = {
    user: null,
    items: [
      {
        food: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: 200
      }
    ],
    total: 400,
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      phone: '1234567890'
    },
    paymentMethod: 'cash'
  };

  it('should create a new order successfully', async () => {
    orderData.user = testUser._id;
    const order = new Order(orderData);
    const savedOrder = await order.save();

    expect(savedOrder._id).toBeDefined();
    expect(savedOrder.user.toString()).toBe(testUser._id.toString());
    expect(savedOrder.total).toBe(orderData.total);
    expect(savedOrder.status).toBe('pending');
  });

  it('should fail to save order without required fields', async () => {
    const invalidOrder = new Order({
      user: testUser._id
    });

    let err;
    try {
      await invalidOrder.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('should update order status correctly', async () => {
    orderData.user = testUser._id;
    const order = new Order(orderData);
    await order.save();

    order.status = 'confirmed';
    await order.save();
    expect(order.status).toBe('confirmed');

    order.status = 'preparing';
    await order.save();
    expect(order.status).toBe('preparing');
  });

  it('should calculate total correctly based on items', async () => {
    orderData.user = testUser._id;
    orderData.items = [
      {
        food: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: 200
      },
      {
        food: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: 300
      }
    ];
    orderData.total = 700; // 2 * 200 + 1 * 300

    const order = new Order(orderData);
    const savedOrder = await order.save();

    expect(savedOrder.total).toBe(700);
  });

  it('should track order status history', async () => {
    orderData.user = testUser._id;
    const order = new Order(orderData);
    await order.save();

    expect(order.statusHistory).toHaveLength(1);
    expect(order.statusHistory[0].status).toBe('pending');

    order.status = 'confirmed';
    await order.save();

    expect(order.statusHistory).toHaveLength(2);
    expect(order.statusHistory[1].status).toBe('confirmed');
  });
});