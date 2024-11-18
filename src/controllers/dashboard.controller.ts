import { Order, OrderStatus } from '../models/order.model';
import { Item } from '../models/item.model';
import { Customer } from '../models/customer.model';
import { Transaction, TransactionStatus } from '../models/transaction.model';
import type { DashboardMetrics, RevenueAnalytics, OrderSummary, RecentOrder, TrendingMenu, DashboardResponse } from '../types/dashboard.types';

export class DashboardController {
    static async getDashboardMetrics(): Promise<DashboardMetrics> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalMenus,
            totalOrders,
            totalCustomers,
            totalTransactions,
            todayMenus,
            todayOrders,
            todayCustomers,
            todayTransactions
        ] = await Promise.all([
            Item.countDocuments(),
            Order.countDocuments(),
            Customer.countDocuments(),
            Transaction.find({ status: TransactionStatus.SUCCESS }).select('amount'),
            Item.countDocuments({ createdAt: { $gte: today } }),
            Order.countDocuments({ createdAt: { $gte: today } }),
            Customer.countDocuments({ createdAt: { $gte: today } }),
            Transaction.find({
                status: TransactionStatus.SUCCESS,
                createdAt: { $gte: today }
            }).select('amount')
        ]);

        const totalIncome = totalTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const todayIncome = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        return {
            totalMenus,
            totalOrders,
            totalCustomers,
            totalIncome,
            todayStats: {
                menus: todayMenus,
                orders: todayOrders,
                customers: todayCustomers,
                income: todayIncome
            }
        };
    }

    static async getRevenueAnalytics(): Promise<RevenueAnalytics> {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        // Get last 12 months of revenue
        const revenueData = await Transaction.aggregate([
            {
                $match: {
                    status: TransactionStatus.SUCCESS,
                    createdAt: {
                        $gte: new Date(new Date().setMonth(currentMonth - 11))
                    }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const data = Array(12).fill(0);
        revenueData.forEach(item => {
            const monthIndex = (item._id.month - 1 + 12 - currentMonth) % 12;
            data[monthIndex] = item.total;
        });

        // Calculate growth
        const thisMonth = data[11] || 0;
        const lastMonth = data[10] || 0;
        const growth = lastMonth ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

        return {
            labels: [...months.slice(currentMonth + 1), ...months.slice(0, currentMonth + 1)],
            data,
            growth
        };
    }

    static async getOrderSummary(): Promise<OrderSummary> {
        const orders = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    total: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const getStatusData = (status: OrderStatus) => {
            const statusOrder = orders.find(o => o._id === status);
            return {
                amount: statusOrder?.total || 0,
                percentage: statusOrder ? (statusOrder.count / orders.reduce((sum, o) => sum + o.count, 0)) * 100 : 0
            };
        };

        return {
            onDelivery: getStatusData(OrderStatus.DELIVERING),
            shipped: getStatusData(OrderStatus.PROCESSING),
            confirmed: getStatusData(OrderStatus.CONFIRMED)
        };
    }

    static async getRecentOrders(): Promise<RecentOrder[]> {
        return Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('customer', 'name')
            .populate('items.item', 'name image')
            .lean()
            .then(orders => orders.map(order => ({
                name: (order.items[0].item as typeof Item).name,
                customerName: (order.customer as any).name,
                price: order.totalAmount,
                status: order.status,
                // image: (order.items[0].item as Item).image,
                orderId: order._id.toString()
            })));
    }

    static async getTrendingMenus(): Promise<TrendingMenu[]> {
        const trendingItems = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.item',
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { orderCount: -1 } },
            { $limit: 4 }
        ]);

        const itemIds = trendingItems.map(item => item._id);
        const items = await Item.find({ _id: { $in: itemIds } }).lean();

        return items.map(item => ({
            name: item.name,
            rating: 4.5, // You might want to implement a proper rating system
            image: item.image,
            itemId: item._id.toString(),
            orderCount: trendingItems.find(t => t._id.toString() === item._id.toString())?.orderCount || 0
        }));
    }

    static async getDashboardData(): Promise<DashboardResponse> {
        const [
            metrics,
            revenueAnalytics,
            orderSummary,
            recentOrders,
            trendingMenus
        ] = await Promise.all([
            this.getDashboardMetrics(),
            this.getRevenueAnalytics(),
            this.getOrderSummary(),
            this.getRecentOrders(),
            this.getTrendingMenus()
        ]);

        return {
            metrics,
            revenueAnalytics,
            orderSummary,
            recentOrders,
            trendingMenus
        };
    }
}