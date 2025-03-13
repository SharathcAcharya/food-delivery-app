const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

class NotificationService {
    constructor(io) {
        this.io = io;
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendNotification(userId, type, title, message, data = {}) {
        try {
            // Create in-app notification
            const notification = await Notification.create({
                recipient: userId,
                type,
                title,
                message,
                data
            });

            // Send real-time notification via WebSocket
            this.io.to(userId.toString()).emit('notification', notification);

            return notification;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async sendOrderStatusNotification(order) {
        const { user, status, _id: orderId } = order;
        const statusMessages = {
            confirmed: 'Your order has been confirmed and is being processed.',
            preparing: 'Your order is being prepared.',
            out_for_delivery: 'Your order is out for delivery.',
            delivered: 'Your order has been delivered. Enjoy your meal!',
            cancelled: 'Your order has been cancelled.'
        };

        if (statusMessages[status]) {
            await this.sendNotification(
                user,
                'order_status',
                `Order ${status}`,
                statusMessages[status],
                { orderId }
            );

            // Send email notification
            await this.sendEmail(
                user.email,
                `Food Delivery - Order ${status}`,
                statusMessages[status]
            );
        }
    }

    async sendPromotionalNotification(userId, title, message) {
        return this.sendNotification(userId, 'promotion', title, message);
    }

    async sendRewardNotification(userId, points, message) {
        return this.sendNotification(
            userId,
            'reward',
            'Reward Points Update',
            message,
            { points }
        );
    }

    async sendEmail(to, subject, text) {
        try {
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM,
                to,
                subject,
                text
            });
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;