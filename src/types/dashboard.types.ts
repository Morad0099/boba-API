export interface DashboardMetrics {
    totalMenus: number;
    totalOrders: number;
    totalCustomers: number;
    totalIncome: number;
    todayStats: {
        menus: number;
        orders: number;
        customers: number;
        income: number;
    };
}

export interface RevenueAnalytics {
    labels: string[];
    data: number[];
    growth: number;
}

export interface OrderSummary {
    onDelivery: {
        amount: number;
        percentage: number;
    };
    shipped: {
        amount: number;
        percentage: number;
    };
    confirmed: {
        amount: number;
        percentage: number;
    };
}

export interface RecentOrder {
    name: string;
    customerName: string;
    price: number;
    status: string;
    // image: string;
    orderId: string;
}

export interface TrendingMenu {
    name: string;
    rating: number;
    image: string;
    itemId: string;
    orderCount: number;
}

export interface DashboardResponse {
    metrics: DashboardMetrics;
    revenueAnalytics: RevenueAnalytics;
    orderSummary: OrderSummary;
    recentOrders: RecentOrder[];
    trendingMenus: TrendingMenu[];
}